import { QcStatus } from '../../../domain/entities/QualityControl.entity';

export class EvaluateQcDto {
  batchId!: number;
  inspectorId!: number;
  status!: QcStatus;
  criteria!: string;
  note?: string;
  evidenceImageUrl?: string;
}