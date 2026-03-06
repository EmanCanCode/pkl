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

  async sendPasswordResetEmail(
    toEmail: string,
    username: string,
    resetToken: string,
  ): Promise<void> {
    const baseUrl =
      process.env.FRONTEND_URL ||
      (process.env.DOMAIN
        ? `https://${process.env.DOMAIN}`
        : "http://localhost:8888");
    const resetLink = `${baseUrl}/login.html?token=${resetToken}`;

    try {
      await this.transporter.sendMail({
        from: `"PKL Club" <${process.env.GMAIL}>`,
        to: toEmail,
        subject: "PKL.CLUB - Password Reset Request",
        html: `
          <div style="font-family: 'Inter', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #0a1628 0%, #2fa06f 100%); padding: 40px 30px; text-align: center;">
              <h1 style="color: #fff; margin: 0; font-size: 28px;">PKL.CLUB</h1>
              <p style="color: rgba(255,255,255,0.8); margin: 10px 0 0;">Password Reset</p>
            </div>
            <div style="padding: 40px 30px;">
              <p style="color: #333; font-size: 16px; line-height: 1.6;">Hi <strong>${username}</strong>,</p>
              <p style="color: #555; font-size: 15px; line-height: 1.6;">We received a request to reset your password. Click the button below to choose a new password:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #2fa06f 0%, #7ed957 100%); color: #fff; text-decoration: none; padding: 14px 40px; border-radius: 12px; font-size: 16px; font-weight: 600;">Reset Password</a>
              </div>
              <p style="color: #888; font-size: 13px; line-height: 1.6;">This link will expire in <strong>1 hour</strong>. If you didn't request this, you can safely ignore this email.</p>
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
              <p style="color: #aaa; font-size: 12px; text-align: center;">PKL.CLUB &mdash; The Global Pickleball Community</p>
            </div>
          </div>
        `,
      });
    } catch (err) {
      console.error("[MailService] Failed to send password reset email:", err);
      throw new InternalServerErrorException(
        "Failed to send password reset email",
      );
    }
  }
}
