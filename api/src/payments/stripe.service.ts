import { Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
    private stripe: Stripe;
    private readonly logger = new Logger(StripeService.name);

    // PKL Club Price IDs
    static readonly MEMBERSHIP_PRICE_ID = 'price_1SxtVBPoLKspRBJeqExDsE5k';
    static readonly TOURNAMENT_PRICE_ID = 'price_1SxtW4PoLKspRBJel8K9Gj41';

    constructor() {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            this.logger.warn('STRIPE_SECRET_KEY not set - payments will not work');
        }
        this.stripe = new Stripe(secretKey || '', {
            apiVersion: '2023-10-16',
        });
    }

    async createCustomer(email: string, name: string): Promise<Stripe.Customer> {
        return this.stripe.customers.create({
            email,
            name,
            metadata: { source: 'pkl-club' },
        });
    }

    async createMembershipCheckoutSession(
        customerId: string,
        userId: string,
        successUrl: string,
        cancelUrl: string,
    ): Promise<Stripe.Checkout.Session> {
        return this.stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: StripeService.MEMBERSHIP_PRICE_ID,
                    quantity: 1,
                },
            ],
            mode: 'subscription', // Membership is recurring
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId,
                type: 'membership',
            },
        });
    }

    async createTournamentCheckoutSession(
        customerId: string,
        userId: string,
        tournamentId: string,
        registrationId: string,
        successUrl: string,
        cancelUrl: string,
    ): Promise<Stripe.Checkout.Session> {
        return this.stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: StripeService.TOURNAMENT_PRICE_ID,
                    quantity: 1,
                },
            ],
            mode: 'payment', // Tournament is one-time
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId,
                tournamentId,
                registrationId,
                type: 'tournament',
            },
        });
    }

    async createEventCheckoutSession(
        customerId: string,
        userId: string,
        eventId: string,
        successUrl: string,
        cancelUrl: string,
    ): Promise<Stripe.Checkout.Session> {
        return this.stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'],
            line_items: [
                {
                    price: StripeService.TOURNAMENT_PRICE_ID,
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                userId,
                eventId,
                type: 'event_registration',
            },
        });
    }

    async retrieveSession(sessionId: string): Promise<Stripe.Checkout.Session> {
        return this.stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription', 'payment_intent'],
        });
    }

    async cancelSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
        return this.stripe.subscriptions.cancel(subscriptionId);
    }

    constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET not configured');
        }
        return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
    }
}
