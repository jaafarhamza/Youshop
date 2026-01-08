import {
  IsString,
  IsNumber,
  IsPositive,
  IsUUID,
  IsOptional,
  IsBoolean,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';
import { Transform, TransformFnParams } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({
    description: 'Product name',
    example: 'Wireless Bluetooth Headphones Pro',
    minLength: 3,
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(3, { message: 'Product name must be at least 3 characters' })
  @MaxLength(200, { message: 'Product name must not exceed 200 characters' })
  name?: string;

  @ApiProperty({
    description: 'URL-friendly product identifier',
    example: 'wireless-bluetooth-headphones-pro',
    minLength: 3,
    maxLength: 200,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @MinLength(3, { message: 'Slug must be at least 3 characters' })
  @MaxLength(200, { message: 'Slug must not exceed 200 characters' })
  slug?: string;

  @ApiProperty({
    description: 'Detailed product description',
    example:
      'Updated description with noise cancellation and 40-hour battery life',
    minLength: 10,
    maxLength: 2000,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(10, { message: 'Description must be at least 10 characters' })
  @MaxLength(2000, {
    message: 'Description must not exceed 2000 characters',
  })
  description?: string;

  @ApiProperty({
    description: 'Product price',
    example: 129.99,
    minimum: 0.01,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive({ message: 'Price must be a positive number' })
  @Min(0.01, { message: 'Price must be at least 0.01' })
  price?: number;

  @ApiProperty({
    description: 'Currency code (ISO 4217)',
    example: 'EUR',
    maxLength: 3,
    required: false,
  })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(3, { message: 'Currency code must be 3 characters' })
  currency?: string;

  @ApiProperty({
    description: 'Category UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  categoryId?: string;

  @ApiProperty({
    description: 'Product active status',
    example: true,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
