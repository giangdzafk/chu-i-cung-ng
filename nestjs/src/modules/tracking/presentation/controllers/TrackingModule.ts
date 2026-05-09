import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Batch } from '../../../farm/domain/entities/Batch.entity';
import { TrackingEvent } from '../../../farm/domain/entities/TrackingEvent.entity';
import { FarmingLog } from '../../../farm/domain/entities/FarmingLog.entity';
import { QualityControl } from '../../../processing/domain/entities/QualityControl.entity';
import { TrackingUseCase } from '../../application/use-cases/tracking.use-case';
import { TrackingController } from './tracking.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Batch, TrackingEvent, FarmingLog, QualityControl])],
  controllers: [TrackingController],
  providers: [TrackingUseCase],
})
export class TrackingModule {}