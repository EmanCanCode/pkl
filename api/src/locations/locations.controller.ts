import { Controller, Get, Post, Body, Param, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from "@nestjs/swagger";
import { LocationsService } from "./locations.service";
import {
  CreateCountryDto,
  CreateRegionDto,
  CreateCityDto,
} from "./dto/create-location.dto";

@ApiTags("locations")
@Controller("locations")
export class LocationsController {
  constructor(private locationsService: LocationsService) {}

  // ============ COUNTRIES ============

  @Get("countries")
  @ApiOperation({ summary: "Get all active countries" })
  @ApiResponse({ status: 200, description: "List of countries" })
  async findAllCountries() {
    return this.locationsService.findAllCountries();
  }

  @Get("countries/:code")
  @ApiOperation({ summary: "Get country by code" })
  @ApiParam({ name: "code", example: "usa" })
  @ApiResponse({ status: 200, description: "Country details" })
  @ApiResponse({ status: 404, description: "Country not found" })
  async findCountryByCode(@Param("code") code: string) {
    return this.locationsService.findCountryByCode(code);
  }

  @Get("countries/:code/regions")
  @ApiOperation({ summary: "Get all regions for a country" })
  @ApiParam({ name: "code", example: "usa" })
  @ApiResponse({ status: 200, description: "List of regions" })
  async findRegionsByCountry(@Param("code") countryCode: string) {
    return this.locationsService.findRegionsByCountry(countryCode);
  }

  @Post("countries")
  @ApiOperation({ summary: "Create a new country" })
  @ApiResponse({ status: 201, description: "Country created" })
  @ApiResponse({ status: 409, description: "Country already exists" })
  async createCountry(@Body() dto: CreateCountryDto) {
    return this.locationsService.createCountry(dto);
  }

  // ============ REGIONS ============

  @Get("regions/:code/cities")
  @ApiOperation({ summary: "Get all cities for a region" })
  @ApiParam({ name: "code", example: "florida" })
  @ApiQuery({ name: "country", required: false, example: "usa" })
  @ApiResponse({ status: 200, description: "List of cities" })
  async findCitiesByRegion(
    @Param("code") regionCode: string,
    @Query("country") countryCode?: string,
  ) {
    return this.locationsService.findCitiesByRegion(regionCode, countryCode);
  }

  @Post("regions")
  @ApiOperation({ summary: "Create a new region" })
  @ApiResponse({ status: 201, description: "Region created" })
  @ApiResponse({ status: 409, description: "Region already exists" })
  async createRegion(@Body() dto: CreateRegionDto) {
    return this.locationsService.createRegion(dto);
  }

  // ============ CITIES ============

  @Get("cities/:id")
  @ApiOperation({ summary: "Get city by ID" })
  @ApiParam({ name: "id", description: "City MongoDB ID" })
  @ApiResponse({ status: 200, description: "City details" })
  @ApiResponse({ status: 404, description: "City not found" })
  async findCityById(@Param("id") id: string) {
    return this.locationsService.findCityById(id);
  }

  @Post("cities")
  @ApiOperation({ summary: "Create a new city" })
  @ApiResponse({ status: 201, description: "City created" })
  @ApiResponse({ status: 409, description: "City already exists" })
  async createCity(@Body() dto: CreateCityDto) {
    return this.locationsService.createCity(dto);
  }

  // ============ SEARCH ============

  @Get("search/cities")
  @ApiOperation({ summary: "Search cities with filters" })
  @ApiQuery({ name: "country", required: false, example: "usa" })
  @ApiQuery({ name: "region", required: false, example: "florida" })
  @ApiQuery({ name: "city", required: false, example: "miami" })
  @ApiResponse({
    status: 200,
    description: "Filtered cities grouped by status",
  })
  async searchCities(
    @Query("country") country?: string,
    @Query("region") region?: string,
    @Query("city") city?: string,
  ) {
    return this.locationsService.searchCities({ country, region, city });
  }
}
