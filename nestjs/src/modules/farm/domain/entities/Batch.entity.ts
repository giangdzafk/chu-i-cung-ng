import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './Product.entity';

export enum BatchStatus {
  PLANTED = 'PLANTED',
  HARVESTED = 'HARVESTED',
  IN_PROCESSING = 'IN_PROCESSING',
  QC_FAILED = 'QC_FAILED',
  PACKAGED = 'PACKAGED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
}

@Entity('batches')
export class Batch {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'batch_code', unique: true })
  batchCode!: string;

  @Column({ name: 'product_id' })
  productId!: number;

  @Column({ name: 'farm_id' })
  farmId!: number;

  @Column('decimal', { precision: 10, scale: 2 })
  quantity!: number;

  @Column()
  unit!: string;

  @Column({ type: 'enum', enum: BatchStatus, default: BatchStatus.PLANTED })
  currentStatus!: BatchStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  // Quan hệ với Product
  @ManyToOne(() => Product, (product) => product.batches)
  @JoinColumn({ name: 'product_id' })
  product!: Product;
}