import { PartialType } from "@nestjs/swagger";
import { CreateEventDto } from "./create-event.dto";
import { IsOptional, IsString } from "class-validator";
import { ApiPropertyOptional } from "@nestjs/swagger";

export class UpdateEventDto extends PartialType(CreateEventDto) {
  @ApiPropertyOptional({
    description: "Reason for requesting the change (operators)",
  })
  @IsString()
  @IsOptional()
  reason?: string;
}
