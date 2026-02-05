import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsUrl,
  IsDateString,
  IsNumber,
  IsArray,
  ValidateNested,
  IsNotEmpty,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateEventLocationDto {
  @ApiProperty({ example: "USA" })
  @IsString()
  @IsNotEmpty()
  country: string;

  @ApiPropertyOptional({ example: "North America" })
  @IsString()
  @IsOptional()
  region?: string;

  @ApiProperty({ example: "California" })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: "Sunset Pickleball Courts" })
  @IsString()
  @IsNotEmpty()
  courtName: string;

  @ApiPropertyOptional({ example: "Los Angeles" })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: "123 Main St" })
  @IsString()
  @IsOptional()
  address?: string;
}

export class CreateEventDayDataDto {
  @ApiProperty({ example: "2026-03-15" })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: "Day 1 - Qualifiers" })
  @IsString()
  @IsOptional()
  title?: string;

  @ApiPropertyOptional({ example: "09:00" })
  @IsString()
  @IsOptional()
  startTime?: string;

  @ApiPropertyOptional({ example: "18:00" })
  @IsString()
  @IsOptional()
  endTime?: string;

  @ApiPropertyOptional({ example: "Qualifier rounds" })
  @IsString()
  @IsOptional()
  description?: string;
}

export class CreateEventDto {
  @ApiProperty({ example: "Spring Championship 2026" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ type: CreateEventLocationDto })
  @ValidateNested()
  @Type(() => CreateEventLocationDto)
  location: CreateEventLocationDto;

  @ApiPropertyOptional({ example: "https://example.com/tournament" })
  @IsUrl()
  @IsOptional()
  tournamentSite?: string;

  @ApiProperty({ example: "2026-03-15" })
  @IsDateString()
  startDate: string;

  @ApiProperty({ example: "2026-03-17" })
  @IsDateString()
  endDate: string;

  @ApiPropertyOptional({ type: [CreateEventDayDataDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateEventDayDataDto)
  @IsOptional()
  dataPerDay?: CreateEventDayDataDto[];

  @ApiPropertyOptional({ example: "A great pickleball tournament" })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ example: 50 })
  @IsNumber()
  @IsOptional()
  maxParticipants?: number;

  @ApiPropertyOptional({ example: 25.0 })
  @IsNumber()
  @IsOptional()
  entryFee?: number;
}
