import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../domain/entities/User.entity';

@Injectable()
export class UserRepository {
  constructor(
    // Inject (tiêm) Repository của TypeORM dành riêng cho Entity User vào đây
    @InjectRepository(User)
    private readonly ormRepository: Repository<User>,
  ) {}

  /**
   * Hàm tìm kiếm người dùng theo địa chỉ email
   * Trả về thông tin User nếu tìm thấy, hoặc trả về null nếu không tồn tại
   */
  async findByEmail(email: string): Promise<User | null> {
    return this.ormRepository.findOne({ 
      where: { email } 
    });
  }
}