import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsString, IsOptional, IsEnum } from "class-validator";
import { EventStatus } from "../event.schema";

export class ReviewEventDto {
  @ApiPropertyOptional({ example: "approved", enum: EventStatus })
  @IsEnum(EventStatus)
  status: EventStatus;

  @ApiPropertyOptional({ example: "Approved - looks good!" })
  @IsString()
  @IsOptional()
  adminNotes?: string;
}
