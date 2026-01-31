import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ApiProperty } from "@nestjs/swagger";

export type RegistrationDocument = Registration & Document;

export enum RegistrationStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  CANCELLED = "cancelled",
}

export enum PlayerCategory {
  MENS_SINGLES = "Men's Singles",
  WOMENS_SINGLES = "Women's Singles",
  MENS_DOUBLES = "Men's Doubles",
  WOMENS_DOUBLES = "Women's Doubles",
  MIXED_DOUBLES = "Mixed Doubles",
}

@Schema({ timestamps: true })
export class Registration {
  @ApiProperty({ description: "Reference to tournament" })
  @Prop({ type: Types.ObjectId, ref: "Tournament", required: true })
  tournament: Types.ObjectId;

  @ApiProperty({ description: "Reference to player (User)" })
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  player: Types.ObjectId;

  @ApiProperty({ example: "JD", description: "Player initials for display" })
  @Prop({ required: true })
  playerInitials: string;

  @ApiProperty({ example: "John Doe", description: "Player display name" })
  @Prop({ required: true })
  playerName: string;

  @ApiProperty({ enum: PlayerCategory, description: "Competition category" })
  @Prop({ type: String, enum: PlayerCategory, required: true })
  category: PlayerCategory;

  @ApiProperty({ enum: RegistrationStatus, description: "Registration status" })
  @Prop({
    type: String,
    enum: RegistrationStatus,
    default: RegistrationStatus.PENDING,
  })
  status: RegistrationStatus;

  @ApiProperty({
    description: "Partner for doubles (User reference)",
    required: false,
  })
  @Prop({ type: Types.ObjectId, ref: "User" })
  partner?: Types.ObjectId;

  @ApiProperty({
    example: "Jane Doe",
    description: "Partner display name",
    required: false,
  })
  @Prop()
  partnerName?: string;
}

export const RegistrationSchema = SchemaFactory.createForClass(Registration);

// Compound index to prevent duplicate registrations
RegistrationSchema.index(
  { tournament: 1, player: 1, category: 1 },
  { unique: true },
);
