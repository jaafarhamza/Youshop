import {
  IsInt,
  Min,
  IsNotEmpty,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateInventoryDto {
  @ApiProperty({ description: 'New total quantity', example: 100, minimum: 0 })
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(0, { message: 'Quantity must be greater than or equal to 0' })
  @IsNotEmpty({ message: 'Quantity is required' })
  quantity!: number;
}

export class UpdateInventoryStockDto {
  @ApiProperty({
    description: 'New total quantity',
    example: 100,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(0, { message: 'Quantity must be greater than or equal to 0' })
  quantity?: number;

  @ApiProperty({
    description: 'New reserved quantity',
    example: 10,
    minimum: 0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Reserved must be an integer' })
  @Min(0, { message: 'Reserved must be greater than or equal to 0' })
  reserved?: number;

  @ValidateIf(
    (o: UpdateInventoryStockDto) =>
      o.quantity === undefined && o.reserved === undefined,
  )
  @IsNotEmpty({
    message: 'At least one field (quantity or reserved) must be provided',
  })
  _atLeastOne?: never;
}

export class AdjustStockDto {
  @ApiProperty({ description: 'Amount to add or remove', example: 50 })
  @Type(() => Number)
  @IsInt({ message: 'Amount must be an integer' })
  @IsNotEmpty({ message: 'Amount is required' })
  amount!: number;
}

export class ReserveStockDto {
  @ApiProperty({ description: 'Quantity to reserve', example: 5, minimum: 1 })
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @IsNotEmpty({ message: 'Quantity is required' })
  quantity!: number;
}

export class ReleaseStockDto {
  @ApiProperty({
    description: 'Quantity to release from reservation',
    example: 5,
    minimum: 1,
  })
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @IsNotEmpty({ message: 'Quantity is required' })
  quantity!: number;
}
