import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { DataSource, In } from 'typeorm';
import { Batch, BatchStatus } from '../../../farm/domain/entities/Batch.entity';
import { TrackingEvent } from '../../../farm/domain/entities/TrackingEvent.entity';

@Injectable()
export class LogisticsUseCase {
  constructor(private dataSource: DataSource) {}

  async getShipmentsByDriver(driverId: number) {
    const pendingBatches = await this.dataSource.getRepository(Batch).find({
      where: { currentStatus: BatchStatus.PACKAGED },
      relations: ['product'],
      order: { createdAt: 'DESC' },
    });

    const driverEvents = await this.dataSource.getRepository(TrackingEvent).find({
      where: { actorId: driverId },
      select: ['batchId'],
    });

    const driverBatchIds = [...new Set(driverEvents.map(e => e.batchId))];
    let driverBatches: Batch[] = [];
    if (driverBatchIds.length > 0) {
      driverBatches = await this.dataSource.getRepository(Batch).find({
        where: {
          id: In(driverBatchIds),
          currentStatus: In([BatchStatus.IN_TRANSIT, BatchStatus.DELIVERED]),
        },
        relations: ['product'],
      });
    }

    return [...driverBatches, ...pendingBatches].map(b => ({
      id:           b.id,
      batchId:      b.id,
      batchCode:    b.batchCode,
      productName:  b.product?.name ?? '—',
      origin:       'Nhà máy chế biến',
      destination:  'Điểm giao hàng',
      vehicleNumber: '—',
      departedAt:   null,
      arrivedAt:    null,
      status: ({
        [BatchStatus.PACKAGED]:   'PENDING',
        [BatchStatus.IN_TRANSIT]: 'IN_TRANSIT',
        [BatchStatus.DELIVERED]:  'DELIVERED',
      } as any)[b.currentStatus] ?? 'PENDING',
    }));
  }

  async updateShipment(dto: {
    batchId: number; actorId: number; location: string;
    temperature?: number; humidity?: number; note?: string; eventName: string;
  }) {
    const desc = [
      dto.note,
      dto.temperature != null ? `Nhiệt độ: ${dto.temperature}°C` : null,
      dto.humidity    != null ? `Độ ẩm: ${dto.humidity}%` : null,
    ].filter(Boolean).join(' | ');

    const event = this.dataSource.getRepository(TrackingEvent).create({
      batchId: dto.batchId, actorId: dto.actorId,
      eventName: dto.eventName,
      eventDescription: desc || 'Cập nhật vị trí',
      location: dto.location,
    });
    return this.dataSource.getRepository(TrackingEvent).save(event);
  }

  async changeStatus(batchId: number, status: 'IN_TRANSIT' | 'DELIVERED', actorId: number) {
    const qr = this.dataSource.createQueryRunner();
    await qr.connect(); await qr.startTransaction();
    try {
      const newStatus = status === 'IN_TRANSIT' ? BatchStatus.IN_TRANSIT : BatchStatus.DELIVERED;
      await qr.manager.update(Batch, batchId, { currentStatus: newStatus });
      await qr.manager.save(TrackingEvent, qr.manager.create(TrackingEvent, {
        batchId, actorId,
        eventName: status === 'IN_TRANSIT' ? '🚛 Bắt đầu vận chuyển' : '✅ Giao hàng thành công',
        eventDescription: status === 'IN_TRANSIT'
          ? 'Lô hàng đã được bàn giao cho đơn vị vận chuyển'
          : 'Lô hàng đã đến tay người nhận',
        location: status === 'IN_TRANSIT' ? 'Kho xuất hàng' : 'Điểm giao hàng',
      }));
      await qr.commitTransaction();
      return { success: true };
    } catch { await qr.rollbackTransaction(); throw new InternalServerErrorException(); }
    finally { await qr.release(); }
  }
}