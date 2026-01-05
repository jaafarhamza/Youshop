import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
export class CategoryResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  slug!: string;

  @Expose()
  description!: string | null;
}

@Exclude()
export class InventoryResponseDto {
  @Expose()
  quantity!: number;

  @Expose()
  reserved!: number;

  @Expose()
  available!: number; // Calculated: quantity - reserved

  @Expose()
  inStock!: boolean; // Calculated: available > 0
}

@Exclude()
export class ProductDetailResponseDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  slug!: string;

  @Expose()
  description!: string;

  @Expose()
  price!: number;

  @Expose()
  currency!: string;

  @Expose()
  sku!: string;

  @Expose()
  isActive!: boolean;

  @Expose()
  @Type(() => CategoryResponseDto)
  category!: CategoryResponseDto;

  @Expose()
  @Type(() => InventoryResponseDto)
  inventory!: InventoryResponseDto | null;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;
}
