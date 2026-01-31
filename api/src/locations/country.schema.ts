import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document } from "mongoose";
import { ApiProperty } from "@nestjs/swagger";

export type CountryDocument = Country & Document;

@Schema({ timestamps: true })
export class Country {
  @ApiProperty({ example: "usa", description: "Country code (lowercase)" })
  @Prop({ required: true, unique: true, lowercase: true })
  code: string;

  @ApiProperty({ example: "USA", description: "Country display name" })
  @Prop({ required: true })
  name: string;

  @ApiProperty({
    example: "us",
    description: "Flag code for CDN (flagcdn.com)",
  })
  @Prop({ required: true })
  flagCode: string;

  @ApiProperty({ example: true, description: "Whether country is active" })
  @Prop({ default: true })
  isActive: boolean;
}

export const CountrySchema = SchemaFactory.createForClass(Country);
