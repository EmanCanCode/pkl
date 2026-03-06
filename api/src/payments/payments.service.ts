import {
    Injectable,
    BadRequestException,
    ForbiddenException,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '../users/user.schema';
import { Payment, PaymentDocument, PaymentType, PaymentStatus } from './payment.schema';
import { Event, EventDocument, EventStatus } from '../events/event.schema';
import { StripeService } from './stripe.service';
import Stripe from 'stripe';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
        @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
        @InjectModel(Event.name) private eventModel: Model<EventDocument>,
        private stripeService: StripeService,
    ) { }

    /**
     * Check if user has active membership
     * Also returns true if user has membership passes (admin-granted bypass)
     */
    async hasActiveMembership(userId: string): Promise<boolean> {
        const user = await this.userModel.findById(userId);
        if (!user) return false;

        // Admin-granted membership pass (infinite = -1, or count > 0)
        if (user.membershipPasses === -1 || (user.membershipPasses && user.membershipPasses > 0)) {
            return true;
        }

        if (user.membershipStatus !== 'active') return false;
        if (user.membershipExpires && new Date(user.membershipExpires) < new Date()) {
            // Membership expired, update status
            await this.userModel.findByIdAndUpdate(userId, { membershipStatus: 'expired' });
            return false;
        }

        return true;
    }

    /**
     * Create or get Stripe customer for user
     */
    async ensureStripeCustomer(userId: string): Promise<string> {
        const user = await this.userModel.findById(userId);
        if (!user) throw new NotFoundException('User not found');

        if (user.stripeCustomerId) {
            return user.stripeCustomerId;
        }

        const customer = await this.stripeService.createCustomer(
            user.email,
            `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username,
        );

        await this.userModel.findByIdAndUpdate(userId, { stripeCustomerId: customer.id });
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
            throw new BadRequestException('You already have an active membership');
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
    async verifyMembershipSession(userId: string, sessionId: string): Promise<{ activated: boolean }> {
        const payment = await this.paymentModel.findOne({
            stripeSessionId: sessionId,
            user: new Types.ObjectId(userId),
            type: PaymentType.MEMBERSHIP,
        });

        if (!payment) {
            throw new NotFoundException('Payment session not found');
        }

        // Already activated (by webhook or previous verify call)
        if (payment.status === PaymentStatus.COMPLETED) {
            return { activated: true };
        }

        // Retrieve session from Stripe to check actual payment status
        const session = await this.stripeService.retrieveSession(sessionId);

        if (session.payment_status !== 'paid') {
            return { activated: false };
        }

        // Payment confirmed — activate membership
        await this.handleCheckoutCompleted(session);
        return { activated: true };
    }

    /**
     * Register player for an event.
     * REQUIRES ACTIVE MEMBERSHIP (Stripe subscription or admin-granted passes).
     * No per-event fee — membership is the only requirement.
     */
    async registerForEvent(
        userId: string,
        eventId: string,
    ): Promise<{ bypassed: true; message: string }> {
        // ENFORCE MEMBERSHIP REQUIREMENT (admin passes checked first)
        if (!(await this.hasActiveMembership(userId))) {
            throw new ForbiddenException(
                'Active membership required to register for events. Please purchase a membership first.',
            );
        }

        // Verify event exists and is approved
        const event = await this.eventModel.findById(eventId);
        if (!event) throw new NotFoundException('Event not found');
        if (event.status !== EventStatus.APPROVED) {
            throw new BadRequestException('Can only register for approved events');
        }

        // Check if already registered
        const alreadyRegistered = event.registeredPlayers.some(
            (p) => p.playerId?.toString() === userId,
        );
        if (alreadyRegistered) {
            throw new BadRequestException('You are already registered for this event');
        }

        // Check if event is full
        if (event.maxParticipants && event.registeredPlayers.length >= event.maxParticipants) {
            throw new BadRequestException('Event is full');
        }

        // Register directly — no per-event payment
        await this.registerPlayerToEvent(userId, eventId);

        this.logger.log(`Player ${userId} registered for event ${eventId} (membership active)`);
        return { bypassed: true, message: 'Registered successfully!' };
    }

    /**
     * Handle Stripe webhook events
     */
    async handleWebhook(event: Stripe.Event): Promise<void> {
        this.logger.log(`Processing webhook event: ${event.type}`);

        switch (event.type) {
            case 'checkout.session.completed':
                await this.handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
                break;

            case 'customer.subscription.deleted':
                await this.handleSubscriptionCancelled(event.data.object as Stripe.Subscription);
                break;

            case 'invoice.payment_failed':
                await this.handlePaymentFailed(event.data.object as Stripe.Invoice);
                break;

            default:
                this.logger.log(`Unhandled event type: ${event.type}`);
        }
    }

    private async handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
        const payment = await this.paymentModel.findOne({ stripeSessionId: session.id });
        if (!payment) {
            this.logger.warn(`Payment not found for session: ${session.id}`);
            return;
        }

        // Update payment record
        payment.status = PaymentStatus.COMPLETED;
        payment.amount = session.amount_total || 0;
        if (session.payment_intent) {
            payment.stripePaymentIntentId =
                typeof session.payment_intent === 'string'
                    ? session.payment_intent
                    : session.payment_intent.id;
        }
        await payment.save();

        // Handle based on payment type
        if (payment.type === PaymentType.MEMBERSHIP) {
            const subscription = session.subscription;
            const subscriptionId = typeof subscription === 'string' ? subscription : subscription?.id;

            // Activate membership (1 year from now for annual, or use subscription period)
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 1);

            await this.userModel.findByIdAndUpdate(payment.user, {
                membershipStatus: 'active',
                membershipExpires: expiresAt,
                membershipSubscriptionId: subscriptionId,
            });

            this.logger.log(`Membership activated for user: ${payment.user}`);
        } else if (payment.type === PaymentType.TOURNAMENT) {
            // Handle event registration if eventId is present
            if (payment.event) {
                await this.registerPlayerToEvent(payment.user.toString(), payment.event.toString());
                this.logger.log(`Player ${payment.user} auto-registered to event ${payment.event}`);
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
    private async registerPlayerToEvent(userId: string, eventId: string): Promise<void> {
        const user = await this.userModel.findById(userId);
        const event = await this.eventModel.findById(eventId);

        if (!user || !event) {
            this.logger.warn(`Could not auto-register: user=${userId} event=${eventId}`);
            return;
        }

        // Check if already registered (idempotent)
        const alreadyRegistered = event.registeredPlayers.some(
            (p) => p.playerId?.toString() === userId,
        );
        if (alreadyRegistered) {
            this.logger.log(`Player ${userId} already registered to event ${eventId}`);
            return;
        }

        const playerName = user.firstName && user.lastName
            ? `${user.firstName} ${user.lastName}`
            : user.username;

        event.registeredPlayers.push({
            playerId: new Types.ObjectId(userId),
            playerName,
            email: user.email,
            registeredAt: new Date(),
        });

        await event.save();
    }

    private async handleSubscriptionCancelled(subscription: Stripe.Subscription): Promise<void> {
        const user = await this.userModel.findOne({
            membershipSubscriptionId: subscription.id,
        });

        if (user) {
            await this.userModel.findByIdAndUpdate(user._id, {
                membershipStatus: 'cancelled',
            });
            this.logger.log(`Membership cancelled for user: ${user._id}`);
        }
    }

    private async handlePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
        if (invoice.subscription) {
            const subscriptionId =
                typeof invoice.subscription === 'string'
                    ? invoice.subscription
                    : invoice.subscription.id;

            const user = await this.userModel.findOne({
                membershipSubscriptionId: subscriptionId,
            });

            if (user) {
                this.logger.warn(`Payment failed for user membership: ${user._id}`);
                // Could send notification, etc.
            }
        }
    }

    /**
     * Get user's payment history
     */
    async getPaymentHistory(userId: string): Promise<Payment[]> {
        return this.paymentModel
            .find({ user: new Types.ObjectId(userId) })
            .sort({ createdAt: -1 })
            .populate('tournament')
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
        if (!user) throw new NotFoundException('User not found');

        const isActive = await this.hasActiveMembership(userId);

        return {
            status: user.membershipStatus || 'none',
            expires: user.membershipExpires || null,
            isActive,
            membershipPasses: user.membershipPasses ?? 0,
            eventFeePasses: user.eventFeePasses ?? 0,
        };
    }
}
