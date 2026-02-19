import {
    Controller,
    Post,
    Get,
    Body,
    Req,
    Res,
    Headers,
    UseGuards,
    RawBodyRequest,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiBody, ApiResponse } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { PaymentsService } from './payments.service';
import { StripeService } from './stripe.service';

class CheckoutDto {
    successUrl: string;
    cancelUrl: string;
}

class TournamentCheckoutDto extends CheckoutDto {
    tournamentId: string;
    registrationId: string;
}

class EventCheckoutDto extends CheckoutDto {
    eventId: string;
}

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
    constructor(
        private paymentsService: PaymentsService,
        private stripeService: StripeService,
    ) { }

    @Post('membership/checkout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create membership checkout session' })
    @ApiBody({ type: CheckoutDto })
    @ApiResponse({ status: 200, description: 'Returns Stripe checkout session' })
    async createMembershipCheckout(
        @Req() req: any,
        @Body() body: CheckoutDto,
    ) {
        const userId = req.user.userId;
        return this.paymentsService.createMembershipCheckout(
            userId,
            body.successUrl,
            body.cancelUrl,
        );
    }

    @Post('tournament/checkout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create tournament registration checkout (requires active membership)' })
    @ApiBody({ type: TournamentCheckoutDto })
    @ApiResponse({ status: 200, description: 'Returns Stripe checkout session' })
    @ApiResponse({ status: 403, description: 'Active membership required' })
    async createTournamentCheckout(
        @Req() req: any,
        @Body() body: TournamentCheckoutDto,
    ) {
        const userId = req.user.userId;
        return this.paymentsService.createTournamentCheckout(
            userId,
            body.tournamentId,
            body.registrationId,
            body.successUrl,
            body.cancelUrl,
        );
    }

    @Post('event/checkout')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create event registration checkout (requires active membership)' })
    @ApiBody({ type: EventCheckoutDto })
    @ApiResponse({ status: 200, description: 'Returns Stripe checkout session' })
    @ApiResponse({ status: 403, description: 'Active membership required' })
    async createEventCheckout(
        @Req() req: any,
        @Body() body: EventCheckoutDto,
    ) {
        const userId = req.user.userId;
        return this.paymentsService.createEventCheckout(
            userId,
            body.eventId,
            body.successUrl,
            body.cancelUrl,
        );
    }

    @Get('membership/status')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get current membership status' })
    async getMembershipStatus(@Req() req: any) {
        return this.paymentsService.getMembershipStatus(req.user.userId);
    }

    @Get('history')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get payment history' })
    async getPaymentHistory(@Req() req: any) {
        return this.paymentsService.getPaymentHistory(req.user.userId);
    }

    @Post('webhook')
    @ApiOperation({ summary: 'Stripe webhook endpoint' })
    async handleWebhook(
        @Req() req: RawBodyRequest<Request>,
        @Res() res: Response,
        @Headers('stripe-signature') signature: string,
    ) {
        if (!req.rawBody) {
            return res.status(HttpStatus.BAD_REQUEST).json({ error: 'Missing raw body' });
        }

        try {
            const event = this.stripeService.constructWebhookEvent(req.rawBody, signature);
            await this.paymentsService.handleWebhook(event);
            return res.status(HttpStatus.OK).json({ received: true });
        } catch (err: any) {
            console.error('Webhook error:', err.message);
            return res.status(HttpStatus.BAD_REQUEST).json({ error: err.message });
        }
    }
}
