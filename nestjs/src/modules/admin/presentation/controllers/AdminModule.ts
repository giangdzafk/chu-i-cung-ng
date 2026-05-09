import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../../identity/domain/entities/User.entity';
import { Batch } from '../../../farm/domain/entities/Batch.entity';
import { Farm } from '../../../farm/domain/entities/Farm.entity';
import { Product } from '../../../farm/domain/entities/Product.entity';
import { TrackingEvent } from '../../../farm/domain/entities/TrackingEvent.entity';
import { AdminUseCase } from '../../application/use-cases/AdminUseCase';
import { AdminController } from './AdminController';

@Module({
  imports: [TypeOrmModule.forFeature([User, Batch, Farm, Product, TrackingEvent])],
  controllers: [AdminController],
  providers: [AdminUseCase],
})
export class AdminModule {}