import { Exclude, Expose, Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class CategoryResponseDto {
  @ApiProperty({
    description: 'Category UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Category name', example: 'Electronics' })
  @Expose()
  name!: string;

  @ApiProperty({ description: 'Category slug', example: 'electronics' })
  @Expose()
  slug!: string;

  @ApiProperty({
    description: 'Category description',
    example: 'Electronic devices and accessories',
    nullable: true,
  })
  @Expose()
  description!: string | null;
}

@Exclude()
export class ProductInventoryDto {
  @ApiProperty({ description: 'Total quantity in stock', example: 100 })
  @Expose()
  quantity!: number;

  @ApiProperty({
    description: 'Reserved quantity for pending orders',
    example: 10,
  })
  @Expose()
  reserved!: number;

  @ApiProperty({
    description: 'Available quantity (quantity - reserved)',
    example: 90,
  })
  @Expose()
  available!: number; // Calculated: quantity - reserved

  @ApiProperty({ description: 'Whether product is in stock', example: true })
  @Expose()
  inStock!: boolean; // Calculated: available > 0
}

@Exclude()
export class ProductDetailResponseDto {
  @ApiProperty({
    description: 'Product UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'Product name',
    example: 'Wireless Bluetooth Headphones',
  })
  @Expose()
  name!: string;

  @ApiProperty({
    description: 'Product slug',
    example: 'wireless-bluetooth-headphones',
  })
  @Expose()
  slug!: string;

  @ApiProperty({
    description: 'Product description',
    example: 'High-quality wireless headphones with noise cancellation',
  })
  @Expose()
  description!: string;

  @ApiProperty({ description: 'Product price', example: 99.99 })
  @Expose()
  price!: number;

  @ApiProperty({ description: 'Currency code', example: 'USD' })
  @Expose()
  currency!: string;

  @ApiProperty({ description: 'Stock Keeping Unit', example: 'WBH-BLK-001' })
  @Expose()
  sku!: string;

  @ApiProperty({ description: 'Product active status', example: true })
  @Expose()
  isActive!: boolean;

  @ApiProperty({
    description: 'Product category',
    type: () => CategoryResponseDto,
  })
  @Expose()
  @Type(() => CategoryResponseDto)
  category!: CategoryResponseDto;

  @ApiProperty({
    description: 'Product inventory information',
    type: () => ProductInventoryDto,
    nullable: true,
  })
  @Expose()
  @Type(() => ProductInventoryDto)
  inventory!: ProductInventoryDto | null;

  @ApiProperty({
    description: 'Creation timestamp',
    example: '2026-01-07T10:00:00.000Z',
  })
  @Expose()
  createdAt!: Date;

  @ApiProperty({
    description: 'Last update timestamp',
    example: '2026-01-07T10:00:00.000Z',
  })
  @Expose()
  updatedAt!: Date;
}
