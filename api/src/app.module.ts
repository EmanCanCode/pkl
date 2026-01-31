import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';

@Module({
    imports: [
        MongooseModule.forRoot(process.env.MONGO_URI || 'mongodb://localhost:27017/pklclub'),
        AuthModule,
        UsersModule,
    ],
})
export class AppModule { }
