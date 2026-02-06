import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Event, EventDocument, EventStatus } from "./event.schema";
import { CreateEventDto } from "./dto/create-event.dto";
import { SetWinnerDto } from "./dto/set-winner.dto";
import { ReviewEventDto } from "./dto/review-event.dto";
import { RegisterPlayerDto } from "./dto/register-player.dto";
import { UserType } from "../users/user.schema";

@Injectable()
export class EventsService {
  constructor(
    @InjectModel(Event.name) private eventModel: Model<EventDocument>,
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
    return event.save();
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
   * Get approved events (for public display like World Series)
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

    return query.exec();
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
    });

    return event.save();
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

    return { total, pending, approved, completed, rejected };
  }
}
