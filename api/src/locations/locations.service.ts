import {
  Injectable,
  NotFoundException,
  ConflictException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { Country, CountryDocument } from "./country.schema";
import { Region, RegionDocument } from "./region.schema";
import { City, CityDocument } from "./city.schema";
import {
  CreateCountryDto,
  CreateRegionDto,
  CreateCityDto,
} from "./dto/create-location.dto";

@Injectable()
export class LocationsService {
  constructor(
    @InjectModel(Country.name) private countryModel: Model<CountryDocument>,
    @InjectModel(Region.name) private regionModel: Model<RegionDocument>,
    @InjectModel(City.name) private cityModel: Model<CityDocument>,
  ) {}

  // ============ COUNTRIES ============

  async findAllCountries(): Promise<Country[]> {
    return this.countryModel.find({ isActive: true }).sort({ name: 1 }).exec();
  }

  async findCountryByCode(code: string): Promise<CountryDocument> {
    const country = await this.countryModel
      .findOne({ code: code.toLowerCase() })
      .exec();
    if (!country) {
      throw new NotFoundException(`Country with code "${code}" not found`);
    }
    return country;
  }

  async createCountry(dto: CreateCountryDto): Promise<Country> {
    const existing = await this.countryModel
      .findOne({ code: dto.code.toLowerCase() })
      .exec();
    if (existing) {
      throw new ConflictException(
        `Country with code "${dto.code}" already exists`,
      );
    }
    const country = new this.countryModel(dto);
    return country.save();
  }

  // ============ REGIONS ============

  async findRegionsByCountry(countryCode: string): Promise<Region[]> {
    return this.regionModel
      .find({ countryCode: countryCode.toLowerCase(), isActive: true })
      .sort({ name: 1 })
      .exec();
  }

  async findRegionByCode(
    code: string,
    countryCode: string,
  ): Promise<RegionDocument> {
    const region = await this.regionModel
      .findOne({
        code: code.toLowerCase(),
        countryCode: countryCode.toLowerCase(),
      })
      .exec();
    if (!region) {
      throw new NotFoundException(
        `Region with code "${code}" not found in country "${countryCode}"`,
      );
    }
    return region;
  }

  async createRegion(dto: CreateRegionDto): Promise<Region> {
    // Verify country exists
    const country = await this.findCountryByCode(dto.countryCode);

    const existing = await this.regionModel
      .findOne({
        code: dto.code.toLowerCase(),
        countryCode: dto.countryCode.toLowerCase(),
      })
      .exec();
    if (existing) {
      throw new ConflictException(
        `Region with code "${dto.code}" already exists in country "${dto.countryCode}"`,
      );
    }

    const region = new this.regionModel({
      ...dto,
      country: country._id,
    });
    return region.save();
  }

  // ============ CITIES ============

  async findCitiesByRegion(
    regionCode: string,
    countryCode?: string,
  ): Promise<City[]> {
    const query: any = { regionCode: regionCode.toLowerCase(), isActive: true };
    if (countryCode) {
      query.countryCode = countryCode.toLowerCase();
    }
    return this.cityModel.find(query).sort({ name: 1 }).exec();
  }

  async findCityByCode(
    code: string,
    regionCode: string,
  ): Promise<CityDocument> {
    const city = await this.cityModel
      .findOne({
        code: code.toLowerCase(),
        regionCode: regionCode.toLowerCase(),
      })
      .exec();
    if (!city) {
      throw new NotFoundException(
        `City with code "${code}" not found in region "${regionCode}"`,
      );
    }
    return city;
  }

  async findCityById(id: string): Promise<CityDocument> {
    const city = await this.cityModel.findById(id).exec();
    if (!city) {
      throw new NotFoundException(`City with id "${id}" not found`);
    }
    return city;
  }

  async createCity(dto: CreateCityDto): Promise<City> {
    // Verify country and region exist
    const country = await this.findCountryByCode(dto.countryCode);
    const region = await this.findRegionByCode(dto.regionCode, dto.countryCode);

    const existing = await this.cityModel
      .findOne({
        code: dto.code.toLowerCase(),
        regionCode: dto.regionCode.toLowerCase(),
      })
      .exec();
    if (existing) {
      throw new ConflictException(
        `City with code "${dto.code}" already exists in region "${dto.regionCode}"`,
      );
    }

    const city = new this.cityModel({
      ...dto,
      country: country._id,
      region: region._id,
    });
    return city.save();
  }

  async updateCityStatus(cityId: string, status: string): Promise<City> {
    const city = await this.cityModel
      .findByIdAndUpdate(cityId, { status }, { new: true })
      .exec();
    if (!city) {
      throw new NotFoundException(`City with id "${cityId}" not found`);
    }
    return city;
  }

  // ============ SEARCH ============

  async searchCities(filters: {
    country?: string;
    region?: string;
    city?: string;
  }): Promise<{
    activated: City[];
    open: City[];
  }> {
    const query: any = { isActive: true };

    if (filters.country) {
      query.countryCode = filters.country.toLowerCase();
    }
    if (filters.region) {
      query.regionCode = filters.region.toLowerCase();
    }
    if (filters.city) {
      query.code = filters.city.toLowerCase();
    }

    const cities = await this.cityModel.find(query).sort({ name: 1 }).exec();

    return {
      activated: cities.filter((c) => c.status === "activated"),
      open: cities.filter((c) => c.status === "open"),
    };
  }
}
