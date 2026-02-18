import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';
import { User, UserSchema } from '../users/user.schema';
import { Payment, PaymentSchema } from './payment.schema';
import { Event, EventSchema } from '../events/event.schema';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: User.name, schema: UserSchema },
            { name: Payment.name, schema: PaymentSchema },
            { name: Event.name, schema: EventSchema },
        ]),
    ],
    controllers: [PaymentsController],
    providers: [PaymentsService, StripeService],
    exports: [PaymentsService, StripeService],
})
export class PaymentsModule { }
