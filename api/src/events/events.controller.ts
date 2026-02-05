import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Request,
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from "@nestjs/swagger";
import { EventsService } from "./events.service";
import { CreateEventDto } from "./dto/create-event.dto";
import { SetWinnerDto } from "./dto/set-winner.dto";
import { ReviewEventDto } from "./dto/review-event.dto";
import { RegisterPlayerDto } from "./dto/register-player.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { EventStatus } from "./event.schema";
import { UserType } from "../users/user.schema";

@ApiTags("Events")
@Controller("events")
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  /**
   * Create a new event
   * - Admin: auto-approved
   * - Operator: creates pending application
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Create a new event (operators create applications, admins auto-approve)",
  })
  @ApiResponse({ status: 201, description: "Event created successfully" })
  async create(@Body() createEventDto: CreateEventDto, @Request() req) {
    return this.eventsService.create(
      createEventDto,
      req.user.userId,
      req.user.userType,
    );
  }

  /**
   * Get all events (with optional filters)
   */
  @Get()
  @ApiOperation({ summary: "Get all events with optional filters" })
  @ApiQuery({ name: "status", required: false, enum: EventStatus })
  @ApiQuery({ name: "operatorId", required: false })
  @ApiResponse({ status: 200, description: "List of events" })
  async findAll(
    @Query("status") status?: EventStatus,
    @Query("operatorId") operatorId?: string,
  ) {
    return this.eventsService.findAll({ status, operatorId });
  }

  /**
   * Get approved events (for public display)
   */
  @Get("approved")
  @ApiOperation({ summary: "Get all approved/completed events (public)" })
  @ApiResponse({ status: 200, description: "List of approved events" })
  async findApproved() {
    return this.eventsService.findApproved();
  }

  /**
   * Get pending events (admin only)
   */
  @Get("pending")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get pending event applications (admin only)" })
  @ApiResponse({ status: 200, description: "List of pending events" })
  async findPending(@Request() req) {
    if (req.user.userType !== UserType.ADMIN) {
      return { error: "Unauthorized", message: "Admin access required" };
    }
    return this.eventsService.findPending();
  }

  /**
   * Get my event applications (operator)
   */
  @Get("my-applications")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current operator's event applications" })
  @ApiResponse({ status: 200, description: "List of operator's events" })
  async findMyApplications(@Request() req) {
    return this.eventsService.findByOperator(req.user.userId);
  }

  /**
   * Get event statistics
   */
  @Get("stats")
  @ApiOperation({ summary: "Get event statistics" })
  @ApiResponse({ status: 200, description: "Event statistics" })
  async getStats() {
    return this.eventsService.getStats();
  }

  /**
   * Get single event by ID
   */
  @Get(":id")
  @ApiOperation({ summary: "Get event by ID" })
  @ApiResponse({ status: 200, description: "Event details" })
  async findOne(@Param("id") id: string) {
    return this.eventsService.findById(id);
  }

  /**
   * Review an event (admin only)
   */
  @Patch(":id/review")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Approve or reject an event application (admin only)",
  })
  @ApiResponse({ status: 200, description: "Event reviewed" })
  async reviewEvent(
    @Param("id") id: string,
    @Body() reviewDto: ReviewEventDto,
    @Request() req,
  ) {
    if (req.user.userType !== UserType.ADMIN) {
      return { error: "Unauthorized", message: "Admin access required" };
    }
    return this.eventsService.reviewEvent(id, reviewDto, req.user.userId);
  }

  /**
   * Set winner for an event (operator only, irreversible)
   */
  @Patch(":id/winner")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Set event winner (operator only, IRREVERSIBLE)" })
  @ApiResponse({ status: 200, description: "Winner set successfully" })
  async setWinner(
    @Param("id") id: string,
    @Body() setWinnerDto: SetWinnerDto,
    @Request() req,
  ) {
    return this.eventsService.setWinner(id, setWinnerDto, req.user.userId);
  }

  /**
   * Register a player to an event
   */
  @Post(":id/register")
  @ApiOperation({ summary: "Register a player to an event" })
  @ApiResponse({ status: 201, description: "Player registered successfully" })
  async registerPlayer(
    @Param("id") id: string,
    @Body() registerDto: RegisterPlayerDto,
  ) {
    return this.eventsService.registerPlayer(id, registerDto);
  }
}
