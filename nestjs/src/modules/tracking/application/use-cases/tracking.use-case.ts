import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Batch } from '../../../farm/domain/entities/Batch.entity';
import { TrackingEvent } from '../../../farm/domain/entities/TrackingEvent.entity';
import { FarmingLog } from '../../../farm/domain/entities/FarmingLog.entity';
import { QualityControl } from '../../../processing/domain/entities/QualityControl.entity';

@Injectable()
export class TrackingUseCase {
  constructor(private dataSource: DataSource) {}

  // Lấy toàn bộ lịch sử lô hàng cho consumer xem
  async getFullHistory(batchCode: string) {
    const batch = await this.dataSource.getRepository(Batch).findOne({
      where: { batchCode },
      relations: ['product'],
    });

    if (!batch) throw new NotFoundException(`Không tìm thấy lô hàng: ${batchCode}`);

    // Kiểm định chất lượng gần nhất đạt chuẩn
    const qualityControl = await this.dataSource.getRepository(QualityControl).findOne({
      where: { batchId: batch.id, status: 'PASSED' as any },
      order: { inspectedAt: 'DESC' },
    });

    // Nhật ký canh tác
    const farmingLogs = await this.dataSource.getRepository(FarmingLog).find({
      where: { batchId: batch.id },
      order: { actionDate: 'ASC' },
    });

    // Timeline sự kiện
    const timeline = await this.dataSource.getRepository(TrackingEvent).find({
      where: { batchId: batch.id },
      order: { eventTime: 'ASC' },
    });

    return {
      batchInfo: batch,
      qualityControl: qualityControl ?? null,
      farmingLogs,
      timeline,
    };
  }

  // Ghi vị trí vận chuyển thực tế
  async simulateLocation(batchId: number, actorId: number, location: string) {
    const event = this.dataSource.getRepository(TrackingEvent).create({
      batchId,
      actorId,
      eventName: '📍 Cập nhật vị trí vận chuyển',
      eventDescription: `Lô hàng đang ở: ${location}`,
      location,
    });
    return this.dataSource.getRepository(TrackingEvent).save(event);
  }
}