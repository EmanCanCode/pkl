import { Controller, Get, Param, Query } from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from "@nestjs/swagger";
import { DashboardService } from "./dashboard.service";

@ApiTags("dashboard")
@Controller("dashboard")
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @Get("stats")
  @ApiOperation({ summary: "Get overall dashboard statistics" })
  @ApiResponse({ status: 200, description: "Dashboard statistics" })
  async getStats() {
    return this.dashboardService.getStats();
  }

  @Get("cities")
  @ApiOperation({ summary: "Search cities with tournament information" })
  @ApiQuery({
    name: "search",
    required: false,
    description: "Search by city name or code",
  })
  @ApiQuery({
    name: "country",
    required: false,
    description: "Filter by country code (e.g., US, MX)",
  })
  @ApiQuery({
    name: "status",
    required: false,
    enum: ["all", "activated", "open"],
    description: "Filter by city status",
  })
  @ApiResponse({
    status: 200,
    description: "Cities categorized by status with their tournaments",
  })
  async searchCities(
    @Query("search") search?: string,
    @Query("country") countryCode?: string,
    @Query("status") status?: "all" | "activated" | "open",
  ) {
    return this.dashboardService.searchCities({ search, countryCode, status });
  }

  @Get("cities/:id")
  @ApiOperation({ summary: "Get city details with tournaments" })
  @ApiParam({ name: "id", description: "City MongoDB ID" })
  @ApiResponse({ status: 200, description: "City with tournament details" })
  @ApiResponse({ status: 404, description: "City not found" })
  async getCityDetails(@Param("id") id: string) {
    const city = await this.dashboardService.getCityDetails(id);
    if (!city) {
      return { error: "City not found" };
    }
    return city;
  }
}
