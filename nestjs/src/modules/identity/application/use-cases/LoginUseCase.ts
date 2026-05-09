import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { UserRepository } from '../../infrastructure/repositories/UserRepository';
import { LoginDto } from '../dtos/login.dto';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly configService: ConfigService,
  ) {}

  async execute(dto: LoginDto) {
    // 1. Tìm user trong Database theo Email
    const user = await this.userRepository.findByEmail(dto.email);
    
    // Nếu không tìm thấy email, báo lỗi bảo mật chung (không nên báo cụ thể email sai hay pass sai)
    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // 2. So sánh mật khẩu người dùng nhập với mật khẩu đã băm (hash) trong DB
    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // 3. Nếu mọi thứ khớp, tiến hành tạo chuỗi Token (JWT)
    const payload = { 
      sub: user.id, 
      email: user.email, 
      role: user.role 
    };

    // Lấy chuỗi bí mật từ file .env
    const secret = this.configService.get<string>('JWT_SECRET') || 'default_secret';

    // Tạo token có thời hạn 1 ngày (1d)
    const token = jwt.sign(payload, secret, { expiresIn: '1d' });

    // Trả về cho Frontend
    return {
      accessToken: token,
      user: {
        id: user.id,
        fullName: user.fullName,
        role: user.role
      }
    };
  }
}