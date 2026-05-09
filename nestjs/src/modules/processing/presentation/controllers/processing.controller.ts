import { Controller, Get, Post, Body, Param, Put } from '@nestjs/common';
import { ProcessingUseCase } from '../../application/use-cases/processing.use-case';
import { EvaluateQcDto } from '../../application/dtos/use-cases/processing.dto';

@Controller('api/processing')
export class ProcessingController {
  constructor(private readonly processingUseCase: ProcessingUseCase) {}

  @Get('pending')
  async getPending() {
    return this.processingUseCase.getPendingBatches();
  }

  @Get('passed')
  async getPassed() {
    return this.processingUseCase.getPassedBatches();
  }

  @Post('qc')
  async evaluateQc(@Body() dto: EvaluateQcDto) {
    return this.processingUseCase.evaluateQc(dto);
  }

  @Put('package/:batchId')
  async packageBatch(@Param('batchId') batchId: number, @Body('actorId') actorId: number) {
    return this.processingUseCase.packageBatch(batchId, actorId);
  }
  // processing.controller.ts — thêm route này
@Get('packaged')
async getPackaged() {
  return this.processingUseCase.getPackagedBatches();
}
}