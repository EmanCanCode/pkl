import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';
import { ApiProperty } from '@nestjs/swagger';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
    @ApiProperty({ example: 'eman', description: 'Username' })
    @Prop({ required: true, unique: true })
    username: string;

    @Prop({ required: true })
    password: string;

    @ApiProperty({ example: 'admin', description: 'User role' })
    @Prop({ default: 'user' })
    role: string;

    @ApiProperty({ example: 'eman@pkl.club', description: 'Email address' })
    @Prop()
    email: string;

    @ApiProperty({ example: true, description: 'Is user active' })
    @Prop({ default: true })
    isActive: boolean;
}

export const UserSchema = SchemaFactory.createForClass(User);
