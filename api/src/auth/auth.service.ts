import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

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
      username: user.username,
      role: user.userType,
    };
  }
}
