import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsOptional, IsEnum } from "class-validator";
import { PlayerCategory, RegistrationStatus } from "../registration.schema";

export class CreateRegistrationDto {
  @ApiProperty({
    example: "507f1f77bcf86cd799439011",
    description: "Tournament ID",
  })
  @IsString()
  @IsNotEmpty()
  tournamentId: string;

  @ApiProperty({ enum: PlayerCategory, example: "Men's Singles" })
  @IsEnum(PlayerCategory)
  @IsNotEmpty()
  category: PlayerCategory;

  @ApiProperty({
    example: "507f1f77bcf86cd799439012",
    description: "Partner user ID (for doubles)",
    required: false,
  })
  @IsString()
  @IsOptional()
  partnerId?: string;
}

export class UpdateRegistrationStatusDto {
  @ApiProperty({ enum: RegistrationStatus })
  @IsEnum(RegistrationStatus)
  @IsNotEmpty()
  status: RegistrationStatus;
}
