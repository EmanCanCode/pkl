import { Injectable, InternalServerErrorException } from "@nestjs/common";
import * as nodemailer from "nodemailer";

export interface ContactEmailDto {
  name: string;
  email: string;
  subject: string;
  phone?: string;
  message: string;
}

@Injectable()
export class MailService {
  private transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  async sendContactEmail(data: ContactEmailDto): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"PKL Club" <${process.env.GMAIL}>`,
        to: process.env.GMAIL,
        replyTo: `"${data.name}" <${data.email}>`,
        subject: `[Contact Form] ${data.subject}`,
        html: `
          <h3>New Contact Form Submission</h3>
          <p><strong>Name:</strong> ${data.name}</p>
          <p><strong>Email:</strong> ${data.email}</p>
          <p><strong>Phone:</strong> ${data.phone || "N/A"}</p>
          <p><strong>Subject:</strong> ${data.subject}</p>
          <hr/>
          <p><strong>Message:</strong></p>
          <p>${data.message.replace(/\n/g, "<br/>")}</p>
        `,
      });
    } catch (err) {
      console.error("[MailService] Failed to send email:", err);
      throw new InternalServerErrorException("Failed to send email");
    }
  }
}
