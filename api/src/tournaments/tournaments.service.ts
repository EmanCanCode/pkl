import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import {
  Tournament,
  TournamentDocument,
  TournamentStatus,
} from "./tournament.schema";
import { CreateTournamentDto, UpdateTournamentDto } from "./dto/tournament.dto";
import { City, CityDocument, CityStatus } from "../locations/city.schema";

@Injectable()
export class TournamentsService {
  constructor(
    @InjectModel(Tournament.name)
    private tournamentModel: Model<TournamentDocument>,
    @InjectModel(City.name) private cityModel: Model<CityDocument>,
  ) {}

  async findAll(): Promise<Tournament[]> {
    return this.tournamentModel
      .find({ isActive: true })
      .populate("city")
      .populate("operator", "username firstName lastName")
      .sort({ "dates.start": 1 })
      .exec();
  }

  async findById(id: string): Promise<TournamentDocument> {
    const tournament = await this.tournamentModel
      .findById(id)
      .populate("city")
      .populate("operator", "username firstName lastName")
      .exec();
    if (!tournament) {
      throw new NotFoundException(`Tournament with id "${id}" not found`);
    }
    return tournament;
  }

  async findByCityCode(cityCode: string): Promise<Tournament | null> {
    return this.tournamentModel
      .findOne({ cityCode: cityCode.toLowerCase(), isActive: true })
      .populate("operator", "username firstName lastName")
      .exec();
  }

  async create(
    dto: CreateTournamentDto,
    operatorId: string,
    operatorName: string,
  ): Promise<Tournament> {
    // Find the city
    const city = await this.cityModel
      .findOne({ code: dto.cityCode.toLowerCase() })
      .exec();
    if (!city) {
      throw new NotFoundException(`City with code "${dto.cityCode}" not found`);
    }

    // Create tournament
    const tournament = new this.tournamentModel({
      name: dto.name,
      city: city._id,
      cityCode: city.code,
      operator: new Types.ObjectId(operatorId),
      operatorName,
      location: dto.location,
      dates: {
        start: new Date(dto.startDate),
        end: new Date(dto.endDate),
      },
      tournamentUrl: dto.tournamentUrl,
      schedule:
        dto.schedule?.map((s) => ({
          day: s.day,
          date: new Date(s.date),
          events: s.events,
        })) || [],
    });

    const saved = await tournament.save();

    // Update city status to activated
    await this.cityModel.findByIdAndUpdate(city._id, {
      status: CityStatus.ACTIVATED,
    });

    return saved;
  }

  async update(
    id: string,
    dto: UpdateTournamentDto,
    userId: string,
  ): Promise<Tournament> {
    const tournament = await this.tournamentModel.findById(id).exec();
    if (!tournament) {
      throw new NotFoundException(`Tournament with id "${id}" not found`);
    }

    // Check ownership
    if (tournament.operator && tournament.operator.toString() !== userId) {
      throw new ForbiddenException("You can only update your own tournaments");
    }

    const updateData: any = {};
    if (dto.name) updateData.name = dto.name;
    if (dto.location) updateData.location = dto.location;
    if (dto.startDate || dto.endDate) {
      updateData.dates = {
        start: dto.startDate ? new Date(dto.startDate) : tournament.dates.start,
        end: dto.endDate ? new Date(dto.endDate) : tournament.dates.end,
      };
    }

    return this.tournamentModel
      .findByIdAndUpdate(id, updateData, { new: true })
      .populate("city")
      .populate("operator", "username firstName lastName")
      .exec();
  }

  async delete(id: string, userId: string): Promise<void> {
    const tournament = await this.tournamentModel.findById(id).exec();
    if (!tournament) {
      throw new NotFoundException(`Tournament with id "${id}" not found`);
    }

    // Check ownership
    if (tournament.operator && tournament.operator.toString() !== userId) {
      throw new ForbiddenException("You can only delete your own tournaments");
    }

    await this.tournamentModel.findByIdAndUpdate(id, { isActive: false });

    // Update city status back to open if no other active tournaments
    const otherTournaments = await this.tournamentModel
      .findOne({
        city: tournament.city,
        _id: { $ne: id },
        isActive: true,
      })
      .exec();

    if (!otherTournaments) {
      await this.cityModel.findByIdAndUpdate(tournament.city, {
        status: CityStatus.OPEN,
      });
    }
  }

  async countByStatus(): Promise<{
    upcoming: number;
    ongoing: number;
    completed: number;
  }> {
    const [upcoming, ongoing, completed] = await Promise.all([
      this.tournamentModel.countDocuments({
        status: TournamentStatus.UPCOMING,
        isActive: true,
      }),
      this.tournamentModel.countDocuments({
        status: TournamentStatus.ONGOING,
        isActive: true,
      }),
      this.tournamentModel.countDocuments({
        status: TournamentStatus.COMPLETED,
        isActive: true,
      }),
    ]);
    return { upcoming, ongoing, completed };
  }
}
