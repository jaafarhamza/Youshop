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
import { ApiProperty } from '@nestjs/swagger';

export class PaginationQueryDto {
  @ApiProperty({
    description: 'Page number (starts from 1)',
    example: 1,
    minimum: 1,
    default: 1,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Number of items per page (max 100)',
    example: 10,
    minimum: 1,
    maximum: 100,
    default: 10,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiProperty({
    description: 'Filter by category slug (lowercase)',
    example: 'electronics',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsString()
  category?: string;

  @ApiProperty({
    description: 'Filter by category UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
    required: false,
  })
  @IsOptional()
  @IsUUID('4', { message: 'categoryId must be a valid UUID' })
  categoryId?: string;

  @ApiProperty({
    description: 'Minimum price filter',
    example: 10.0,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'minPrice must be greater than or equal to 0' })
  minPrice?: number;

  @ApiProperty({
    description: 'Maximum price filter',
    example: 500.0,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0, { message: 'maxPrice must be greater than or equal to 0' })
  maxPrice?: number;

  @ApiProperty({
    description: 'Search products by name',
    example: 'headphones',
    required: false,
  })
  @IsOptional()
  @Transform(({ value }: TransformFnParams): string =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  search?: string;
}
