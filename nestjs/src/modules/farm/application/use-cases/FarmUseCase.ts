import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Batch, BatchStatus } from '../../domain/entities/Batch.entity';
import { FarmingLog, ActionType } from '../../domain/entities/FarmingLog.entity';
import { TrackingEvent } from '../../domain/entities/TrackingEvent.entity';
import { Product } from '../../domain/entities/Product.entity';
import { Farm } from '../../domain/entities/Farm.entity';
import { CreateBatchDto, AddFarmingLogDto } from '../dtos/farm.dto';

@Injectable()
export class FarmUseCase {
  constructor(private dataSource: DataSource) {}

  // Lấy danh sách sản phẩm cho dropdown
  async getProducts() {
    return this.dataSource.getRepository(Product).find({ order: { name: 'ASC' } });
  }

  // Lấy danh sách nông trại theo farmer
  async getFarmsByFarmer(farmerId: number) {
    return this.dataSource.getRepository(Farm).find({
      where: { farmerId },
      order: { createdAt: 'DESC' },
    });
  }

  // Lấy danh sách lô hàng theo farm, kèm tên sản phẩm
  async getBatchesByFarm(farmId: number) {
    return this.dataSource.getRepository(Batch).find({
      where: { farmId },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });
  }

  // Tạo lô hàng mới
  async createBatch(dto: CreateBatchDto) {
    const batchCode = `BATCH-${Date.now()}`;
    const batch = this.dataSource.getRepository(Batch).create({
      ...dto,
      batchCode,
      currentStatus: BatchStatus.PLANTED,
    });
    return this.dataSource.getRepository(Batch).save(batch);
  }

  // Ghi nhật ký canh tác
  async addFarmingLog(dto: AddFarmingLogDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const log = queryRunner.manager.create(FarmingLog, {
        batchId: dto.batchId,
        farmerId: dto.farmerId,
        actionType: dto.actionType as ActionType,
        description: dto.description,
        actionDate: new Date(),
      });
      await queryRunner.manager.save(log);

      const trackingEvent = queryRunner.manager.create(TrackingEvent, {
        batchId: dto.batchId,
        actorId: dto.farmerId,
        eventName: `Nông dân ghi nhật ký: ${dto.actionType}`,
        eventDescription: dto.description,
        location: 'Khu vực canh tác',
      });
      await queryRunner.manager.save(trackingEvent);

      if (dto.actionType === ActionType.HARVESTING) {
        await queryRunner.manager.update(Batch, dto.batchId, {
          currentStatus: BatchStatus.HARVESTED,
        });
      }

      await queryRunner.commitTransaction();
      return { success: true, message: 'Đã lưu nhật ký thành công' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Lỗi hệ thống khi lưu nhật ký');
    } finally {
      await queryRunner.release();
    }
  }

  // Lấy nhật ký theo lô hàng
  async getLogsByBatch(batchId: number) {
    return this.dataSource.getRepository(FarmingLog).find({
      where: { batchId },
      order: { actionDate: 'DESC' },
    });
  }
}