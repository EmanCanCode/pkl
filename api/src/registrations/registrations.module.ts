import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RegistrationsController } from "./registrations.controller";
import { RegistrationsService } from "./registrations.service";
import { Registration, RegistrationSchema } from "./registration.schema";
import { Tournament, TournamentSchema } from "../tournaments/tournament.schema";
import { User, UserSchema } from "../users/user.schema";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Registration.name, schema: RegistrationSchema },
      { name: Tournament.name, schema: TournamentSchema },
      { name: User.name, schema: UserSchema },
    ]),
  ],
  controllers: [RegistrationsController],
  providers: [RegistrationsService],
  exports: [RegistrationsService, MongooseModule],
})
export class RegistrationsModule {}
