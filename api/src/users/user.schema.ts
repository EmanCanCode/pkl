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
}

export const UserSchema = SchemaFactory.createForClass(User);
