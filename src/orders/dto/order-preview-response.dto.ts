import { ApiProperty } from '@nestjs/swagger';

export class OrderPreviewItemDto {
  @ApiProperty({ description: 'Product SKU', example: 'WBH-BLK-001' })
  sku!: string;

  @ApiProperty({ description: 'Quantity ordered', example: 2 })
  quantity!: number;

  @ApiProperty({ description: 'Unit price', example: 99.99 })
  unitPrice!: number;

  @ApiProperty({
    description: 'Item subtotal (quantity × unitPrice)',
    example: 199.98,
  })
  subtotal!: number;
}

export class OrderPreviewResponseDto {
  @ApiProperty({
    description: 'Preview of order items',
    type: [OrderPreviewItemDto],
  })
  items!: OrderPreviewItemDto[];

  @ApiProperty({ description: 'Order subtotal before tax', example: 199.98 })
  subtotal!: number;

  @ApiProperty({ description: 'Tax amount', example: 39.99 })
  tax!: number;

  @ApiProperty({
    description: 'Total amount (subtotal + tax)',
    example: 239.97,
  })
  total!: number;
}
