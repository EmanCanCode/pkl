import { ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsString,
  IsOptional,
  IsMongoId,
  IsEmail,
  IsArray,
} from "class-validator";

export class RegisterPlayerDto {
  @ApiPropertyOptional({ description: "Player user ID (if registered user)" })
  @IsMongoId()
  @IsOptional()
  playerId?: string;

  @ApiPropertyOptional({ example: "John Doe", description: "Player name" })
  @IsString()
  playerName: string;

  @ApiPropertyOptional({
    example: "john@example.com",
    description: "Player email",
  })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({
    example: ["Mens/Womens Single", "Mixed Doubles"],
    description: "Game types the player is registering for",
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  gameTypes?: string[];
}
