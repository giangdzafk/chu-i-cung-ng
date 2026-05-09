import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum ActionType {
  // Thực vật
  SEEDING     = 'SEEDING',
  WATERING    = 'WATERING',
  FERTILIZING = 'FERTILIZING',
  PESTICIDE   = 'PESTICIDE',
  HARVESTING  = 'HARVESTING',
  // Động vật
  FEEDING          = 'FEEDING',
  VACCINATION      = 'VACCINATION',
  HEALTH_CHECK     = 'HEALTH_CHECK',
  BREEDING         = 'BREEDING',
  SLAUGHTER        = 'SLAUGHTER',
  // Thủy sản
  WATER_QUALITY_CHECK = 'WATER_QUALITY_CHECK',
  STOCKING            = 'STOCKING',
  DISEASE_TREATMENT   = 'DISEASE_TREATMENT',
  WATER_CHANGE        = 'WATER_CHANGE',
  FISHING             = 'FISHING',
}

@Entity('farming_logs')
export class FarmingLog {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'batch_id' })
  batchId!: number;

  @Column({ name: 'farmer_id' })
  farmerId!: number;

  @Column({ type: 'enum', enum: ActionType })
  actionType!: ActionType;

  @Column({ type: 'text', nullable: true })
  description!: string;

  @Column({ name: 'action_date', type: 'timestamp' })
  actionDate!: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}