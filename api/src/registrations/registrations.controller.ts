import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from "@nestjs/swagger";
import { RegistrationsService } from "./registrations.service";
import {
  CreateRegistrationDto,
  UpdateRegistrationStatusDto,
} from "./dto/registration.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("registrations")
@Controller("registrations")
export class RegistrationsController {
  constructor(private registrationsService: RegistrationsService) {}

  @Get("tournament/:tournamentId")
  @ApiOperation({ summary: "Get all registrations for a tournament" })
  @ApiParam({ name: "tournamentId", description: "Tournament MongoDB ID" })
  @ApiResponse({ status: 200, description: "List of registrations" })
  async findByTournament(@Param("tournamentId") tournamentId: string) {
    return this.registrationsService.findByTournament(tournamentId);
  }

  @Get("tournament/:tournamentId/preview")
  @ApiOperation({
    summary: "Get player preview for a tournament (first 5 + total)",
  })
  @ApiParam({ name: "tournamentId", description: "Tournament MongoDB ID" })
  @ApiResponse({ status: 200, description: "Player preview with total count" })
  async getPlayerPreview(@Param("tournamentId") tournamentId: string) {
    return this.registrationsService.getPlayerPreview(tournamentId);
  }

  @Get("player")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Get all registrations for the logged-in player" })
  @ApiResponse({ status: 200, description: "List of player registrations" })
  async findByPlayer(@Request() req) {
    return this.registrationsService.findByPlayer(req.user.sub);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Register for a tournament" })
  @ApiResponse({ status: 201, description: "Registration created" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "Tournament not found" })
  @ApiResponse({ status: 409, description: "Already registered" })
  async create(@Body() dto: CreateRegistrationDto, @Request() req) {
    return this.registrationsService.create(dto, req.user.sub);
  }

  @Put(":id/status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Update registration status (operators)" })
  @ApiParam({ name: "id", description: "Registration MongoDB ID" })
  @ApiResponse({ status: 200, description: "Status updated" })
  async updateStatus(
    @Param("id") id: string,
    @Body() dto: UpdateRegistrationStatusDto,
  ) {
    return this.registrationsService.updateStatus(id, dto);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Cancel registration (player only)" })
  @ApiParam({ name: "id", description: "Registration MongoDB ID" })
  @ApiResponse({ status: 200, description: "Registration cancelled" })
  async cancel(@Param("id") id: string, @Request() req) {
    await this.registrationsService.cancel(id, req.user.sub);
    return { message: "Registration cancelled successfully" };
  }
}
