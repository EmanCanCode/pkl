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
} from "@nestjs/common";
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiBody,
  ApiResponse,
} from "@nestjs/swagger";
import { Request, Response } from "express";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { PaymentsService } from "./payments.service";
import { StripeService } from "./stripe.service";

class CheckoutDto {
  successUrl: string;
  cancelUrl: string;
}

class EventRegisterDto {
  eventId: string;
  gameTypes?: string[];
}

class EventFeeCheckoutDto {
  eventId: string;
  gameTypes: string[];
  successUrl: string;
  cancelUrl: string;
}

@ApiTags("payments")
@Controller("payments")
export class PaymentsController {
  constructor(
    private paymentsService: PaymentsService,
    private stripeService: StripeService,
  ) {}

  @Post("membership/checkout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create membership checkout session" })
  @ApiBody({ type: CheckoutDto })
  @ApiResponse({ status: 200, description: "Returns Stripe checkout session" })
  async createMembershipCheckout(@Req() req: any, @Body() body: CheckoutDto) {
    const userId = req.user.userId;
    return this.paymentsService.createMembershipCheckout(
      userId,
      body.successUrl,
      body.cancelUrl,
    );
  }

  @Post("membership/verify")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Verify a membership checkout session and activate if paid (fallback for webhook)",
  })
  @ApiResponse({ status: 200, description: "Returns activation status" })
  async verifyMembershipSession(
    @Req() req: any,
    @Body() body: { sessionId: string },
  ) {
    return this.paymentsService.verifyMembershipSession(
      req.user.userId,
      body.sessionId,
    );
  }

  @Post("event/register")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Register for an event (requires active membership, no event fee)",
  })
  @ApiBody({ type: EventRegisterDto })
  @ApiResponse({ status: 200, description: "Player registered to event" })
  @ApiResponse({ status: 403, description: "Active membership required" })
  async registerForEvent(@Req() req: any, @Body() body: EventRegisterDto) {
    const userId = req.user.userId;
    return this.paymentsService.registerForEvent(
      userId,
      body.eventId,
      body.gameTypes,
    );
  }

  @Post("event/fee-checkout")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: "Create Stripe checkout for event entry fee (one-time payment)",
  })
  @ApiBody({ type: EventFeeCheckoutDto })
  @ApiResponse({
    status: 200,
    description: "Returns Stripe checkout session",
  })
  @ApiResponse({ status: 403, description: "Active membership required" })
  async createEventFeeCheckout(
    @Req() req: any,
    @Body() body: EventFeeCheckoutDto,
  ) {
    return this.paymentsService.createEventFeeCheckout(
      req.user.userId,
      body.eventId,
      body.gameTypes,
      body.successUrl,
      body.cancelUrl,
    );
  }

  @Post("event/fee-verify")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      "Verify event fee checkout and register player if paid (webhook fallback)",
  })
  @ApiResponse({
    status: 200,
    description: "Returns registration status",
  })
  async verifyEventFeeSession(
    @Req() req: any,
    @Body() body: { sessionId: string },
  ) {
    return this.paymentsService.verifyEventFeeSession(
      req.user.userId,
      body.sessionId,
    );
  }

  @Get("membership/status")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get current membership status" })
  async getMembershipStatus(@Req() req: any) {
    return this.paymentsService.getMembershipStatus(req.user.userId);
  }

  @Get("history")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get payment history" })
  async getPaymentHistory(@Req() req: any) {
    return this.paymentsService.getPaymentHistory(req.user.userId);
  }

  @Post("webhook")
  @ApiOperation({ summary: "Stripe webhook endpoint" })
  async handleWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Res() res: Response,
    @Headers("stripe-signature") signature: string,
  ) {
    if (!req.rawBody) {
      return res
        .status(HttpStatus.BAD_REQUEST)
        .json({ error: "Missing raw body" });
    }

    try {
      const event = this.stripeService.constructWebhookEvent(
        req.rawBody,
        signature,
      );
      await this.paymentsService.handleWebhook(event);
      return res.status(HttpStatus.OK).json({ received: true });
    } catch (err: any) {
      console.error("Webhook error:", err.message);
      return res.status(HttpStatus.BAD_REQUEST).json({ error: err.message });
    }
  }
}
