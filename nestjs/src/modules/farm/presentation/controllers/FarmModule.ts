import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Batch } from '../../domain/entities/Batch.entity';
import { FarmingLog } from '../../domain/entities/FarmingLog.entity';
import { TrackingEvent } from '../../domain/entities/TrackingEvent.entity';
import { Product } from '../../domain/entities/Product.entity';
import { Farm } from '../../domain/entities/Farm.entity';
import { FarmUseCase } from '../../application/use-cases/FarmUseCase';
import { FarmController } from '../../presentation/controllers/FarmController';

@Module({
  imports: [TypeOrmModule.forFeature([Batch, FarmingLog, TrackingEvent, Product, Farm])],
  controllers: [FarmController],
  providers: [FarmUseCase],
})
export class FarmModule {}