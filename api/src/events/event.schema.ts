import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ApiProperty } from "@nestjs/swagger";

export type EventDocument = Event & Document;

export enum EventStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
  COMPLETED = "completed",
}

@Schema()
export class EventLocation {
  @ApiProperty({ example: "USA", description: "Country" })
  @Prop({ required: true })
  country: string;

  @ApiProperty({ example: "North America", description: "Region" })
  @Prop()
  region: string;

  @ApiProperty({ example: "California", description: "State/Province" })
  @Prop({ required: true })
  state: string;

  @ApiProperty({
    example: "Sunset Pickleball Courts",
    description: "Court/Venue name",
  })
  @Prop({ required: true })
  courtName: string;

  @ApiProperty({ example: "Los Angeles", description: "City" })
  @Prop()
  city: string;

  @ApiProperty({ example: "123 Main St", description: "Address" })
  @Prop()
  address: string;
}

@Schema()
export class EventDayData {
  @ApiProperty({ example: "2026-03-15", description: "Date of this event day" })
  @Prop({ required: true })
  date: Date;

  @ApiProperty({
    example: "Day 1 - Qualifiers",
    description: "Title for this day",
  })
  @Prop()
  title: string;

  @ApiProperty({ example: "09:00", description: "Start time" })
  @Prop()
  startTime: string;

  @ApiProperty({ example: "18:00", description: "End time" })
  @Prop()
  endTime: string;

  @ApiProperty({
    example: "Qualifier rounds for all divisions",
    description: "Description",
  })
  @Prop()
  description: string;
}

@Schema()
export class RegisteredPlayer {
  @ApiProperty({ description: "Player user ID" })
  @Prop({ type: Types.ObjectId, ref: "User" })
  playerId: Types.ObjectId;

  @ApiProperty({ example: "John Doe", description: "Player name" })
  @Prop({ required: true })
  playerName: string;

  @ApiProperty({ example: "john@example.com", description: "Player email" })
  @Prop()
  email: string;

  @ApiProperty({ description: "Registration date" })
  @Prop({ default: Date.now })
  registeredAt: Date;
}

@Schema()
export class Winner {
  @ApiProperty({ description: "Winner player ID (if registered)" })
  @Prop({ type: Types.ObjectId, ref: "User" })
  playerId?: Types.ObjectId;

  @ApiProperty({ example: "John Doe", description: "Winner name" })
  @Prop({ required: true })
  playerName: string;

  @ApiProperty({ description: "Date winner was declared" })
  @Prop({ default: Date.now })
  declaredAt: Date;

  @ApiProperty({ description: "Operator who declared the winner" })
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  declaredBy: Types.ObjectId;
}

@Schema({ timestamps: true })
export class Event {
  @ApiProperty({ description: "Operator user ID who created the event" })
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  operator: Types.ObjectId;

  @ApiProperty({
    example: "Spring Championship 2026",
    description: "Event name",
  })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: "Event location details" })
  @Prop({ type: EventLocation, required: true })
  location: EventLocation;

  @ApiProperty({
    example: "https://example.com/tournament",
    description: "Tournament website URL",
  })
  @Prop()
  tournamentSite: string;

  @ApiProperty({ example: "2026-03-15", description: "Event start date" })
  @Prop({ required: true })
  startDate: Date;

  @ApiProperty({ example: "2026-03-17", description: "Event end date" })
  @Prop({ required: true })
  endDate: Date;

  @ApiProperty({
    description: "Data for each day of the event",
    type: [EventDayData],
  })
  @Prop({ type: [EventDayData], default: [] })
  dataPerDay: EventDayData[];

  @ApiProperty({
    description: "List of registered players",
    type: [RegisteredPlayer],
  })
  @Prop({ type: [RegisteredPlayer], default: [] })
  registeredPlayers: RegisteredPlayer[];

  @ApiProperty({
    example: "pending",
    description: "Event status",
    enum: EventStatus,
  })
  @Prop({ type: String, enum: EventStatus, default: EventStatus.PENDING })
  status: EventStatus;

  @ApiProperty({
    description: "Event winner (once declared, cannot be changed)",
  })
  @Prop({ type: Winner })
  winner?: Winner;

  @ApiProperty({
    example: "A great pickleball tournament",
    description: "Event description",
  })
  @Prop()
  description: string;

  @ApiProperty({ example: 50, description: "Maximum number of participants" })
  @Prop()
  maxParticipants: number;

  @ApiProperty({ example: 25.0, description: "Entry fee in USD" })
  @Prop()
  entryFee: number;

  @ApiProperty({ description: "Admin notes (for approval/rejection)" })
  @Prop()
  adminNotes: string;

  @ApiProperty({ description: "Admin who approved/rejected" })
  @Prop({ type: Types.ObjectId, ref: "User" })
  reviewedBy?: Types.ObjectId;

  @ApiProperty({ description: "Date of approval/rejection" })
  @Prop()
  reviewedAt?: Date;
}

export const EventSchema = SchemaFactory.createForClass(Event);
