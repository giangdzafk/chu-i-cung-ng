import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './domain/entities/User.entity';
import { UserRepository } from './infrastructure/repositories/UserRepository';
import { LoginUseCase } from './application/use-cases/LoginUseCase';
import { RegisterUseCase } from './application/use-cases/register.usecase';
import { IdentityController } from './identity.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User])],
  controllers: [IdentityController], // Đăng ký Controller
  providers: [
    UserRepository,
    LoginUseCase,
    RegisterUseCase, 
  ],
})
export class IdentityModule {}