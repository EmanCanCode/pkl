import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { City, CityDocument, CityStatus } from "../locations/city.schema";
import {
  Tournament,
  TournamentDocument,
  TournamentStatus,
} from "../tournaments/tournament.schema";
import {
  Registration,
  RegistrationDocument,
  RegistrationStatus,
} from "../registrations/registration.schema";
import { User, UserDocument } from "../users/user.schema";

export interface DashboardStats {
  totalCities: number;
  activatedCities: number;
  openCities: number;
  totalTournaments: number;
  upcomingTournaments: number;
  totalPlayers: number;
  totalRegistrations: number;
}

export interface CityWithTournaments {
  _id: string;
  name: string;
  code: string;
  status: CityStatus;
  regionName: string;
  regionCode: string;
  countryName: string;
  countryCode: string;
  flagCode: string;
  tournaments: {
    _id: string;
    name: string;
    dates: { start: Date; end: Date };
    schedule: { day: number; date: Date; events: string[] }[];
    registeredPlayers: number;
    playerPreview: { initials: string; name: string }[];
  }[];
}

@Injectable()
export class DashboardService {
  constructor(
    @InjectModel(City.name) private cityModel: Model<CityDocument>,
    @InjectModel(Tournament.name)
    private tournamentModel: Model<TournamentDocument>,
    @InjectModel(Registration.name)
    private registrationModel: Model<RegistrationDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async getStats(): Promise<DashboardStats> {
    const [
      totalCities,
      activatedCities,
      openCities,
      totalTournaments,
      upcomingTournaments,
      totalPlayers,
      totalRegistrations,
    ] = await Promise.all([
      this.cityModel.countDocuments({ isActive: true }),
      this.cityModel.countDocuments({
        status: CityStatus.ACTIVATED,
        isActive: true,
      }),
      this.cityModel.countDocuments({
        status: CityStatus.OPEN,
        isActive: true,
      }),
      this.tournamentModel.countDocuments(),
      this.tournamentModel.countDocuments({
        "dates.start": { $gte: new Date() },
        status: { $ne: TournamentStatus.CANCELLED },
      }),
      this.userModel.countDocuments({ userType: "player" }),
      this.registrationModel.countDocuments({
        status: { $ne: RegistrationStatus.CANCELLED },
      }),
    ]);

    return {
      totalCities,
      activatedCities,
      openCities,
      totalTournaments,
      upcomingTournaments,
      totalPlayers,
      totalRegistrations,
    };
  }

  async searchCities(options: {
    search?: string;
    countryCode?: string;
    status?: "all" | "activated" | "open";
  }): Promise<{
    activated: CityWithTournaments[];
    open: CityWithTournaments[];
  }> {
    const query: any = { isActive: true };

    if (options.search) {
      query.$or = [
        { name: { $regex: options.search, $options: "i" } },
        { code: { $regex: options.search, $options: "i" } },
      ];
    }

    if (options.countryCode) {
      // We need to find the country first
      const cities = await this.cityModel
        .find(query)
        .populate({
          path: "country",
          match: { code: options.countryCode },
        })
        .exec();

      // Filter out cities where country didn't match
      const filteredCities = cities.filter((c) => c.country !== null);
      return this.categorizeCities(filteredCities);
    }

    const cities = await this.cityModel
      .find(query)
      .populate("region", "name code")
      .populate("country", "name code flagCode")
      .sort({ name: 1 })
      .exec();

    return this.categorizeCities(cities);
  }

  private async categorizeCities(
    cities: CityDocument[],
  ): Promise<{
    activated: CityWithTournaments[];
    open: CityWithTournaments[];
  }> {
    const activated: CityWithTournaments[] = [];
    const open: CityWithTournaments[] = [];

    for (const city of cities) {
      const cityWithTournaments = await this.enrichCityWithTournaments(city);

      if (city.status === CityStatus.ACTIVATED) {
        activated.push(cityWithTournaments);
      } else if (city.status === CityStatus.OPEN) {
        open.push(cityWithTournaments);
      }
    }

    return { activated, open };
  }

  private async enrichCityWithTournaments(
    city: CityDocument,
  ): Promise<CityWithTournaments> {
    const region = city.region as any;
    const country = city.country as any;

    // Get tournaments for this city
    const tournaments = await this.tournamentModel
      .find({
        city: city._id,
        status: { $ne: TournamentStatus.CANCELLED },
      })
      .sort({ "dates.start": 1 })
      .exec();

    const enrichedTournaments = await Promise.all(
      tournaments.map(async (tournament) => {
        // Get player preview
        const registrations = await this.registrationModel
          .find({
            tournament: tournament._id,
            status: { $ne: RegistrationStatus.CANCELLED },
          })
          .limit(5)
          .select("playerInitials playerName")
          .exec();

        const totalPlayers = await this.registrationModel.countDocuments({
          tournament: tournament._id,
          status: { $ne: RegistrationStatus.CANCELLED },
        });

        return {
          _id: tournament._id.toString(),
          name: tournament.name,
          dates: tournament.dates,
          schedule: tournament.schedule.map((s) => ({
            day: s.day,
            date: s.date,
            events: s.events,
          })),
          registeredPlayers: totalPlayers,
          playerPreview: registrations.map((r) => ({
            initials: r.playerInitials,
            name: r.playerName,
          })),
        };
      }),
    );

    return {
      _id: city._id.toString(),
      name: city.name,
      code: city.code,
      status: city.status,
      regionName: region?.name || "",
      regionCode: region?.code || "",
      countryName: country?.name || "",
      countryCode: country?.code || "",
      flagCode: country?.flagCode || "",
      tournaments: enrichedTournaments,
    };
  }

  async getCityDetails(cityId: string): Promise<CityWithTournaments | null> {
    const city = await this.cityModel
      .findById(cityId)
      .populate("region", "name code")
      .populate("country", "name code flagCode")
      .exec();

    if (!city) {
      return null;
    }

    return this.enrichCityWithTournaments(city);
  }
}
