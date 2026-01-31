import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { LocationsController } from "./locations.controller";
import { LocationsService } from "./locations.service";
import { Country, CountrySchema } from "./country.schema";
import { Region, RegionSchema } from "./region.schema";
import { City, CitySchema } from "./city.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Country.name, schema: CountrySchema },
      { name: Region.name, schema: RegionSchema },
      { name: City.name, schema: CitySchema },
    ]),
  ],
  controllers: [LocationsController],
  providers: [LocationsService],
  exports: [LocationsService, MongooseModule],
})
export class LocationsModule {}
