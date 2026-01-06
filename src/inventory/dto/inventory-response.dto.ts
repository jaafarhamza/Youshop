import { Exclude, Expose } from 'class-transformer';

@Exclude()
export class InventoryResponseDto {
  @Expose()
  id!: string;

  @Expose()
  sku!: string;

  @Expose()
  productId!: string;

  @Expose()
  quantity!: number;

  @Expose()
  reserved!: number;

  @Expose()
  available!: number; // Calculated: quantity - reserved

  @Expose()
  inStock!: boolean; // Calculated: available > 0

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
