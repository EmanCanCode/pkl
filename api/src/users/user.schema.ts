import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = User & Document;

export enum UserType {
    ADMIN = 'admin',
    PLAYER = 'player',
    OPERATOR = 'operator',
    SPONSOR = 'sponsor',
}

@Schema({ timestamps: true })
export class User {
    @ApiProperty({ example: 'eman', description: 'Username' })
    @Prop({ required: true, unique: true })
    username: string;

    @Prop({ required: true })
    password: string;

    @ApiProperty({ example: 'player', description: 'User type', enum: UserType })
    @Prop({ type: String, enum: UserType, default: UserType.PLAYER })
    userType: UserType;

    @ApiProperty({ example: 'eman@pkl.club', description: 'Email address' })
    @Prop({ required: true })
    email: string;

    @ApiProperty({ example: 'John', description: 'First name' })
    @Prop()
    firstName: string;

    @ApiProperty({ example: 'Doe', description: 'Last name' })
    @Prop()
    lastName: string;

    @ApiProperty({ example: '+1234567890', description: 'Phone number' })
    @Prop()
    phone: string;

    @ApiProperty({ example: true, description: 'Is user active' })
    @Prop({ default: true })
    isActive: boolean;

    @ApiProperty({ description: 'Stripe customer ID' })
    @Prop()
    stripeCustomerId?: string;

    @ApiProperty({ example: 'active', description: 'Membership status' })
    @Prop({ type: String, enum: ['none', 'active', 'expired', 'cancelled'], default: 'none' })
    membershipStatus: string;

    @ApiProperty({ description: 'Membership expiration date' })
    @Prop()
    membershipExpires?: Date;

    @ApiProperty({ description: 'Stripe subscription ID for membership' })
    @Prop()
    membershipSubscriptionId?: string;

    @ApiProperty({ example: 0, description: 'Membership fee passes remaining (bypass Stripe)' })
    @Prop({ default: 0 })
    membershipPasses: number;

    @ApiProperty({ example: 0, description: 'Event registration fee passes remaining (bypass Stripe)' })
    @Prop({ default: 0 })
    eventFeePasses: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
