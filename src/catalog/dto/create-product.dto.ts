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

export class CreateProductDto {
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  @MinLength(3, { message: 'Product name must be at least 3 characters' })
  @MaxLength(200, { message: 'Product name must not exceed 200 characters' })
  name!: string;

  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'Product slug is required' })
  @MinLength(3, { message: 'Slug must be at least 3 characters' })
  @MaxLength(200, { message: 'Slug must not exceed 200 characters' })
  slug!: string;

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

  @IsNumber()
  @IsPositive({ message: 'Price must be a positive number' })
  @Min(0.01, { message: 'Price must be at least 0.01' })
  price!: number;

  @IsOptional()
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @MaxLength(3, { message: 'Currency code must be 3 characters' })
  currency?: string = 'USD';

  @IsUUID('4', { message: 'Category ID must be a valid UUID' })
  @IsNotEmpty({ message: 'Category ID is required' })
  categoryId!: string;

  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  @IsString()
  @IsNotEmpty({ message: 'SKU is required' })
  @MinLength(3, { message: 'SKU must be at least 3 characters' })
  @MaxLength(50, { message: 'SKU must not exceed 50 characters' })
  sku!: string;
}
