import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

export enum QcStatus {
  PASSED = 'PASSED',
  FAILED = 'FAILED',
}

@Entity('quality_controls')
export class QualityControl {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'batch_id' })
  batchId!: number;

  @Column({ name: 'inspector_id' })
  inspectorId!: number;

  @Column({ type: 'enum', enum: QcStatus })
  status!: QcStatus;

  @Column()
  criteria!: string;

  @Column({ type: 'text', nullable: true })
  note!: string;

  @Column({ name: 'evidence_image_url', nullable: true })
  evidenceImageUrl!: string;

  @CreateDateColumn({ name: 'inspected_at' })
  inspectedAt!: Date;
}