import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { TrackingUseCase } from '../../application/use-cases/tracking.use-case';

@Controller('api/tracking')
export class TrackingController {
  constructor(private readonly trackingUseCase: TrackingUseCase) {}

  @Get(':batchCode')
  async getHistory(@Param('batchCode') batchCode: string) {
    return this.trackingUseCase.getFullHistory(batchCode);
  }

  @Post('simulate')
  async simulate(@Body() dto: { batchId: number, actorId: number, location: string }) {
    return this.trackingUseCase.simulateLocation(dto.batchId, dto.actorId, dto.location);
  }
}