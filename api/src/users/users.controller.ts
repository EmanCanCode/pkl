import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  ForbiddenException,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CreateUserDto } from "./dto/create-user.dto";
import { UserType } from "./user.schema";

// Protected username that cannot be modified or deleted
const SUPER_ADMIN_USERNAME = "eman";

@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(private usersService: UsersService) { }

  @Post("signup")
  @ApiOperation({
    summary: "Register a new user (player, operator, or sponsor)",
  })
  @ApiResponse({ status: 201, description: "User successfully created" })
  @ApiResponse({
    status: 400,
    description: "Bad request - invalid data or admin type not allowed",
  })
  @ApiResponse({ status: 409, description: "Username or email already exists" })
  async signup(@Body() createUserDto: CreateUserDto) {
    // Prevent admin creation through signup endpoint
    if (createUserDto.userType === UserType.ADMIN) {
      throw new BadRequestException(
        "Admin accounts cannot be created through signup",
      );
    }

    const user = await this.usersService.create(createUserDto);
    const { password, ...result } = user.toObject();
    return result;
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Get all users (requires authentication)" })
  @ApiResponse({ status: 200, description: "List of all users" })
  @ApiResponse({ status: 401, description: "Unauthorized" })
  async findAll() {
    return this.usersService.findAll();
  }

  @Get("players")
  @ApiOperation({ summary: "Get all players" })
  @ApiResponse({ status: 200, description: "List of all players" })
  async findPlayers() {
    return this.usersService.findByUserType(UserType.PLAYER);
  }

  @Get("operators")
  @ApiOperation({ summary: "Get all operators" })
  @ApiResponse({ status: 200, description: "List of all operators" })
  async findOperators() {
    return this.usersService.findByUserType(UserType.OPERATOR);
  }

  @Get("sponsors")
  @ApiOperation({ summary: "Get all sponsors" })
  @ApiResponse({ status: 200, description: "List of all sponsors" })
  async findSponsors() {
    return this.usersService.findByUserType(UserType.SPONSOR);
  }

  /**
   * Admin Management Endpoints (admin only)
   */

  @Get("admins")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Get all admin users (admin only)" })
  @ApiResponse({ status: 200, description: "List of all admins" })
  async findAdmins(@Request() req) {
    if (req.user.userType !== UserType.ADMIN) {
      throw new ForbiddenException("Admin access required");
    }
    return this.usersService.findByUserType(UserType.ADMIN);
  }

  @Post("admins")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Create a new admin user (admin only)" })
  @ApiResponse({ status: 201, description: "Admin created successfully" })
  async createAdmin(@Body() createUserDto: CreateUserDto, @Request() req) {
    if (req.user.userType !== UserType.ADMIN) {
      throw new ForbiddenException("Admin access required");
    }

    // Force userType to admin
    const adminDto = { ...createUserDto, userType: UserType.ADMIN };
    const user = await this.usersService.create(adminDto);
    const { password, ...result } = user.toObject();
    return result;
  }

  @Patch("admins/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Update an admin user (admin only)" })
  @ApiResponse({ status: 200, description: "Admin updated successfully" })
  async updateAdmin(
    @Param("id") id: string,
    @Body() updateData: Partial<CreateUserDto>,
    @Request() req,
  ) {
    if (req.user.userType !== UserType.ADMIN) {
      throw new ForbiddenException("Admin access required");
    }

    // Check if trying to modify super admin
    const targetUser = await this.usersService.findById(id);
    if (!targetUser) {
      throw new BadRequestException("User not found");
    }

    if (targetUser.username === SUPER_ADMIN_USERNAME) {
      throw new ForbiddenException("Cannot modify the super admin account");
    }

    // Don't allow changing userType
    delete updateData.userType;
    delete updateData.password; // Password changes should go through separate endpoint

    const updated = await this.usersService.updateUser(id, updateData);
    const { password, ...result } = updated.toObject();
    return result;
  }

  @Delete("admins/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({ summary: "Delete an admin user (admin only)" })
  @ApiResponse({ status: 200, description: "Admin deleted successfully" })
  async deleteAdmin(@Param("id") id: string, @Request() req) {
    if (req.user.userType !== UserType.ADMIN) {
      throw new ForbiddenException("Admin access required");
    }

    // Check if trying to delete super admin
    const targetUser = await this.usersService.findById(id);
    if (!targetUser) {
      throw new BadRequestException("User not found");
    }

    if (targetUser.username === SUPER_ADMIN_USERNAME) {
      throw new ForbiddenException("Cannot delete the super admin account");
    }

    // Don't allow self-deletion
    if (targetUser._id.toString() === req.user.userId) {
      throw new ForbiddenException("Cannot delete your own account");
    }

    await this.usersService.deleteUser(id);
    return { message: "Admin deleted successfully" };
  }

  /**
   * Fee-Pass Management (admin only)
   * Grant membership or event-fee passes so users can bypass Stripe.
   */

  @Patch(":id/passes")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({
    summary:
      "Grant fee passes to a user (admin only). membershipPasses bypass annual membership. eventFeePasses bypass event registration fee. Use -1 for infinite.",
  })
  @ApiResponse({ status: 200, description: "Passes updated" })
  async grantPasses(
    @Param("id") id: string,
    @Body() body: { membershipPasses?: number; eventFeePasses?: number },
    @Request() req,
  ) {
    if (req.user.userType !== UserType.ADMIN) {
      throw new ForbiddenException("Admin access required");
    }

    const user = await this.usersService.findById(id);
    if (!user) {
      throw new BadRequestException("User not found");
    }

    const update: any = {};
    if (body.membershipPasses !== undefined) {
      update.membershipPasses = body.membershipPasses;
    }
    if (body.eventFeePasses !== undefined) {
      update.eventFeePasses = body.eventFeePasses;
    }

    if (Object.keys(update).length === 0) {
      throw new BadRequestException(
        "Provide membershipPasses and/or eventFeePasses",
      );
    }

    const updated = await this.usersService.updateUser(id, update);
    return {
      message: "Passes updated",
      membershipPasses: updated.membershipPasses ?? 0,
      eventFeePasses: updated.eventFeePasses ?? 0,
    };
  }

  /**
   * Search users by username, email, or name (admin only)
   */
  @Get("search")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth("JWT-auth")
  @ApiOperation({
    summary: "Search users by query string (admin only)",
  })
  async searchUsers(
    @Request() req,
    @Query("q") q: string,
  ) {
    if (req.user.userType !== UserType.ADMIN) {
      throw new ForbiddenException("Admin access required");
    }

    if (!q || q.length < 2) {
      throw new BadRequestException("Query must be at least 2 characters");
    }

    return this.usersService.searchUsers(q);
  }
}
