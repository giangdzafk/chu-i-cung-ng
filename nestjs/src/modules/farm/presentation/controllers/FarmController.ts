import { Controller, Get, Post, Body, Param } from '@nestjs/common';
import { FarmUseCase } from '../../application/use-cases/FarmUseCase';
import { CreateBatchDto, AddFarmingLogDto } from '../../application/dtos/farm.dto';

@Controller('api/farm')
export class FarmController {
  constructor(private readonly farmUseCase: FarmUseCase) {}

  @Get('products')
  async getProducts() {
    return this.farmUseCase.getProducts();
  }

  @Get('farms/:farmerId')
  async getFarms(@Param('farmerId') farmerId: number) {
    return this.farmUseCase.getFarmsByFarmer(farmerId);
  }

  @Get('batches/:farmId')
  async getBatches(@Param('farmId') farmId: number) {
    return this.farmUseCase.getBatchesByFarm(farmId);
  }

  @Post('batches')
  async createBatch(@Body() dto: CreateBatchDto) {
    return this.farmUseCase.createBatch(dto);
  }

  @Post('logs')
  async addFarmingLog(@Body() dto: AddFarmingLogDto) {
    return this.farmUseCase.addFarmingLog(dto);
  }

  @Get('logs/:batchId')
  async getLogs(@Param('batchId') batchId: number) {
    return this.farmUseCase.getLogsByBatch(batchId);
  }
}