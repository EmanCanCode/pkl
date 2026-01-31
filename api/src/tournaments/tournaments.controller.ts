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
import { TournamentsService } from "./tournaments.service";
import { CreateTournamentDto, UpdateTournamentDto } from "./dto/tournament.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

@ApiTags("tournaments")
@Controller("tournaments")
export class TournamentsController {
  constructor(private tournamentsService: TournamentsService) {}

  @Get()
  @ApiOperation({ summary: "Get all active tournaments" })
  @ApiResponse({ status: 200, description: "List of tournaments" })
  async findAll() {
    return this.tournamentsService.findAll();
  }

  @Get(":id")
  @ApiOperation({ summary: "Get tournament by ID" })
  @ApiParam({ name: "id", description: "Tournament MongoDB ID" })
  @ApiResponse({ status: 200, description: "Tournament details" })
  @ApiResponse({ status: 404, description: "Tournament not found" })
  async findById(@Param("id") id: string) {
    return this.tournamentsService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Create a new tournament (operators only)" })
  @ApiResponse({ status: 201, description: "Tournament created" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 404, description: "City not found" })
  async create(@Body() dto: CreateTournamentDto, @Request() req) {
    const operatorName =
      `${req.user.firstName || ""} ${req.user.lastName || req.user.username}`.trim();
    return this.tournamentsService.create(dto, req.user.sub, operatorName);
  }

  @Put(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Update a tournament (owner only)" })
  @ApiParam({ name: "id", description: "Tournament MongoDB ID" })
  @ApiResponse({ status: 200, description: "Tournament updated" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - not owner" })
  @ApiResponse({ status: 404, description: "Tournament not found" })
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTournamentDto,
    @Request() req,
  ) {
    return this.tournamentsService.update(id, dto, req.user.sub);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Delete a tournament (owner only)" })
  @ApiParam({ name: "id", description: "Tournament MongoDB ID" })
  @ApiResponse({ status: 200, description: "Tournament deleted" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  @ApiResponse({ status: 403, description: "Forbidden - not owner" })
  @ApiResponse({ status: 404, description: "Tournament not found" })
  async delete(@Param("id") id: string, @Request() req) {
    await this.tournamentsService.delete(id, req.user.sub);
    return { message: "Tournament deleted successfully" };
  }
}
