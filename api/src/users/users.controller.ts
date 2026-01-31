import { Controller, Get, Post, Body, Param, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { UserType } from './user.schema';

@ApiTags('users')
@Controller('users')
export class UsersController {
    constructor(private usersService: UsersService) { }

    @Post('signup')
    @ApiOperation({ summary: 'Register a new user (player, operator, or sponsor)' })
    @ApiResponse({ status: 201, description: 'User successfully created' })
    @ApiResponse({ status: 400, description: 'Bad request - invalid data or admin type not allowed' })
    @ApiResponse({ status: 409, description: 'Username or email already exists' })
    async signup(@Body() createUserDto: CreateUserDto) {
        // Prevent admin creation through signup endpoint
        if (createUserDto.userType === UserType.ADMIN) {
            throw new BadRequestException('Admin accounts cannot be created through signup');
        }

        const user = await this.usersService.create(createUserDto);
        const { password, ...result } = user.toObject();
        return result;
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all users (requires authentication)' })
    @ApiResponse({ status: 200, description: 'List of all users' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async findAll() {
        return this.usersService.findAll();
    }

    @Get('players')
    @ApiOperation({ summary: 'Get all players' })
    @ApiResponse({ status: 200, description: 'List of all players' })
    async findPlayers() {
        return this.usersService.findByUserType(UserType.PLAYER);
    }

    @Get('operators')
    @ApiOperation({ summary: 'Get all operators' })
    @ApiResponse({ status: 200, description: 'List of all operators' })
    async findOperators() {
        return this.usersService.findByUserType(UserType.OPERATOR);
    }

    @Get('sponsors')
    @ApiOperation({ summary: 'Get all sponsors' })
    @ApiResponse({ status: 200, description: 'List of all sponsors' })
    async findSponsors() {
        return this.usersService.findByUserType(UserType.SPONSOR);
    }
}
