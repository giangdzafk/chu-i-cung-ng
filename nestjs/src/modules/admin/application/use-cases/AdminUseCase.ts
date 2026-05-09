import { Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { DataSource } from 'typeorm';
import { Batch } from '../../../farm/domain/entities/Batch.entity';
import { Farm } from '../../../farm/domain/entities/Farm.entity';
import { Product } from '../../../farm/domain/entities/Product.entity';
import { TrackingEvent } from '../../../farm/domain/entities/TrackingEvent.entity';
import { User } from '../../../identity/domain/entities/User.entity';

@Injectable()
export class AdminUseCase {
  constructor(private dataSource: DataSource) {}

  // ── Tổng quan ──────────────────────────────────────────────────────────
  async getOverview() {
    const users    = await this.dataSource.getRepository(User).find();
    const batches  = await this.dataSource.getRepository(Batch).find();
    const farms    = await this.dataSource.getRepository(Farm).count();
    const products = await this.dataSource.getRepository(Product).count();

    const byRole: Record<string, number> = {};
    users.forEach(u => { byRole[u.role] = (byRole[u.role] ?? 0) + 1; });

    const byStatus: Record<string, number> = {};
    batches.forEach(b => { byStatus[b.currentStatus] = (byStatus[b.currentStatus] ?? 0) + 1; });

    const events = await this.dataSource.getRepository(TrackingEvent).find({
      order: { eventTime: 'DESC' }, take: 10,
    });

    // Lấy batchCode từ bảng batches
    const batchIds  = [...new Set(events.map(e => e.batchId))];
    const batchList = batchIds.length > 0
      ? await this.dataSource.getRepository(Batch).findByIds(batchIds)
      : [];
    const batchMap  = Object.fromEntries(batchList.map(b => [b.id, b.batchCode]));

    return {
      users:    { total: users.length, byRole },
      batches:  { total: batches.length, byStatus },
      farms:    { total: farms },
      products: { total: products },
      recentEvents: events.map(e => ({
        batchCode:   batchMap[e.batchId] ?? `#${e.batchId}`,
        eventName:   e.eventName,
        eventTime:   e.eventTime,
        location:    e.location,
      })),
    };
  }

  // ── Người dùng ──────────────────────────────────────────────────────────
  async getUsers() {
    return this.dataSource.getRepository(User).find({ order: { id: 'ASC' } });
  }

  async createUser(dto: {
    fullName: string; email: string; password: string;
    role: string; phoneNumber?: string;
  }) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.dataSource.getRepository(User).create({
      fullName:     dto.fullName,
      email:        dto.email,
      passwordHash,
      role:         dto.role as any,
      isActive:     true,
    });
    return this.dataSource.getRepository(User).save(user);
  }

  async toggleUserActive(id: number, isActive: boolean) {
    await this.dataSource.getRepository(User).update(id, { isActive });
    return { success: true };
  }

  // ── Nông sản ────────────────────────────────────────────────────────────
  async getProducts() {
    return this.dataSource.getRepository(Product).find({ order: { category: 'ASC', name: 'ASC' } });
  }

  async createProduct(dto: { name: string; description?: string; category?: string }) {
    const product = this.dataSource.getRepository(Product).create(dto);
    return this.dataSource.getRepository(Product).save(product);
  }

  async updateProduct(id: number, dto: { name?: string; description?: string; category?: string }) {
    const product = await this.dataSource.getRepository(Product).findOne({ where: { id } });
    if (!product) throw new NotFoundException('Không tìm thấy nông sản');
    Object.assign(product, dto);
    return this.dataSource.getRepository(Product).save(product);
  }

  // ── Nông trại ───────────────────────────────────────────────────────────
  async getFarms() {
    return this.dataSource.getRepository(Farm).find({ order: { id: 'ASC' } });
  }

  async createFarm(dto: {
    farmerId: number; name: string; address: string;
    coordinates?: string; areaSize?: number;
  }) {
    const farm = this.dataSource.getRepository(Farm).create(dto);
    return this.dataSource.getRepository(Farm).save(farm);
  }
}