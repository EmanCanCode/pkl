import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { City, CitySchema } from "../locations/city.schema";
import { Tournament, TournamentSchema } from "../tournaments/tournament.schema";
import {
  Registration,
  RegistrationSchema,
} from "../registrations/registration.schema";
import { User, UserSchema } from "../users/user.schema";
import { Event, EventSchema } from "../events/event.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: City.name, schema: CitySchema },
      { name: Tournament.name, schema: TournamentSchema },
      { name: Registration.name, schema: RegistrationSchema },
      { name: User.name, schema: UserSchema },
      { name: Event.name, schema: EventSchema },
    ]),
  ],
  controllers: [DashboardController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
