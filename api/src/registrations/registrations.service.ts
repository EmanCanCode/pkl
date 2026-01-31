import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Registration,
  RegistrationDocument,
  RegistrationStatus,
  PlayerCategory,
} from "./registration.schema";
import {
  CreateRegistrationDto,
  UpdateRegistrationStatusDto,
} from "./dto/registration.dto";
import {
  Tournament,
  TournamentDocument,
} from "../tournaments/tournament.schema";
import { User, UserDocument } from "../users/user.schema";

@Injectable()
export class RegistrationsService {
  constructor(
    @InjectModel(Registration.name)
    private registrationModel: Model<RegistrationDocument>,
    @InjectModel(Tournament.name)
    private tournamentModel: Model<TournamentDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async findByTournament(tournamentId: string): Promise<Registration[]> {
    return this.registrationModel
      .find({ tournament: new Types.ObjectId(tournamentId) })
      .populate("player", "username firstName lastName")
      .populate("partner", "username firstName lastName")
      .sort({ createdAt: -1 })
      .exec();
  }

  async findByPlayer(playerId: string): Promise<Registration[]> {
    return this.registrationModel
      .find({ player: new Types.ObjectId(playerId) })
      .populate("tournament")
      .sort({ createdAt: -1 })
      .exec();
  }

  async create(
    dto: CreateRegistrationDto,
    playerId: string,
  ): Promise<Registration> {
    // Verify tournament exists
    const tournament = await this.tournamentModel
      .findById(dto.tournamentId)
      .exec();
    if (!tournament) {
      throw new NotFoundException(
        `Tournament with id "${dto.tournamentId}" not found`,
      );
    }

    // Get player info
    const player = await this.userModel.findById(playerId).exec();
    if (!player) {
      throw new NotFoundException(`Player not found`);
    }

    // Check for duplicate registration
    const existing = await this.registrationModel
      .findOne({
        tournament: new Types.ObjectId(dto.tournamentId),
        player: new Types.ObjectId(playerId),
        category: dto.category,
      })
      .exec();

    if (existing) {
      throw new ConflictException(
        `You are already registered for ${dto.category} in this tournament`,
      );
    }

    // Generate initials
    const firstName = player.firstName || player.username.charAt(0);
    const lastName = player.lastName || player.username.charAt(1) || "";
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    const playerName =
      player.firstName && player.lastName
        ? `${player.firstName} ${player.lastName}`
        : player.username;

    // Handle partner for doubles
    let partnerName: string | undefined;
    if (dto.partnerId) {
      const partner = await this.userModel.findById(dto.partnerId).exec();
      if (!partner) {
        throw new NotFoundException(`Partner not found`);
      }
      partnerName =
        partner.firstName && partner.lastName
          ? `${partner.firstName} ${partner.lastName}`
          : partner.username;
    }

    const registration = new this.registrationModel({
      tournament: new Types.ObjectId(dto.tournamentId),
      player: new Types.ObjectId(playerId),
      playerInitials: initials,
      playerName,
      category: dto.category,
      partner: dto.partnerId ? new Types.ObjectId(dto.partnerId) : undefined,
      partnerName,
    });

    return registration.save();
  }

  async updateStatus(
    registrationId: string,
    dto: UpdateRegistrationStatusDto,
  ): Promise<Registration> {
    const registration = await this.registrationModel
      .findByIdAndUpdate(registrationId, { status: dto.status }, { new: true })
      .exec();

    if (!registration) {
      throw new NotFoundException(
        `Registration with id "${registrationId}" not found`,
      );
    }

    return registration;
  }

  async cancel(registrationId: string, playerId: string): Promise<void> {
    const registration = await this.registrationModel
      .findById(registrationId)
      .exec();
    if (!registration) {
      throw new NotFoundException(
        `Registration with id "${registrationId}" not found`,
      );
    }

    if (registration.player.toString() !== playerId) {
      throw new BadRequestException(
        "You can only cancel your own registrations",
      );
    }

    await this.registrationModel.findByIdAndUpdate(registrationId, {
      status: RegistrationStatus.CANCELLED,
    });
  }

  async countByTournament(tournamentId: string): Promise<number> {
    return this.registrationModel.countDocuments({
      tournament: new Types.ObjectId(tournamentId),
      status: { $ne: RegistrationStatus.CANCELLED },
    });
  }

  async getPlayerPreview(
    tournamentId: string,
    limit: number = 5,
  ): Promise<{
    players: { initials: string; name: string; category: string }[];
    total: number;
  }> {
    const [players, total] = await Promise.all([
      this.registrationModel
        .find({
          tournament: new Types.ObjectId(tournamentId),
          status: { $ne: RegistrationStatus.CANCELLED },
        })
        .limit(limit)
        .select("playerInitials playerName category")
        .exec(),
      this.countByTournament(tournamentId),
    ]);

    return {
      players: players.map((p) => ({
        initials: p.playerInitials,
        name: p.playerName,
        category: p.category,
      })),
      total,
    };
  }
}
