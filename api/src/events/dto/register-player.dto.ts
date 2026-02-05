import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsMongoId, IsEmail } from "class-validator";

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
}
