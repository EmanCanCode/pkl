import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Event, EventDocument, EventStatus } from "./event.schema";
import {
  EventChangeRequest,
  EventChangeRequestDocument,
  ChangeRequestType,
  ChangeRequestStatus,
} from "./event-change-request.schema";
import { CreateEventDto } from "./dto/create-event.dto";
import { UpdateEventDto } from "./dto/update-event.dto";
import { SetWinnerDto } from "./dto/set-winner.dto";
import { ReviewEventDto } from "./dto/review-event.dto";
import { RegisterPlayerDto } from "./dto/register-player.dto";
import { UserType } from "../users/user.schema";

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
    @InjectModel(EventChangeRequest.name)
    private changeRequestModel: Model<EventChangeRequestDocument>,
  ) {}

  /**
   * Create a new event
   * - If admin: auto-approve
   * - If operator: create as pending (application)
   */
  async create(
    createEventDto: CreateEventDto,
    userId: string,
    userType: UserType,
  ): Promise<EventDocument> {
    console.log(
      "[EventsService] Creating event with DTO:",
      JSON.stringify(createEventDto, null, 2),
    );
    console.log(
      "[EventsService] entryFee value:",
      createEventDto.entryFee,
      "type:",
      typeof createEventDto.entryFee,
    );

    const eventData: any = {
      ...createEventDto,
      operator: new Types.ObjectId(userId),
      status:
        userType === UserType.ADMIN
          ? EventStatus.APPROVED
          : EventStatus.PENDING,
    };

    // If admin, set as reviewed by themselves
    if (userType === UserType.ADMIN) {
      eventData.reviewedBy = new Types.ObjectId(userId);
      eventData.reviewedAt = new Date();
    }

    const event = new this.eventModel(eventData);
    const saved = await event.save();
    console.log("[EventsService] Event saved with entryFee:", saved.entryFee);
    return saved;
  }

  /**
   * Get all events (with optional filters)
   */
  async findAll(filters?: {
    status?: EventStatus;
    operatorId?: string;
  }): Promise<EventDocument[]> {
    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.operatorId) {
      query.operator = new Types.ObjectId(filters.operatorId);
    }

    return this.eventModel
      .find(query)
      .populate("operator", "username firstName lastName email")
      .populate("winner.playerId", "username firstName lastName")
      .populate("winner.declaredBy", "username firstName lastName")
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get events by operator (their applications)
   */
  async findByOperator(operatorId: string): Promise<EventDocument[]> {
    return this.eventModel
      .find({ operator: new Types.ObjectId(operatorId) })
      .populate("operator", "username firstName lastName email")
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Get approved events (for public display like Pathway Series)
   */
  async findApproved(limit?: number): Promise<EventDocument[]> {
    const query = this.eventModel
      .find({ status: { $in: [EventStatus.APPROVED, EventStatus.COMPLETED] } })
      .populate("operator", "username firstName lastName email")
      .populate("winner.playerId", "username firstName lastName")
      .sort({ startDate: -1 }); // Sort by most recent first

    if (limit) {
      query.limit(limit);
    }

    const results = await query.exec();
    console.log(
      "[EventsService] findApproved returning",
      results.length,
      "events",
    );
    results.forEach((e) => {
      console.log(
        `  - Event "${e.name}": entryFee =`,
        e.entryFee,
        typeof e.entryFee,
      );
    });
    return results;
  }

  /**
   * Get pending events (for admin review)
   */
  async findPending(): Promise<EventDocument[]> {
    return this.eventModel
      .find({ status: EventStatus.PENDING })
      .populate("operator", "username firstName lastName email")
      .sort({ createdAt: 1 })
      .exec();
  }

  /**
   * Get single event by ID
   */
  async findById(id: string): Promise<EventDocument> {
    const event = await this.eventModel
      .findById(id)
      .populate("operator", "username firstName lastName email")
      .populate(
        "registeredPlayers.playerId",
        "username firstName lastName email",
      )
      .populate("winner.playerId", "username firstName lastName")
      .populate("winner.declaredBy", "username firstName lastName")
      .exec();

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    return event;
  }

  /**
   * Review an event (admin only) - approve or reject
   */
  async reviewEvent(
    eventId: string,
    reviewDto: ReviewEventDto,
    adminId: string,
  ): Promise<EventDocument> {
    const event = await this.eventModel.findById(eventId);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    if (event.status !== EventStatus.PENDING) {
      throw new BadRequestException("Event has already been reviewed");
    }

    event.status = reviewDto.status;
    event.adminNotes = reviewDto.adminNotes;
    event.reviewedBy = new Types.ObjectId(adminId);
    event.reviewedAt = new Date();

    return event.save();
  }

  /**
   * Set winner for an event (operator only, irreversible)
   */
  async setWinner(
    eventId: string,
    setWinnerDto: SetWinnerDto,
    operatorId: string,
  ): Promise<EventDocument> {
    const event = await this.eventModel.findById(eventId);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    // Check if the operator owns this event
    if (event.operator.toString() !== operatorId) {
      throw new ForbiddenException(
        "You can only set winner for your own events",
      );
    }

    // Check if event is approved
    if (
      event.status !== EventStatus.APPROVED &&
      event.status !== EventStatus.COMPLETED
    ) {
      throw new BadRequestException("Can only set winner for approved events");
    }

    // Check if winner already set (IRREVERSIBLE)
    if (event.winner) {
      throw new BadRequestException(
        "Winner has already been declared and cannot be changed",
      );
    }

    event.winner = {
      playerId: setWinnerDto.playerId
        ? new Types.ObjectId(setWinnerDto.playerId)
        : undefined,
      playerName: setWinnerDto.playerName,
      declaredAt: new Date(),
      declaredBy: new Types.ObjectId(operatorId),
    };

    event.status = EventStatus.COMPLETED;

    return event.save();
  }

  /**
   * Register a player to an event
   */
  async registerPlayer(
    eventId: string,
    registerDto: RegisterPlayerDto,
  ): Promise<EventDocument> {
    const event = await this.eventModel.findById(eventId);

    if (!event) {
      throw new NotFoundException("Event not found");
    }

    if (event.status !== EventStatus.APPROVED) {
      throw new BadRequestException("Can only register for approved events");
    }

    // Check max participants
    if (
      event.maxParticipants &&
      event.registeredPlayers.length >= event.maxParticipants
    ) {
      throw new BadRequestException("Event is full");
    }

    // Check if player already registered
    const alreadyRegistered = event.registeredPlayers.some(
      (p) =>
        (registerDto.playerId &&
          p.playerId?.toString() === registerDto.playerId) ||
        p.email === registerDto.email,
    );

    if (alreadyRegistered) {
      throw new BadRequestException("Player is already registered");
    }

    event.registeredPlayers.push({
      playerId: registerDto.playerId
        ? new Types.ObjectId(registerDto.playerId)
        : undefined,
      playerName: registerDto.playerName,
      email: registerDto.email,
      registeredAt: new Date(),
      gameTypes: registerDto.gameTypes || [],
    });

    return event.save();
  }

  /**
   * Update an event directly (admin only)
   */
  async updateEvent(
    eventId: string,
    updateDto: UpdateEventDto,
    userId: string,
  ): Promise<EventDocument> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new NotFoundException("Event not found");
    }

    if (event.winner) {
      throw new BadRequestException(
        "Cannot edit a completed event with a declared winner",
      );
    }

    // Remove reason field — it's not part of event data
    const { reason, ...updateData } = updateDto;
    Object.assign(event, updateData);
    return event.save();
  }

  /**
   * Delete an event directly (admin only)
   */
  async deleteEvent(eventId: string): Promise<{ message: string }> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new NotFoundException("Event not found");
    }

    if (event.winner) {
      throw new BadRequestException(
        "Cannot delete a completed event with a declared winner",
      );
    }

    await this.eventModel.findByIdAndDelete(eventId);
    // Clean up any pending change requests for this event
    await this.changeRequestModel.deleteMany({
      event: new Types.ObjectId(eventId),
    });
    return { message: "Event deleted successfully" };
  }

  /**
   * Create a change request (operator requesting edit/delete)
   */
  async createChangeRequest(
    eventId: string,
    requestType: ChangeRequestType,
    userId: string,
    proposedChanges?: Record<string, any>,
    reason?: string,
  ): Promise<EventChangeRequestDocument> {
    const event = await this.eventModel.findById(eventId);
    if (!event) {
      throw new NotFoundException("Event not found");
    }

    // Operator can only request changes on their own events
    if (event.operator.toString() !== userId) {
      throw new ForbiddenException(
        "You can only request changes for your own events",
      );
    }

    if (event.winner) {
      throw new BadRequestException(
        "Cannot modify a completed event with a declared winner",
      );
    }

    // Check for existing pending request of the same type
    const existingRequest = await this.changeRequestModel.findOne({
      event: new Types.ObjectId(eventId),
      requestedBy: new Types.ObjectId(userId),
      requestType,
      status: ChangeRequestStatus.PENDING,
    });

    if (existingRequest) {
      throw new BadRequestException(
        `You already have a pending ${requestType} request for this event`,
      );
    }

    const changeRequest = new this.changeRequestModel({
      event: new Types.ObjectId(eventId),
      requestedBy: new Types.ObjectId(userId),
      requestType,
      proposedChanges:
        requestType === ChangeRequestType.EDIT ? proposedChanges : undefined,
      reason,
    });

    return changeRequest.save();
  }

  /**
   * Get change requests with optional filters
   */
  async findChangeRequests(filters?: {
    status?: ChangeRequestStatus;
    requestedBy?: string;
  }): Promise<EventChangeRequestDocument[]> {
    const query: any = {};

    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.requestedBy) {
      query.requestedBy = new Types.ObjectId(filters.requestedBy);
    }

    return this.changeRequestModel
      .find(query)
      .populate("event", "name location startDate endDate status")
      .populate("requestedBy", "username firstName lastName email")
      .populate("reviewedBy", "username firstName lastName")
      .sort({ createdAt: -1 })
      .exec();
  }

  /**
   * Review a change request (admin approve/reject)
   * If approved: apply edit changes or delete the event
   */
  async reviewChangeRequest(
    requestId: string,
    approved: boolean,
    adminId: string,
    adminNotes?: string,
  ): Promise<{ changeRequest: EventChangeRequestDocument; message: string }> {
    const changeRequest = await this.changeRequestModel.findById(requestId);
    if (!changeRequest) {
      throw new NotFoundException("Change request not found");
    }

    if (changeRequest.status !== ChangeRequestStatus.PENDING) {
      throw new BadRequestException("This request has already been reviewed");
    }

    changeRequest.status = approved
      ? ChangeRequestStatus.APPROVED
      : ChangeRequestStatus.REJECTED;
    changeRequest.reviewedBy = new Types.ObjectId(adminId);
    changeRequest.reviewedAt = new Date();
    changeRequest.adminNotes = adminNotes;

    await changeRequest.save();

    let message: string;

    if (approved) {
      if (changeRequest.requestType === ChangeRequestType.EDIT) {
        // Apply the proposed changes to the event
        const event = await this.eventModel.findById(changeRequest.event);
        if (event) {
          Object.assign(event, changeRequest.proposedChanges);
          await event.save();
        }
        message = "Edit request approved and changes applied to the event";
      } else {
        // Delete the event
        await this.eventModel.findByIdAndDelete(changeRequest.event);
        // Clean up other pending requests for this event
        await this.changeRequestModel.updateMany(
          {
            event: changeRequest.event,
            _id: { $ne: changeRequest._id },
            status: ChangeRequestStatus.PENDING,
          },
          {
            status: ChangeRequestStatus.REJECTED,
            reviewedBy: new Types.ObjectId(adminId),
            reviewedAt: new Date(),
            adminNotes: "Auto-rejected: event was deleted via another request",
          },
        );
        message = "Delete request approved and event has been removed";
      }
    } else {
      message = "Change request rejected";
    }

    // Re-populate for the response
    const populated = await this.changeRequestModel
      .findById(requestId)
      .populate("event", "name location startDate endDate status")
      .populate("requestedBy", "username firstName lastName email")
      .populate("reviewedBy", "username firstName lastName")
      .exec();

    return { changeRequest: populated, message };
  }

  /**
   * Get event statistics
   */
  async getStats(): Promise<any> {
    const total = await this.eventModel.countDocuments();
    const pending = await this.eventModel.countDocuments({
      status: EventStatus.PENDING,
    });
    const approved = await this.eventModel.countDocuments({
      status: EventStatus.APPROVED,
    });
    const completed = await this.eventModel.countDocuments({
      status: EventStatus.COMPLETED,
    });
    const rejected = await this.eventModel.countDocuments({
      status: EventStatus.REJECTED,
    });

    const pendingChangeRequests = await this.changeRequestModel.countDocuments({
      status: ChangeRequestStatus.PENDING,
    });

    return {
      total,
      pending,
      approved,
      completed,
      rejected,
      pendingChangeRequests,
    };
  }
}
