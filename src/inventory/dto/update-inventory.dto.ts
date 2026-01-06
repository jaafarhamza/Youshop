import { IsInt, Min, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateInventoryDto {
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(0, { message: 'Quantity must be greater than or equal to 0' })
  @IsNotEmpty({ message: 'Quantity is required' })
  quantity!: number;
}

export class AdjustStockDto {
  @Type(() => Number)
  @IsInt({ message: 'Amount must be an integer' })
  @IsNotEmpty({ message: 'Amount is required' })
  amount!: number; // Can be positive (add) or negative (remove)
}

export class ReserveStockDto {
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @IsNotEmpty({ message: 'Quantity is required' })
  quantity!: number;
}

export class ReleaseStockDto {
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(1, { message: 'Quantity must be at least 1' })
  @IsNotEmpty({ message: 'Quantity is required' })
  quantity!: number;
}
