import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type PaymentDocument = Payment & Document;

export enum PaymentType {
    MEMBERSHIP = 'membership',
    TOURNAMENT = 'tournament',
}

export enum PaymentStatus {
    PENDING = 'pending',
    COMPLETED = 'completed',
    FAILED = 'failed',
    REFUNDED = 'refunded',
}

@Schema({ timestamps: true })
export class Payment {
    @ApiProperty({ description: 'Reference to user' })
    @Prop({ type: Types.ObjectId, ref: 'User', required: true })
    user: Types.ObjectId;

    @ApiProperty({ enum: PaymentType, description: 'Type of payment' })
    @Prop({ type: String, enum: PaymentType, required: true })
    type: PaymentType;

    @ApiProperty({ description: 'Stripe session ID' })
    @Prop({ required: true })
    stripeSessionId: string;

    @ApiProperty({ description: 'Stripe payment intent ID' })
    @Prop()
    stripePaymentIntentId?: string;

    @ApiProperty({ description: 'Amount in cents' })
    @Prop({ required: true })
    amount: number;

    @ApiProperty({ description: 'Currency code' })
    @Prop({ default: 'usd' })
    currency: string;

    @ApiProperty({ enum: PaymentStatus, description: 'Payment status' })
    @Prop({ type: String, enum: PaymentStatus, default: PaymentStatus.PENDING })
    status: PaymentStatus;

    @ApiProperty({ description: 'Reference to tournament (for tournament payments)' })
    @Prop({ type: Types.ObjectId, ref: 'Tournament' })
    tournament?: Types.ObjectId;

    @ApiProperty({ description: 'Reference to event (for event registration payments)' })
    @Prop({ type: Types.ObjectId, ref: 'Event' })
    event?: Types.ObjectId;

    @ApiProperty({ description: 'Reference to registration (for tournament payments)' })
    @Prop({ type: Types.ObjectId, ref: 'Registration' })
    registration?: Types.ObjectId;

    @ApiProperty({ description: 'Stripe price ID used' })
    @Prop()
    stripePriceId: string;

    @ApiProperty({ description: 'Additional metadata' })
    @Prop({ type: Object })
    metadata?: Record<string, any>;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);
