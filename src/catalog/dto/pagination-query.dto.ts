import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsString,
  IsNumber,
  IsUUID,
} from 'class-validator';
import { Type, Transform, TransformFnParams } from 'class-transformer';

export class PaginationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  // Filter by category slug or ID
  @IsOptional()
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  category?: string;

  // Filter by category ID (alternative to slug)
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId?: string;

  // Price range filters
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'minPrice must be greater than or equal to 0' })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'maxPrice must be greater than or equal to 0' })
  maxPrice?: number;

  // Search by product name
  @IsOptional()
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  search?: string;
}
