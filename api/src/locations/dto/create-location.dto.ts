import { ApiProperty } from "@nestjs/swagger";
import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
} from "class-validator";
import { CityStatus } from "../city.schema";

export class CreateCountryDto {
  @ApiProperty({ example: "usa", description: "Country code" })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: "USA", description: "Country name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "us", description: "Flag code for CDN" })
  @IsString()
  @IsNotEmpty()
  flagCode: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateRegionDto {
  @ApiProperty({ example: "florida", description: "Region code" })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: "Florida", description: "Region name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "usa", description: "Parent country code" })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class CreateCityDto {
  @ApiProperty({ example: "miami", description: "City code" })
  @IsString()
  @IsNotEmpty()
  code: string;

  @ApiProperty({ example: "Miami", description: "City name" })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: "florida", description: "Parent region code" })
  @IsString()
  @IsNotEmpty()
  regionCode: string;

  @ApiProperty({ example: "usa", description: "Parent country code" })
  @IsString()
  @IsNotEmpty()
  countryCode: string;

  @ApiProperty({ enum: CityStatus, required: false })
  @IsEnum(CityStatus)
  @IsOptional()
  status?: CityStatus;

  @ApiProperty({ example: true, required: false })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
