import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "./auth/auth.module";
import { UsersModule } from "./users/users.module";
import { LocationsModule } from "./locations/locations.module";
import { TournamentsModule } from "./tournaments/tournaments.module";
import { RegistrationsModule } from "./registrations/registrations.module";
import { DashboardModule } from "./dashboard/dashboard.module";
import { EventsModule } from "./events/events.module";
import { PaymentsModule } from "./payments/payments.module";

@Module({
  imports: [
    MongooseModule.forRoot(
      process.env.MONGO_URI || "mongodb://localhost:27017/pklclub",
    ),
    AuthModule,
    UsersModule,
    LocationsModule,
    TournamentsModule,
    RegistrationsModule,
    DashboardModule,
    EventsModule,
    PaymentsModule,
  ],
})
export class AppModule { }
