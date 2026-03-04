import {
  Controller,
  Post,
  Body,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { MailService } from "./mail.service";

@Controller("contact")
export class MailController {
  constructor(private readonly mailService: MailService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  async sendContact(
    @Body()
    body: {
      name: string;
      email: string;
      subject: string;
      phone?: string;
      message: string;
    },
  ) {
    if (!body.name || !body.email || !body.subject || !body.message) {
      throw new BadRequestException(
        "Name, email, subject and message are required",
      );
    }

    await this.mailService.sendContactEmail(body);

    return {
      status: "true",
      message:
        "We have <strong>successfully</strong> received your message and will get back to you as soon as possible.",
    };
  }
}
