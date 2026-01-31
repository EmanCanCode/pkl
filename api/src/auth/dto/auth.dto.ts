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

    @ApiProperty({ example: 'eman', description: 'Username' })
    username: string;

    @ApiProperty({ example: 'admin', description: 'User role' })
    role: string;
}
