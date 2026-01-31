import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsEmail, MinLength, IsEnum, IsOptional } from 'class-validator';
import { UserType } from '../user.schema';

export class CreateUserDto {
    @ApiProperty({ example: 'johndoe', description: 'Username' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ example: 'john@example.com', description: 'Email address' })
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @ApiProperty({ example: 'SecurePass123', description: 'Password (min 6 characters)' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;

    @ApiProperty({ example: 'player', description: 'User type', enum: ['player', 'operator', 'sponsor'] })
    @IsEnum(UserType, { message: 'userType must be one of: player, operator, sponsor' })
    @IsNotEmpty()
    userType: UserType;

    @ApiProperty({ example: 'John', description: 'First name', required: false })
    @IsString()
    @IsOptional()
    firstName?: string;

    @ApiProperty({ example: 'Doe', description: 'Last name', required: false })
    @IsString()
    @IsOptional()
    lastName?: string;

    @ApiProperty({ example: '+1234567890', description: 'Phone number', required: false })
    @IsString()
    @IsOptional()
    phone?: string;
}
