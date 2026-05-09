import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { QualityControl } from '../../domain/entities/QualityControl.entity';
import { ProcessingUseCase } from '../../application/use-cases/processing.use-case';
import { ProcessingController } from '../../presentation/controllers/processing.controller';

@Module({
  imports: [TypeOrmModule.forFeature([QualityControl])],
  controllers: [ProcessingController],
  providers: [ProcessingUseCase],
})
export class ProcessingModule {}