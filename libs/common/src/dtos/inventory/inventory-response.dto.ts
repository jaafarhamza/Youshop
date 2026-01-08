import { Exclude, Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

@Exclude()
export class InventoryResponseDto {
  @ApiProperty({ description: 'Inventory item UUID' })
  @Expose()
  id!: string;

  @ApiProperty({ description: 'Product SKU', example: 'WBH-BLK-001' })
  @Expose()
  sku!: string;

  @ApiProperty({ description: 'Product UUID' })
  @Expose()
  productId!: string;

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

  @ApiProperty({ description: 'Creation timestamp' })
  @Expose()
  createdAt!: Date;

  @ApiProperty({ description: 'Last update timestamp' })
  @Expose()
  updatedAt!: Date;
}
