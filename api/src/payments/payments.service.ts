import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { User, UserDocument } from "../users/user.schema";
import {
  Payment,
  PaymentDocument,
  PaymentType,
  PaymentStatus,
} from "./payment.schema";
import { Event, EventDocument, EventStatus } from "../events/event.schema";
import { StripeService } from "./stripe.service";
import { MailService } from "../mail/mail.service";
import Stripe from "stripe";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    private stripeService: StripeService,
    private mailService: MailService,
  ) {}

  /**
   * Check if user has active membership
   * Also returns true if user has membership passes (admin-granted bypass)
   */
  async hasActiveMembership(userId: string): Promise<boolean> {
    const user = await this.userModel.findById(userId);
    if (!user) return false;

    // Admin-granted membership pass (infinite = -1, or count > 0)
    if (
      user.membershipPasses === -1 ||
      (user.membershipPasses && user.membershipPasses > 0)
    ) {
      return true;
    }

    if (user.membershipStatus !== "active") return false;
    if (
      user.membershipExpires &&
      new Date(user.membershipExpires) < new Date()
    ) {
      // Membership expired, update status
      await this.userModel.findByIdAndUpdate(userId, {
        membershipStatus: "expired",
      });
      return false;
    }

    return true;
  }

  /**
   * Create or get Stripe customer for user
   */
  async ensureStripeCustomer(userId: string): Promise<string> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    if (user.stripeCustomerId) {
      return user.stripeCustomerId;
    }

    const customer = await this.stripeService.createCustomer(
      user.email,
      `${user.firstName || ""} ${user.lastName || ""}`.trim() || user.username,
    );

    await this.userModel.findByIdAndUpdate(userId, {
      stripeCustomerId: customer.id,
    });
    return customer.id;
  }

  /**
   * Create membership checkout session
   */
  async createMembershipCheckout(
    userId: string,
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ sessionId: string; url: string }> {
    // Check if already has active membership
    if (await this.hasActiveMembership(userId)) {
      throw new BadRequestException("You already have an active membership");
    }

    const customerId = await this.ensureStripeCustomer(userId);

    const session = await this.stripeService.createMembershipCheckoutSession(
      customerId,
      userId,
      successUrl,
      cancelUrl,
    );

    // Record pending payment
    await this.paymentModel.create({
      user: new Types.ObjectId(userId),
      type: PaymentType.MEMBERSHIP,
      stripeSessionId: session.id,
      amount: 0, // Will be updated from webhook
      stripePriceId: this.stripeService.getMembershipPriceId(),
      status: PaymentStatus.PENDING,
    });

    return { sessionId: session.id, url: session.url! };
  }

  /**
   * Verify a Stripe checkout session and activate membership if payment succeeded.
   * This is a fallback for when webhooks aren't configured (sandbox/dev).
   * Idempotent — safe to call multiple times.
   */
  async verifyMembershipSession(
    userId: string,
    sessionId: string,
  ): Promise<{ activated: boolean }> {
    const payment = await this.paymentModel.findOne({
      stripeSessionId: sessionId,
      user: new Types.ObjectId(userId),
      type: PaymentType.MEMBERSHIP,
    });

    if (!payment) {
      throw new NotFoundException("Payment session not found");
    }

    // Already activated (by webhook or previous verify call)
    if (payment.status === PaymentStatus.COMPLETED) {
      return { activated: true };
    }

    // Retrieve session from Stripe to check actual payment status
    const session = await this.stripeService.retrieveSession(sessionId);

    if (session.payment_status !== "paid") {
      return { activated: false };
    }

    // Payment confirmed — activate membership
    await this.handleCheckoutCompleted(session);
    return { activated: true };
  }

  /**
   * Register player for an event (free events only, or event-fee-pass holders).
   * REQUIRES ACTIVE MEMBERSHIP.
   */
  async registerForEvent(
    userId: string,
    eventId: string,
    gameTypes?: string[],
  ): Promise<{ bypassed: true; message: string }> {
    // ENFORCE MEMBERSHIP REQUIREMENT (admin passes checked first)
    if (!(await this.hasActiveMembership(userId))) {
      throw new ForbiddenException(
        "Active membership required to register for events. Please purchase a membership first.",
      );
    }

    // Verify event exists and is approved
    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException("Event not found");
    if (event.status !== EventStatus.APPROVED) {
      throw new BadRequestException("Can only register for approved events");
    }

    // Check if already registered
    const alreadyRegistered = event.registeredPlayers.some(
      (p) => p.playerId?.toString() === userId,
    );
    if (alreadyRegistered) {
      throw new BadRequestException(
        "You are already registered for this event",
      );
    }

    // Check if event is full
    if (
      event.maxParticipants &&
      event.registeredPlayers.length >= event.maxParticipants
    ) {
      throw new BadRequestException("Event is full");
    }

    // Register directly — no per-event payment (free events)
    await this.registerPlayerToEvent(userId, eventId, gameTypes);

    this.logger.log(
      `Player ${userId} registered for event ${eventId} (membership active, no fee)`,
    );
    return { bypassed: true, message: "Registered successfully!" };
  }

  /**
   * Create a Stripe checkout session for event entry fee (one-time payment).
   * REQUIRES ACTIVE MEMBERSHIP first.
   */
  async createEventFeeCheckout(
    userId: string,
    eventId: string,
    gameTypes: string[],
    successUrl: string,
    cancelUrl: string,
  ): Promise<{ sessionId: string; url: string }> {
    if (!(await this.hasActiveMembership(userId))) {
      throw new ForbiddenException(
        "Active membership required before paying event fees.",
      );
    }

    const event = await this.eventModel.findById(eventId);
    if (!event) throw new NotFoundException("Event not found");
    if (event.status !== EventStatus.APPROVED) {
      throw new BadRequestException("Can only register for approved events");
    }

    const alreadyRegistered = event.registeredPlayers.some(
      (p) => p.playerId?.toString() === userId,
    );
    if (alreadyRegistered) {
      throw new BadRequestException(
        "You are already registered for this event",
      );
    }

    if (
      event.maxParticipants &&
      event.registeredPlayers.length >= event.maxParticipants
    ) {
      throw new BadRequestException("Event is full");
    }

    if (!gameTypes || gameTypes.length === 0) {
      throw new BadRequestException("At least one game type must be selected");
    }

    const entryFee = event.entryFee || 0;
    if (entryFee <= 0) {
      throw new BadRequestException(
        "This event has no entry fee. Use the free registration endpoint.",
      );
    }

    const unitAmountCents = Math.round(entryFee * 100);
    const quantity = gameTypes.length;

    const customerId = await this.ensureStripeCustomer(userId);

    const session = await this.stripeService.createEventFeeCheckoutSession(
      customerId,
      userId,
      eventId,
      event.name,
      unitAmountCents,
      quantity,
      gameTypes,
      successUrl,
      cancelUrl,
    );

    // Record pending payment
    await this.paymentModel.create({
      user: new Types.ObjectId(userId),
      type: PaymentType.TOURNAMENT,
      event: new Types.ObjectId(eventId),
      stripeSessionId: session.id,
      amount: 0,
      status: PaymentStatus.PENDING,
      metadata: { gameTypes },
    });

    return { sessionId: session.id, url: session.url! };
  }

  /**
   * Verify event fee checkout session and register player if paid.
   * Fallback for when webhooks aren't configured.
   */
  async verifyEventFeeSession(
    userId: string,
    sessionId: string,
  ): Promise<{ registered: boolean }> {
    const payment = await this.paymentModel.findOne({
      stripeSessionId: sessionId,
      user: new Types.ObjectId(userId),
      type: PaymentType.TOURNAMENT,
    });

    if (!payment) {
      throw new NotFoundException("Payment session not found");
    }

    if (payment.status === PaymentStatus.COMPLETED) {
      return { registered: true };
    }

    const session = await this.stripeService.retrieveSession(sessionId);

    if (session.payment_status !== "paid") {
      return { registered: false };
    }

    // Mark as completed
    payment.status = PaymentStatus.COMPLETED;
    payment.amount = session.amount_total || 0;
    if (session.payment_intent) {
      payment.stripePaymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent.id;
    }
    await payment.save();

    // Register the player
    const gameTypes: string[] = payment.metadata?.gameTypes || [];
    await this.registerPlayerToEvent(
      userId,
      payment.event?.toString() || "",
      gameTypes,
    );

    this.logger.log(
      `Player ${userId} registered for event ${payment.event} after event fee payment`,
    );
    return { registered: true };
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(event: Stripe.Event): Promise<void> {
    this.logger.log(`Processing webhook event: ${event.type}`);

    switch (event.type) {
      // ── Checkout sessions ──────────────────────────────────
      case "checkout.session.completed":
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "checkout.session.async_payment_succeeded":
        // Delayed payment methods (bank transfers etc.) — treat like completed
        await this.handleCheckoutCompleted(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      case "checkout.session.async_payment_failed":
      case "checkout.session.expired":
        await this.handleCheckoutFailed(
          event.data.object as Stripe.Checkout.Session,
        );
        break;

      // ── Charge events ─────────────────────────────────────
      case "charge.failed":
        await this.handleChargeFailed(event.data.object as Stripe.Charge);
        break;

      case "charge.refunded":
        await this.handleChargeRefunded(event.data.object as Stripe.Charge);
        break;

      case "charge.dispute.created":
        await this.handleDisputeCreated(
          event.data.object as Stripe.Dispute,
        );
        break;

      // ── Subscription lifecycle ────────────────────────────
      case "customer.subscription.deleted":
        await this.handleSubscriptionCancelled(
          event.data.object as Stripe.Subscription,
        );
        break;

      case "invoice.payment_failed":
        await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
        break;

      // ── Everything else: just log ─────────────────────────
      default:
        this.logger.log(`Acknowledged event (no action): ${event.type}`);
    }
  }

  private async handleCheckoutCompleted(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const payment = await this.paymentModel.findOne({
      stripeSessionId: session.id,
    });
    if (!payment) {
      this.logger.warn(`Payment not found for session: ${session.id}`);
      return;
    }

    // Update payment record
    payment.status = PaymentStatus.COMPLETED;
    payment.amount = session.amount_total || 0;
    if (session.payment_intent) {
      payment.stripePaymentIntentId =
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent.id;
    }
    await payment.save();

    // Handle based on payment type
    if (payment.type === PaymentType.MEMBERSHIP) {
      const subscription = session.subscription;
      const subscriptionId =
        typeof subscription === "string" ? subscription : subscription?.id;

      // Activate membership (1 year from now for annual, or use subscription period)
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1);

      await this.userModel.findByIdAndUpdate(payment.user, {
        membershipStatus: "active",
        membershipExpires: expiresAt,
        membershipSubscriptionId: subscriptionId,
      });

      this.logger.log(`Membership activated for user: ${payment.user}`);

      const user = await this.userModel.findById(payment.user);
      if (user) {
        this.sendUserEmail(
          user.email,
          "PKL.CLUB — Welcome to the Club! 🏓",
          `<p>Hi ${user.firstName || user.username},</p>
           <p>Your <strong>PKL Club Annual Membership</strong> is now active! You can register for any Pathway Series event.</p>
           <p>Membership expires: <strong>${expiresAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</strong></p>
           <p>Head to the <a href="https://pkl.club/world-series.html">Pathway Series</a> to find upcoming events.</p>`,
        );
      }
    } else if (payment.type === PaymentType.TOURNAMENT) {
      // Handle event registration if eventId is present
      if (payment.event) {
        const gameTypes: string[] = payment.metadata?.gameTypes || [];
        await this.registerPlayerToEvent(
          payment.user.toString(),
          payment.event.toString(),
          gameTypes,
        );
        this.logger.log(
          `Player ${payment.user} auto-registered to event ${payment.event}`,
        );
      } else {
        // Legacy tournament registration
        this.logger.log(
          `Tournament payment completed for registration: ${payment.registration}`,
        );
      }
    }
  }

  /**
   * Auto-register player to event after successful payment
   */
  private async registerPlayerToEvent(
    userId: string,
    eventId: string,
    gameTypes?: string[],
  ): Promise<void> {
    const user = await this.userModel.findById(userId);
    const event = await this.eventModel.findById(eventId);

    if (!user || !event) {
      this.logger.warn(
        `Could not auto-register: user=${userId} event=${eventId}`,
      );
      return;
    }

    // Check if already registered (idempotent)
    const alreadyRegistered = event.registeredPlayers.some(
      (p) => p.playerId?.toString() === userId,
    );
    if (alreadyRegistered) {
      this.logger.log(
        `Player ${userId} already registered to event ${eventId}`,
      );
      return;
    }

    const playerName =
      user.firstName && user.lastName
        ? `${user.firstName} ${user.lastName}`
        : user.username;

    event.registeredPlayers.push({
      playerId: new Types.ObjectId(userId),
      playerName,
      email: user.email,
      registeredAt: new Date(),
      gameTypes: gameTypes || [],
    });

    await event.save();
  }

  private async handleSubscriptionCancelled(
    subscription: Stripe.Subscription,
  ): Promise<void> {
    const user = await this.userModel.findOne({
      membershipSubscriptionId: subscription.id,
    });

    if (user) {
      await this.userModel.findByIdAndUpdate(user._id, {
        membershipStatus: "cancelled",
      });
      this.logger.log(`Membership cancelled for user: ${user._id}`);

      this.sendUserEmail(
        user.email,
        "PKL.CLUB — Membership Cancelled",
        `<p>Hi ${user.firstName || user.username},</p>
         <p>Your PKL Club annual membership has been cancelled. You will no longer be able to register for Pathway Series events.</p>
         <p>If this was a mistake, you can re-subscribe anytime at <a href="https://pkl.club/player-dashboard.html">your dashboard</a>.</p>`,
      );
    }
  }

  private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
    if (invoice.subscription) {
      const subscriptionId =
        typeof invoice.subscription === "string"
          ? invoice.subscription
          : invoice.subscription.id;

      const user = await this.userModel.findOne({
        membershipSubscriptionId: subscriptionId,
      });

      if (user) {
        this.logger.warn(`Payment failed for user membership: ${user._id}`);
        this.sendUserEmail(
          user.email,
          "PKL.CLUB — Payment Failed",
          `<p>Hi ${user.firstName || user.username},</p>
           <p>We were unable to process your membership renewal payment. Please update your payment method to keep your membership active.</p>
           <p>Visit <a href="https://pkl.club/player-dashboard.html">your dashboard</a> to resolve this.</p>`,
        );
      }
    }
  }

  /**
   * Handle checkout session that expired or had async payment failure.
   * Marks the pending payment as failed and emails the user.
   */
  private async handleCheckoutFailed(
    session: Stripe.Checkout.Session,
  ): Promise<void> {
    const payment = await this.paymentModel.findOne({
      stripeSessionId: session.id,
    });
    if (!payment) return;

    payment.status = PaymentStatus.FAILED;
    await payment.save();
    this.logger.warn(`Checkout failed/expired for session: ${session.id}`);

    const user = await this.userModel.findById(payment.user);
    if (user) {
      this.sendUserEmail(
        user.email,
        "PKL.CLUB — Payment Not Completed",
        `<p>Hi ${user.firstName || user.username},</p>
         <p>It looks like your recent payment wasn\u2019t completed. No worries \u2014 you can try again anytime from your <a href="https://pkl.club/player-dashboard.html">dashboard</a>.</p>`,
      );
    }
  }

  /**
   * A charge failed (card declined, insufficient funds, etc.).
   */
  private async handleChargeFailed(charge: Stripe.Charge): Promise<void> {
    this.logger.warn(`Charge failed: ${charge.id} — ${charge.failure_message || "unknown reason"}`);
    const email = charge.billing_details?.email || charge.receipt_email;
    if (email) {
      this.sendUserEmail(
        email,
        "PKL.CLUB — Charge Failed",
        `<p>A recent charge of <strong>$${((charge.amount || 0) / 100).toFixed(2)}</strong> to your card was declined.</p>
         <p>Reason: ${charge.failure_message || "Your bank declined the transaction."}</p>
         <p>Please check your payment method and try again from <a href="https://pkl.club">pkl.club</a>.</p>`,
      );
    }
  }

  /**
   * Charge refunded — deactivate membership if it was a membership payment.
   */
  private async handleChargeRefunded(charge: Stripe.Charge): Promise<void> {
    this.logger.log(`Charge refunded: ${charge.id}`);

    // Find payment by payment intent
    const piId = typeof charge.payment_intent === "string"
      ? charge.payment_intent
      : charge.payment_intent?.id;
    if (!piId) return;

    const payment = await this.paymentModel.findOne({
      stripePaymentIntentId: piId,
    });
    if (!payment) return;

    payment.status = PaymentStatus.REFUNDED;
    await payment.save();

    if (payment.type === PaymentType.MEMBERSHIP) {
      await this.userModel.findByIdAndUpdate(payment.user, {
        membershipStatus: "cancelled",
      });
      this.logger.log(`Membership deactivated due to refund for user: ${payment.user}`);
    }

    const user = await this.userModel.findById(payment.user);
    if (user) {
      this.sendUserEmail(
        user.email,
        "PKL.CLUB — Refund Processed",
        `<p>Hi ${user.firstName || user.username},</p>
         <p>A refund of <strong>$${((charge.amount_refunded || 0) / 100).toFixed(2)}</strong> has been processed to your original payment method. It may take 5-10 business days to appear.</p>`,
      );
    }
  }

  /**
   * A dispute was opened — email admin so they can respond in Stripe dashboard.
   */
  private async handleDisputeCreated(dispute: Stripe.Dispute): Promise<void> {
    this.logger.warn(`Dispute created: ${dispute.id} — amount $${((dispute.amount || 0) / 100).toFixed(2)}`);

    // Notify admin via the GMAIL address
    this.sendUserEmail(
      process.env.GMAIL || "",
      "[ALERT] PKL.CLUB — New Stripe Dispute",
      `<p><strong>A customer has disputed a charge.</strong></p>
       <p>Dispute ID: ${dispute.id}</p>
       <p>Amount: $${((dispute.amount || 0) / 100).toFixed(2)}</p>
       <p>Reason: ${dispute.reason || "unknown"}</p>
       <p>Respond in your <a href="https://dashboard.stripe.com/disputes/${dispute.id}">Stripe Dashboard</a> within the deadline to avoid losing the funds.</p>`,
    );
  }

  /**
   * Fire-and-forget email helper. Logs errors but never throws.
   */
  private sendUserEmail(to: string, subject: string, bodyHtml: string): void {
    if (!to) return;
    const wrapped = `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden;">
        <div style="background: linear-gradient(135deg, #0a1628 0%, #2fa06f 100%); padding: 40px 30px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 28px;">PKL.CLUB</h1>
        </div>
        <div style="padding: 40px 30px; color: #333; font-size: 15px; line-height: 1.6;">
          ${bodyHtml}
          <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
          <p style="color: #aaa; font-size: 12px; text-align: center;">PKL.CLUB &mdash; The Global Pickleball Community</p>
        </div>
      </div>`;

    this.mailService
      .sendRawEmail(to, subject, wrapped)
      .catch((err) => this.logger.error(`Failed to send email to ${to}: ${err.message}`));
  }

  /**
   * Get user's payment history
   */
  async getPaymentHistory(userId: string): Promise<Payment[]> {
    return this.paymentModel
      .find({ user: new Types.ObjectId(userId) })
      .sort({ createdAt: -1 })
      .populate("tournament")
      .exec();
  }

  /**
   * Get user's membership status
   */
  async getMembershipStatus(userId: string): Promise<{
    status: string;
    expires: Date | null;
    isActive: boolean;
    membershipPasses: number;
    eventFeePasses: number;
  }> {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException("User not found");

    const isActive = await this.hasActiveMembership(userId);

    return {
      status: user.membershipStatus || "none",
      expires: user.membershipExpires || null,
      isActive,
      membershipPasses: user.membershipPasses ?? 0,
      eventFeePasses: user.eventFeePasses ?? 0,
    };
  }
}
