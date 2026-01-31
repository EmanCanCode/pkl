import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
  IsNumber,
} from "class-validator";
import { Type } from "class-transformer";
import { TournamentStatus } from "../tournament.schema";

export class ScheduleDayDto {
  @ApiProperty({ example: 1 })
  @IsNumber()
  @IsNotEmpty()
  day: number;

  @ApiProperty({ example: "2026-10-07" })
  @IsDateString()
  @IsNotEmpty()
  date: string;

  @ApiProperty({ example: ["Qualifiers", "Round 1"] })
  @IsArray()
  @IsString({ each: true })
  @IsNotEmpty()
  events: string[];
}

export class CreateTournamentDto {
  @ApiProperty({ example: "Miami Masters", description: "Tournament name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "miami", description: "City code" })
  @IsString()
  @IsNotEmpty()
  cityCode: string;

  @ApiProperty({ example: "Pasture Pickleball", description: "Venue name" })
  @IsString()
  @IsNotEmpty()
  location: string;

  @ApiProperty({
    example: "2026-10-07",
    description: "Start date (YYYY-MM-DD)",
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({ example: "2026-10-11", description: "End date (YYYY-MM-DD)" })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;

  @ApiProperty({
    example: "https://tournament.pkl.club/miami",
    required: false,
  })
  @IsString()
  @IsOptional()
  tournamentUrl?: string;

  @ApiProperty({ type: [ScheduleDayDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDayDto)
  @IsOptional()
  schedule?: ScheduleDayDto[];
}

export class UpdateTournamentDto {
  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  location?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({ required: false })
  @IsDateString()
  @IsOptional()
  endDate?: string;

  @ApiProperty({ enum: TournamentStatus, required: false })
  @IsEnum(TournamentStatus)
  @IsOptional()
  status?: TournamentStatus;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  tournamentUrl?: string;

  @ApiProperty({ type: [ScheduleDayDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScheduleDayDto)
  @IsOptional()
  schedule?: ScheduleDayDto[];
}
