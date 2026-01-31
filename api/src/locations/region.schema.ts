import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";
import { ApiProperty } from "@nestjs/swagger";

export type RegionDocument = Region & Document;

@Schema({ timestamps: true })
export class Region {
  @ApiProperty({ example: "florida", description: "Region code (lowercase)" })
  @Prop({ required: true, lowercase: true })
  code: string;

  @ApiProperty({ example: "Florida", description: "Region display name" })
  @Prop({ required: true })
  name: string;

  @ApiProperty({ description: "Reference to parent country" })
  @Prop({ type: Types.ObjectId, ref: "Country", required: true })
  country: Types.ObjectId;

  @ApiProperty({
    example: "usa",
    description: "Country code for quick reference",
  })
  @Prop({ required: true, lowercase: true })
  countryCode: string;

  @ApiProperty({ example: true, description: "Whether region is active" })
  @Prop({ default: true })
  isActive: boolean;
}

export const RegionSchema = SchemaFactory.createForClass(Region);

// Compound index to ensure unique region code per country
RegionSchema.index({ code: 1, countryCode: 1 }, { unique: true });
