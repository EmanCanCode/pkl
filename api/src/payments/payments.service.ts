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
            stripePriceId: StripeService.MEMBERSHIP_PRICE_ID,
            status: PaymentStatus.PENDING,
        });

        return { sessionId: session.id, url: session.url! };
    }

    /**
     * Create tournament registration checkout session
     * REQUIRES ACTIVE MEMBERSHIP
     */
    async createTournamentCheckout(
        userId: string,
        tournamentId: string,
        registrationId: string,
        successUrl: string,
        cancelUrl: string,
    ): Promise<{ sessionId: string; url: string }> {
        // ENFORCE MEMBERSHIP REQUIREMENT
        if (!(await this.hasActiveMembership(userId))) {
            throw new ForbiddenException(
                'Active membership required to register for tournaments. Please purchase a membership first.',
            );
        }

        const customerId = await this.ensureStripeCustomer(userId);

        const session = await this.stripeService.createTournamentCheckoutSession(
            customerId,
            userId,
            tournamentId,
            registrationId,
            successUrl,
            cancelUrl,
        );

        // Record pending payment
        await this.paymentModel.create({
            user: new Types.ObjectId(userId),
            type: PaymentType.TOURNAMENT,
            stripeSessionId: session.id,
            amount: 0,
            stripePriceId: StripeService.TOURNAMENT_PRICE_ID,
            tournament: new Types.ObjectId(tournamentId),
            registration: new Types.ObjectId(registrationId),
            status: PaymentStatus.PENDING,
        });

        return { sessionId: session.id, url: session.url! };
    }

    /**
     * Create event registration checkout session
     * REQUIRES ACTIVE MEMBERSHIP
     * If user has eventFeePasses, bypass Stripe and register directly
     * Auto-registers player to event on successful payment via webhook
     */
    async createEventCheckout(
        userId: string,
        eventId: string,
        successUrl: string,
        cancelUrl: string,
    ): Promise<{ sessionId: string; url: string } | { bypassed: true; message: string }> {
        // ENFORCE MEMBERSHIP REQUIREMENT
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

        // CHECK FOR EVENT FEE PASS (admin-granted bypass)
        const user = await this.userModel.findById(userId);
        if (user && (user.eventFeePasses === -1 || (user.eventFeePasses && user.eventFeePasses > 0))) {
            // Consume one pass (unless infinite = -1)
            if (user.eventFeePasses !== -1) {
                await this.userModel.findByIdAndUpdate(userId, { $inc: { eventFeePasses: -1 } });
            }

            // Register directly without Stripe
            await this.registerPlayerToEvent(userId, eventId);

            // Record a $0 payment for audit trail
            await this.paymentModel.create({
                user: new Types.ObjectId(userId),
                type: PaymentType.TOURNAMENT,
                stripeSessionId: `pass_${Date.now()}_${userId}`,
                amount: 0,
                stripePriceId: 'FEE_PASS',
                event: new Types.ObjectId(eventId),
                status: PaymentStatus.COMPLETED,
            });

            this.logger.log(`Player ${userId} used event fee pass for event ${eventId}`);
            return { bypassed: true, message: 'Registered using event fee pass' } as any;
        }

        const customerId = await this.ensureStripeCustomer(userId);

        const session = await this.stripeService.createEventCheckoutSession(
            customerId,
            userId,
            eventId,
            successUrl,
            cancelUrl,
        );

        // Record pending payment
        await this.paymentModel.create({
            user: new Types.ObjectId(userId),
            type: PaymentType.TOURNAMENT,
            stripeSessionId: session.id,
            amount: 0,
            stripePriceId: StripeService.TOURNAMENT_PRICE_ID,
            event: new Types.ObjectId(eventId),
            status: PaymentStatus.PENDING,
        });

        return { sessionId: session.id, url: session.url! };
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
