import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
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
import { UpdateEventDto } from "./dto/update-event.dto";
import { SetWinnerDto } from "./dto/set-winner.dto";
import { ReviewEventDto } from "./dto/review-event.dto";
import { RegisterPlayerDto } from "./dto/register-player.dto";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { EventStatus } from "./event.schema";
import {
  ChangeRequestType,
  ChangeRequestStatus,
} from "./event-change-request.schema";
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
  @ApiQuery({
    name: "limit",
    required: false,
    description: "Limit number of results",
  })
  @ApiResponse({ status: 200, description: "List of approved events" })
  async findApproved(@Query("limit") limit?: string) {
    const limitNum = limit ? parseInt(limit, 10) : undefined;
    return this.eventsService.findApproved(limitNum);
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
   * Get change requests (admin: all pending, operator: own requests)
   */
  @Get("change-requests")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get change requests" })
  @ApiQuery({ name: "status", required: false, enum: ChangeRequestStatus })
  @ApiResponse({ status: 200, description: "List of change requests" })
  async findChangeRequests(
    @Query("status") status?: ChangeRequestStatus,
    @Request() req?: any,
  ) {
    if (
      req.user.userType !== UserType.ADMIN &&
      req.user.userType !== UserType.OPERATOR
    ) {
      return {
        error: "Unauthorized",
        message: "Admin or operator access required",
      };
    }

    const filters: any = {};
    if (status) filters.status = status;

    // Operators can only see their own requests
    if (req.user.userType === UserType.OPERATOR) {
      filters.requestedBy = req.user.userId;
    }

    return this.eventsService.findChangeRequests(filters);
  }

  /**
   * Review a change request (admin only)
   */
  @Patch("change-requests/:id/review")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Approve or reject a change request (admin only)" })
  @ApiResponse({ status: 200, description: "Change request reviewed" })
  async reviewChangeRequest(
    @Param("id") id: string,
    @Body() body: { approved: boolean; adminNotes?: string },
    @Request() req,
  ) {
    if (req.user.userType !== UserType.ADMIN) {
      return { error: "Unauthorized", message: "Admin access required" };
    }
    return this.eventsService.reviewChangeRequest(
      id,
      body.approved,
      req.user.userId,
      body.adminNotes,
    );
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
   * Update an event
   * - Admin: direct update
   * - Operator: creates a change request for admin approval
   */
  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Update an event (admin: direct, operator: creates change request)",
  })
  @ApiResponse({
    status: 200,
    description: "Event updated or change request created",
  })
  async updateEvent(
    @Param("id") id: string,
    @Body() updateDto: UpdateEventDto,
    @Request() req,
  ) {
    if (
      req.user.userType !== UserType.ADMIN &&
      req.user.userType !== UserType.OPERATOR
    ) {
      return {
        error: "Unauthorized",
        message: "Admin or operator access required",
      };
    }

    if (req.user.userType === UserType.ADMIN) {
      return this.eventsService.updateEvent(id, updateDto, req.user.userId);
    }

    // Operator: create a change request
    const { reason, ...proposedChanges } = updateDto;
    return this.eventsService.createChangeRequest(
      id,
      ChangeRequestType.EDIT,
      req.user.userId,
      proposedChanges,
      reason,
    );
  }

  /**
   * Delete an event
   * - Admin: direct delete
   * - Operator: creates a change request for admin approval
   */
  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Delete an event (admin: direct, operator: creates change request)",
  })
  @ApiResponse({
    status: 200,
    description: "Event deleted or change request created",
  })
  async deleteEvent(
    @Param("id") id: string,
    @Body() body: { reason?: string },
    @Request() req,
  ) {
    if (
      req.user.userType !== UserType.ADMIN &&
      req.user.userType !== UserType.OPERATOR
    ) {
      return {
        error: "Unauthorized",
        message: "Admin or operator access required",
      };
    }

    if (req.user.userType === UserType.ADMIN) {
      return this.eventsService.deleteEvent(id);
    }

    // Operator: create a delete change request
    return this.eventsService.createChangeRequest(
      id,
      ChangeRequestType.DELETE,
      req.user.userId,
      undefined,
      body.reason,
    );
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
