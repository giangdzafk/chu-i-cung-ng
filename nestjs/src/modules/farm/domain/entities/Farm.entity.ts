import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('farms')
export class Farm {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'farmer_id' })
  farmerId!: number;

  @Column()
  name!: string;

  @Column({ type: 'text' })
  address!: string;

  @Column({ nullable: true })
  coordinates!: string;

  @Column('decimal', { name: 'area_size', precision: 10, scale: 2, nullable: true })
  areaSize!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}