import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn } from 'typeorm';

@Entity('tracking_events')
export class TrackingEvent {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'batch_id' })
  batchId!: number;

  @Column({ name: 'actor_id' })
  actorId!: number;

  @Column({ name: 'event_name' })
  eventName!: string;

  @Column({ name: 'event_description', type: 'text', nullable: true })
  eventDescription!: string;

  @Column({ nullable: true })
  location!: string;

  @CreateDateColumn({ name: 'event_time' })
  eventTime!: Date;
}