import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
class ProductSummaryDto {
  @ApiProperty({ description: 'Product UUID' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Product name' })
  @Expose()
  name!: string;

  @ApiProperty({ description: 'Product slug' })
  @Expose()
  slug!: string;

  @ApiProperty({ description: 'Product price' })
  @Expose()
  price!: number;

  @ApiProperty({ description: 'Currency code' })
  @Expose()
  currency!: string;
}

@Exclude()
export class OrderItemResponseDto {
  @ApiProperty({ description: 'Order item UUID' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Product UUID' })
  @Expose()
  productId!: string;

  @ApiProperty({ description: 'Product SKU', example: 'WBH-BLK-001' })
  @Expose()
  sku!: string;

  @ApiProperty({ description: 'Quantity ordered', example: 2 })
  @Expose()
  quantity!: number;

  @ApiProperty({ description: 'Unit price at time of order', example: 99.99 })
  @Expose()
  unitPrice!: number;

  @ApiProperty({
    description: 'Product summary',
    type: () => ProductSummaryDto,
    required: false,
  })
  @Expose()
  @Type(() => ProductSummaryDto)
  product?: ProductSummaryDto;
}

@Exclude()
export class OrderResponseDto {
  @ApiProperty({
    description: 'Order UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'User UUID who placed the order' })
  @Expose()
  userId!: string;

  @ApiProperty({
    description: 'Order status',
    example: 'PENDING',
    enum: ['PENDING', 'PAID', 'CANCELLED'],
  })
  @Expose()
  status!: string;

  @ApiProperty({ description: 'Subtotal before tax', example: 199.98 })
  @Expose()
  subtotal!: number;

  @ApiProperty({ description: 'Tax amount', example: 39.99 })
  @Expose()
  tax!: number;

  @ApiProperty({
    description: 'Total amount (subtotal + tax)',
    example: 239.97,
  })
  @Expose()
  total!: number;

  @ApiProperty({ description: 'Order creation timestamp' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @Expose()
  updatedAt!: Date;

  @ApiProperty({ description: 'Order items', type: [OrderItemResponseDto] })
  @Expose()
  @Type(() => OrderItemResponseDto)
  items!: OrderItemResponseDto[];
}
