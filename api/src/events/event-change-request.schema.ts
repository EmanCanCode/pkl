import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export type EventChangeRequestDocument = EventChangeRequest & Document;

export enum ChangeRequestType {
  EDIT = "edit",
  DELETE = "delete",
}

export enum ChangeRequestStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Schema({ timestamps: true })
export class EventChangeRequest {
  @ApiProperty({ description: "Event being changed" })
  @Prop({ type: Types.ObjectId, ref: "Event", required: true })
  event: Types.ObjectId;

  @ApiProperty({ description: "Operator who requested the change" })
  @Prop({ type: Types.ObjectId, ref: "User", required: true })
  requestedBy: Types.ObjectId;

  @ApiProperty({ enum: ChangeRequestType, description: "Type of change" })
  @Prop({ type: String, enum: ChangeRequestType, required: true })
  requestType: ChangeRequestType;

  @ApiProperty({ enum: ChangeRequestStatus, description: "Request status" })
  @Prop({
    type: String,
    enum: ChangeRequestStatus,
    default: ChangeRequestStatus.PENDING,
  })
  status: ChangeRequestStatus;

  @ApiPropertyOptional({ description: "Proposed changes (for edit requests)" })
  @Prop({ type: Object })
  proposedChanges?: Record<string, any>;

  @ApiPropertyOptional({ description: "Operator's reason for the change" })
  @Prop()
  reason?: string;

  @ApiPropertyOptional({ description: "Admin who reviewed" })
  @Prop({ type: Types.ObjectId, ref: "User" })
  reviewedBy?: Types.ObjectId;

  @ApiPropertyOptional({ description: "Date of review" })
  @Prop()
  reviewedAt?: Date;

  @ApiPropertyOptional({ description: "Admin notes on the review" })
  @Prop()
  adminNotes?: string;
}

export const EventChangeRequestSchema =
  SchemaFactory.createForClass(EventChangeRequest);
