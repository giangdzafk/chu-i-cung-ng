import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Batch } from '../../../farm/domain/entities/Batch.entity';
import { TrackingEvent } from '../../../farm/domain/entities/TrackingEvent.entity';
import { LogisticsUseCase } from '../../application/use-cases/LogicticsUseCase';
import { LogisticsController } from './LogicticsController';

@Module({
  imports: [TypeOrmModule.forFeature([Batch, TrackingEvent])],
  controllers: [LogisticsController],
  providers: [LogisticsUseCase],
})
export class LogisticsModule {}