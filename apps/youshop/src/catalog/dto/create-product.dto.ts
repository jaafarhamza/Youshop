import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsPositive,
  IsUUID,
  IsOptional,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Wireless Bluetooth Headphones',
    minLength: 3,
    maxLength: 200,
  })
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  @MinLength(3, { message: 'Product name must be at least 3 characters' })
  @MaxLength(200, { message: 'Product name must not exceed 200 characters' })
  name!: string;

  @ApiProperty({
    description: 'URL-friendly product identifier (lowercase, no spaces)',
    example: 'wireless-bluetooth-headphones',
    minLength: 3,
    maxLength: 200,
  })
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Product slug is required' })
  @MinLength(3, { message: 'Slug must be at least 3 characters' })
  @MaxLength(200, { message: 'Slug must not exceed 200 characters' })
  slug!: string;

  @ApiProperty({
    description: 'Detailed product description',
    example:
      'High-quality wireless headphones with noise cancellation and 30-hour battery life',
    minLength: 10,
    maxLength: 2000,
  })
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Product description is required' })
  @MinLength(10, { message: 'Description must be at least 10 characters' })
  @MaxLength(2000, {
    message: 'Description must not exceed 2000 characters',
  })
  description!: string;

  @ApiProperty({
    description: 'Product price (minimum 0.01)',
    example: 99.99,
    minimum: 0.01,
  })
  @IsNumber()
  @IsPositive({ message: 'Price must be a positive number' })
  @Min(0.01, { message: 'Price must be at least 0.01' })
  price!: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'USD',
    default: 'USD',
    maxLength: 3,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(3, { message: 'Currency code must be 3 characters' })
  currency?: string = 'USD';

  @ApiProperty({
    description: 'Category UUID to which this product belongs',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Category ID is required' })
  categoryId!: string;

  @ApiProperty({
    description: 'Stock Keeping Unit (unique product identifier, uppercase)',
    example: 'WBH-BLK-001',
    minLength: 3,
    maxLength: 50,
  })
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'SKU is required' })
  @MinLength(3, { message: 'SKU must be at least 3 characters' })
  @MaxLength(50, { message: 'SKU must not exceed 50 characters' })
  sku!: string;
}
