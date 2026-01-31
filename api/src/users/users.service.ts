import { Injectable, ConflictException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument, UserType } from './user.schema';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dto/create-user.dto';

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
        return this.userModel.find().select('-password').exec();
    }

    async findByUserType(userType: UserType): Promise<UserDocument[]> {
        return this.userModel.find({ userType }).select('-password').exec();
    }

    async create(createUserDto: CreateUserDto): Promise<UserDocument> {
        // Check if username or email already exists
        const existingUser = await this.userModel.findOne({
            $or: [{ username: createUserDto.username }, { email: createUserDto.email }]
        });

        if (existingUser) {
            throw new ConflictException('Username or email already exists');
        }

        const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
        const createdUser = new this.userModel({
            ...createUserDto,
            password: hashedPassword,
        });
        return createdUser.save();
    }

    async createAdmin(username: string, password: string, email: string): Promise<UserDocument> {
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

    async validatePassword(user: UserDocument, password: string): Promise<boolean> {
        return bcrypt.compare(password, user.password);
    }
}
