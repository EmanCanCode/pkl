import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";
import { MailService } from "../mail/mail.service";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) { }

  async validateUser(username: string, password: string): Promise<any> {
    const user = await this.usersService.findOne(username);
    if (user && (await this.usersService.validatePassword(user, password))) {
      const { password, ...result } = user.toObject();
      return result;
    }
    return null;
  }

  async login(username: string, password: string) {
    const user = await this.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const payload = {
      username: user.username,
      sub: user._id,
      userType: user.userType,
    };
    return {
      access_token: this.jwtService.sign(payload),
      userId: user._id,
      username: user.username,
      userType: user.userType,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
    };
  }

  async getProfile(userId: string) {
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new UnauthorizedException("User not found");
    }
    const { password, ...result } = user.toObject();
    return result;
  }

  async forgotPassword(emailOrUsername: string): Promise<{ message: string }> {
    const result =
      await this.usersService.generateResetToken(emailOrUsername);

    // Always return success to prevent user enumeration
    if (!result) {
      return {
        message:
          "If an account with that email/username exists, a reset link has been sent.",
      };
    }

    await this.mailService.sendPasswordResetEmail(
      result.user.email,
      result.user.username,
      result.token,
    );

    return {
      message:
        "If an account with that email/username exists, a reset link has been sent.",
    };
  }

  async resetPassword(
    token: string,
    newPassword: string,
  ): Promise<{ message: string }> {
    await this.usersService.resetPasswordWithToken(token, newPassword);
    return { message: "Password has been reset successfully." };
  }
}
