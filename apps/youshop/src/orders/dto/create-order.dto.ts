import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({
    description: 'Product SKU',
    example: 'WBH-BLK-001',
  })
  @IsString()
  @IsNotEmpty({ message: 'SKU is required' })
  sku!: string;

  @ApiProperty({
    description: 'Quantity to order',
    example: 2,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  quantity!: number;
}

export class CreateOrderDto {
  @ApiProperty({
    description: 'List of items to order',
    type: [CreateOrderItemDto],
    minItems: 1,
  })
  @IsArray()
  @ValidateNested({ each: true })
  @ArrayMinSize(1, { message: 'Order must contain at least one item' })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
