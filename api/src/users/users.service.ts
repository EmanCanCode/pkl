import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { User, UserDocument, UserType } from "./user.schema";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";
import { CreateUserDto } from "./dto/create-user.dto";

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) { }

  async findOne(username: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ username }).exec();
  }

  async findByEmail(email: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ email }).exec();
  }

  async findById(id: string): Promise<UserDocument | null> {
    return this.userModel.findById(id).exec();
  }

  async findAll(): Promise<UserDocument[]> {
    return this.userModel.find().select("-password").exec();
  }

  async findByUserType(userType: UserType): Promise<UserDocument[]> {
    return this.userModel.find({ userType }).select("-password").exec();
  }

  async create(createUserDto: CreateUserDto): Promise<UserDocument> {
    // Check if username or email already exists
    const existingUser = await this.userModel.findOne({
      $or: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    });

    if (existingUser) {
      throw new ConflictException("Username or email already exists");
    }

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    // Explicitly destructure to avoid including plain password from DTO spread
    const { username, email, userType, firstName, lastName, phone } =
      createUserDto;
    const createdUser = new this.userModel({
      username,
      email,
      userType,
      firstName,
      lastName,
      phone,
      password: hashedPassword,
    });
    return createdUser.save();
  }

  async createAdmin(
    username: string,
    password: string,
    email: string,
  ): Promise<UserDocument> {
    const hashedPassword = await bcrypt.hash(password, 10);
    const createdUser = new this.userModel({
      username,
      password: hashedPassword,
      email,
      userType: UserType.ADMIN,
      isActive: true,
    });
    return createdUser.save();
  }

  async updateUser(
    id: string,
    updateData: Partial<CreateUserDto>,
  ): Promise<UserDocument> {
    // If updating email or username, check for conflicts
    if (updateData.email || updateData.username) {
      const existingUser = await this.userModel.findOne({
        _id: { $ne: id },
        $or: [
          ...(updateData.username ? [{ username: updateData.username }] : []),
          ...(updateData.email ? [{ email: updateData.email }] : []),
        ],
      });

      if (existingUser) {
        throw new ConflictException("Username or email already exists");
      }
    }

    return this.userModel
      .findByIdAndUpdate(id, { $set: updateData }, { new: true })
      .select("-password")
      .exec();
  }

  async updatePassword(id: string, newPassword: string): Promise<void> {
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await this.userModel
      .findByIdAndUpdate(id, { password: hashedPassword })
      .exec();
  }

  async deleteUser(id: string): Promise<void> {
    await this.userModel.findByIdAndDelete(id).exec();
  }

  async validatePassword(
    user: UserDocument,
    password: string,
  ): Promise<boolean> {
    return bcrypt.compare(password, user.password);
  }

  async searchUsers(query: string): Promise<UserDocument[]> {
    const regex = new RegExp(query, "i");
    return this.userModel
      .find({
        $or: [
          { username: regex },
          { email: regex },
          { firstName: regex },
          { lastName: regex },
        ],
      })
      .select("-password")
      .limit(20)
      .exec();
  }

  async generateResetToken(
    emailOrUsername: string,
  ): Promise<{ user: UserDocument; token: string } | null> {
    // Find by email or username
    const user = await this.userModel
      .findOne({
        $or: [{ email: emailOrUsername }, { username: emailOrUsername }],
      })
      .exec();

    if (!user) return null;

    const token = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    user.resetToken = hashedToken;
    user.resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    return { user, token }; // return unhashed token for the email link
  }

  async resetPasswordWithToken(
    token: string,
    newPassword: string,
  ): Promise<void> {
    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await this.userModel
      .findOne({
        resetToken: hashedToken,
        resetTokenExpires: { $gt: new Date() },
      })
      .exec();

    if (!user) {
      throw new BadRequestException("Invalid or expired reset token");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetToken = undefined;
    user.resetTokenExpires = undefined;
    await user.save();
  }
}
