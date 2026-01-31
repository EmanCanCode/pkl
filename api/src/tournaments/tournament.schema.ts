import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ApiProperty } from "@nestjs/swagger";

export type TournamentDocument = Tournament & Document;

export enum TournamentStatus {
  UPCOMING = "upcoming",
  ONGOING = "ongoing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
}

@Schema()
export class ScheduleDay {
  @ApiProperty({ example: 1, description: "Day number (1-5)" })
  @Prop({ required: true })
  day: number;

  @ApiProperty({ example: "2026-10-07", description: "Date of event" })
  @Prop({ type: Date, required: true })
  date: Date;

  @ApiProperty({
    example: ["Qualifiers", "Round 1"],
    description: "Events for the day",
  })
  @Prop({ type: [String], default: [] })
  events: string[];
}

export const ScheduleDaySchema = SchemaFactory.createForClass(ScheduleDay);

@Schema({ timestamps: true })
export class Tournament {
  @ApiProperty({ example: "Miami Masters", description: "Tournament name" })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: "Reference to city" })
  @Prop({ type: Types.ObjectId, ref: "City", required: true })
  city: Types.ObjectId;

  @ApiProperty({
    example: "miami",
    description: "City code for quick reference",
  })
  @Prop({ lowercase: true })
  cityCode: string;

  @ApiProperty({ description: "Reference to operator (User)" })
  @Prop({ type: Types.ObjectId, ref: "User" })
  operator: Types.ObjectId;

  @ApiProperty({
    example: "Pickleball Cows",
    description: "Operator display name",
  })
  @Prop()
  operatorName: string;

  @ApiProperty({ example: "Pasture Pickleball", description: "Venue name" })
  @Prop({ required: true })
  location: string;

  @ApiProperty({ description: "Tournament date range" })
  @Prop({
    type: {
      start: { type: Date, required: true },
      end: { type: Date, required: true },
    },
    required: true,
  })
  dates: {
    start: Date;
    end: Date;
  };

  @ApiProperty({ enum: TournamentStatus, description: "Tournament status" })
  @Prop({
    type: String,
    enum: TournamentStatus,
    default: TournamentStatus.UPCOMING,
  })
  status: TournamentStatus;

  @ApiProperty({
    example: "https://tournament.pkl.club/miami",
    required: false,
  })
  @Prop()
  tournamentUrl?: string;

  @ApiProperty({ type: [ScheduleDay], description: "Daily schedule" })
  @Prop({ type: [ScheduleDaySchema], default: [] })
  schedule: ScheduleDay[];

  @ApiProperty({ example: true, description: "Whether tournament is active" })
  @Prop({ default: true })
  isActive: boolean;
}

export const TournamentSchema = SchemaFactory.createForClass(Tournament);

// Index for finding tournaments by city
TournamentSchema.index({ cityCode: 1 });
TournamentSchema.index({ operator: 1 });
