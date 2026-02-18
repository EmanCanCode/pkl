import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @ApiProperty({ example: 'eman', description: 'Username' })
    @IsString()
    @IsNotEmpty()
    username: string;

    @ApiProperty({ example: 'Admin321', description: 'Password' })
    @IsString()
    @IsNotEmpty()
    @MinLength(6)
    password: string;
}

export class TokenResponseDto {
    @ApiProperty({ example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', description: 'JWT access token' })
    access_token: string;

    @ApiProperty({ example: '507f1f77bcf86cd799439011', description: 'User ID' })
    userId: string;

    @ApiProperty({ example: 'eman', description: 'Username' })
    username: string;

    @ApiProperty({ example: 'player', description: 'User type (admin, player, operator, sponsor)' })
    userType: string;

    @ApiProperty({ example: 'Eman', description: 'User first name' })
    firstName: string;

    @ApiProperty({ example: 'Doe', description: 'User last name' })
    lastName: string;

    @ApiProperty({ example: 'eman@pkl.club', description: 'Email' })
    email: string;
}
