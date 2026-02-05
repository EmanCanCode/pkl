import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsMongoId, IsNotEmpty } from "class-validator";

export class SetWinnerDto {
  @ApiPropertyOptional({
    description: "Player ID if selecting from registered players",
  })
  @IsMongoId()
  @IsOptional()
  playerId?: string;

  @ApiProperty({
    example: "John Doe",
    description: "Winner name (required if typing manually)",
  })
  @IsString()
  @IsNotEmpty()
  playerName: string;
}
