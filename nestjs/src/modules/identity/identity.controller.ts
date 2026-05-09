import { Body, Controller, Post } from '@nestjs/common';
import { LoginUseCase } from './application/use-cases/LoginUseCase';
import { RegisterUseCase } from './application/use-cases/register.usecase';
import { LoginDto } from './application/dtos/login.dto';
import { RegisterDto } from './application/dtos/register.dto';

@Controller('identity') 
export class IdentityController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly registerUseCase: RegisterUseCase,
  ) {}

  @Post('login') 
  async login(@Body() dto: LoginDto) {
    return this.loginUseCase.execute(dto);
  }

  @Post('register') 
  async register(@Body() dto: RegisterDto) {
    return this.registerUseCase.execute(dto);
  }
}