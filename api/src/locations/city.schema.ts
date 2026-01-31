import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ApiProperty } from "@nestjs/swagger";

export type CityDocument = City & Document;

export enum CityStatus {
  ACTIVATED = "activated",
  OPEN = "open",
}

@Schema({ timestamps: true })
export class City {
  @ApiProperty({ example: "miami", description: "City code (lowercase)" })
  @Prop({ required: true, lowercase: true })
  code: string;

  @ApiProperty({ example: "Miami", description: "City display name" })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: "Reference to parent region" })
  @Prop({ type: Types.ObjectId, ref: "Region", required: true })
  region: Types.ObjectId;

  @ApiProperty({
    example: "florida",
    description: "Region code for quick reference",
  })
  @Prop({ required: true, lowercase: true })
  regionCode: string;

  @ApiProperty({ description: "Reference to parent country" })
  @Prop({ type: Types.ObjectId, ref: "Country", required: true })
  country: Types.ObjectId;

  @ApiProperty({
    example: "usa",
    description: "Country code for quick reference",
  })
  @Prop({ required: true, lowercase: true })
  countryCode: string;

  @ApiProperty({ enum: CityStatus, description: "City activation status" })
  @Prop({ type: String, enum: CityStatus, default: CityStatus.OPEN })
  status: CityStatus;

  @ApiProperty({ example: true, description: "Whether city is active" })
  @Prop({ default: true })
  isActive: boolean;
}

export const CitySchema = SchemaFactory.createForClass(City);

// Compound index to ensure unique city code per region
CitySchema.index({ code: 1, regionCode: 1 }, { unique: true });
