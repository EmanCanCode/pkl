import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import Stripe from 'stripe';

@Injectable()
export class StripeService implements OnModuleInit {
    private stripe: Stripe;
    private readonly logger = new Logger(StripeService.name);

    // Dynamic price ID — populated on module init
    private membershipPriceId: string | null = null;

    constructor() {
        const secretKey = process.env.STRIPE_SECRET_KEY;
        if (!secretKey) {
            this.logger.warn('STRIPE_SECRET_KEY not set - payments will not work');
        }
        this.stripe = new Stripe(secretKey || '', {
            apiVersion: '2023-10-16',
        });
    }

    async onModuleInit() {
        if (!process.env.STRIPE_SECRET_KEY) {
            this.logger.warn('Skipping Stripe product setup — no secret key configured');
            return;
        }
        await this.ensureMembershipProduct();
    }

    /**
     * Find or create the PKL Annual Membership product + $10/year price
     */
    private async ensureMembershipProduct(): Promise<void> {
        // Allow env-var override
        if (process.env.STRIPE_MEMBERSHIP_PRICE_ID) {
            this.membershipPriceId = process.env.STRIPE_MEMBERSHIP_PRICE_ID;
            this.logger.log(`Membership price (from env): ${this.membershipPriceId}`);
            return;
        }

        try {
            const existing = await this.findProductByMetadata('pkl_annual_membership');
            if (existing) {
                const prices = await this.stripe.prices.list({
                    product: existing.id,
                    active: true,
                    limit: 1,
                });
                if (prices.data.length > 0) {
                    this.membershipPriceId = prices.data[0].id;
                    this.logger.log(`Membership price (existing): ${this.membershipPriceId}`);
                    return;
                }
            }

            // Create product + recurring price
            const product = await this.stripe.products.create({
                name: 'PKL Club Individual Annual Registration',
                description: 'Annual membership required to register for PKL Pathway Series events. Grants one full year of event access.',
                metadata: { pkl_type: 'pkl_annual_membership' },
            });

            const price = await this.stripe.prices.create({
                product: product.id,
                unit_amount: 1000, // $10.00
                currency: 'usd',
                recurring: { interval: 'year' },
            });

            this.membershipPriceId = price.id;
            this.logger.log(`Created membership product ${product.id} → price ${price.id} ($10/year)`);
        } catch (error: any) {
            this.logger.error(`Failed to set up membership product: ${error.message}`);
        }
    }

    /**
     * Search for an existing Stripe product by our custom metadata tag
     */
    private async findProductByMetadata(pklType: string): Promise<Stripe.Product | null> {
        const products = await this.stripe.products.list({ active: true, limit: 100 });
        return products.data.find(p => p.metadata?.pkl_type === pklType) || null;
    }

    getMembershipPriceId(): string {
        if (!this.membershipPriceId) {
            throw new Error('Membership price not configured — check Stripe setup and STRIPE_SECRET_KEY');
        }
        return this.membershipPriceId;
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
                    price: this.getMembershipPriceId(),
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
