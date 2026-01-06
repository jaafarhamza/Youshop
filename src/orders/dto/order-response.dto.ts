import { Exclude, Expose, Type } from 'class-transformer';

@Exclude()
class ProductSummaryDto {
  @Expose()
  id!: string;

  @Expose()
  name!: string;

  @Expose()
  slug!: string;

  @Expose()
  price!: number;

  @Expose()
  currency!: string;
}

@Exclude()
export class OrderItemResponseDto {
  @Expose()
  id!: string;

  @Expose()
  productId!: string;

  @Expose()
  sku!: string;

  @Expose()
  quantity!: number;

  @Expose()
  unitPrice!: number;

  @Expose()
  @Type(() => ProductSummaryDto)
  product?: ProductSummaryDto;
}

@Exclude()
export class OrderResponseDto {
  @Expose()
  id!: string;

  @Expose()
  userId!: string;

  @Expose()
  status!: string;

  @Expose()
  subtotal!: number;

  @Expose()
  tax!: number;

  @Expose()
  total!: number;

  @Expose()
  createdAt!: Date;

  @Expose()
  updatedAt!: Date;

  @Expose()
  @Type(() => OrderItemResponseDto)
  items!: OrderItemResponseDto[];
}
