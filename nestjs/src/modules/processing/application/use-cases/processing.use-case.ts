import { Injectable, InternalServerErrorException, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { QualityControl, QcStatus } from '../../domain/entities/QualityControl.entity';
import { EvaluateQcDto } from '../dtos/use-cases/processing.dto';
// Import entity từ module farm sang (Vì dùng chung Database)
import { Batch, BatchStatus } from '../../../farm/domain/entities/Batch.entity';
import { TrackingEvent } from '../../../farm/domain/entities/TrackingEvent.entity';

@Injectable()
export class ProcessingUseCase {
  constructor(private dataSource: DataSource) {}

  // Lấy các lô hàng đang chờ kiểm định (đã thu hoạch)
  async getPendingBatches() {
    return this.dataSource.getRepository(Batch).find({
      where: { currentStatus: BatchStatus.HARVESTED },
    });
  }

  // Lấy các lô hàng đã qua kiểm định (để in QR code)
  async getPassedBatches() {
    return this.dataSource.getRepository(Batch).find({
      where: { currentStatus: BatchStatus.IN_PROCESSING },
    });
  }

  // Luồng đánh giá QC và lưu vết
  async evaluateQc(dto: EvaluateQcDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Lưu kết quả QC
      const qcRecord = queryRunner.manager.create(QualityControl, {
        ...dto,
        inspectedAt: new Date(),
      });
      await queryRunner.manager.save(qcRecord);

      // 2. Cập nhật trạng thái lô hàng dựa trên kết quả QC
      const newStatus = dto.status === QcStatus.PASSED ? BatchStatus.IN_PROCESSING : BatchStatus.QC_FAILED;
      await queryRunner.manager.update(Batch, dto.batchId, {
        currentStatus: newStatus,
      });

      // 3. Ghi log sự kiện cho Dòng thời gian truy xuất
      const trackingEvent = queryRunner.manager.create(TrackingEvent, {
        batchId: dto.batchId,
        actorId: dto.inspectorId,
        eventName: dto.status === QcStatus.PASSED ? '✅ Đạt kiểm định chất lượng' : '❌ Không đạt kiểm định',
        eventDescription: `Tiêu chí: ${dto.criteria}. Ghi chú: ${dto.note || 'Không có'}`,
        location: 'Nhà máy chế biến trung tâm',
      });
      await queryRunner.manager.save(trackingEvent);

      await queryRunner.commitTransaction();
      return { success: true, message: 'Đã lưu kết quả kiểm định' };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Lỗi khi đánh giá QC');
    } finally {
      await queryRunner.release();
    }
  }

  // Luồng sinh QR và đổi trạng thái thành Đóng gói
  async packageBatch(batchId: number, actorId: number) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      await queryRunner.manager.update(Batch, batchId, {
        currentStatus: BatchStatus.PACKAGED,
      });

      const trackingEvent = queryRunner.manager.create(TrackingEvent, {
        batchId: batchId,
        actorId: actorId,
        eventName: '📦 Đóng gói thành phẩm',
        eventDescription: 'Đã sinh mã QR và dán tem xuất xưởng',
        location: 'Nhà máy chế biến trung tâm',
      });
      await queryRunner.manager.save(trackingEvent);

      await queryRunner.commitTransaction();
      return { success: true };
    } catch (err) {
      await queryRunner.rollbackTransaction();
      throw new InternalServerErrorException('Lỗi khi đóng gói');
    } finally {
      await queryRunner.release();
    }
  }
  // processing.use-case.ts — thêm method này
async getPackagedBatches() {
  return this.dataSource.getRepository(Batch).find({
    where: { currentStatus: BatchStatus.PACKAGED },
    relations: ['product'],
    order: { createdAt: 'DESC' },
  });
}
}