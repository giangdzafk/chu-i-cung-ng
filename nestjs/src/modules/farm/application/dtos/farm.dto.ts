export class CreateBatchDto {
  productId!: number;
  farmId!: number;
  quantity!: number;
  unit!: string;
}

export class AddFarmingLogDto {
  batchId!: number;
  farmerId!: number; // Trong thực tế lấy từ JWT Token, ở đây truyền qua DTO cho dễ demo
  actionType!: string;
  description!: string;
}