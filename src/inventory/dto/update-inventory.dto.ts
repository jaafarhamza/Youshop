import {
  IsInt,
  Min,
  IsNotEmpty,
  IsOptional,
  ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateInventoryDto {
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(0, { message: 'Quantity must be greater than or equal to 0' })
  @IsNotEmpty({ message: 'Quantity is required' })
  quantity!: number;
}

export class UpdateInventoryStockDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt({ message: 'Quantity must be an integer' })
  @Min(0, { message: 'Quantity must be greater than or equal to 0' })
  quantity?: number;

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
  @Type(() => Number)
  @IsInt({ message: 'Amount must be an integer' })
  @IsNotEmpty({ message: 'Amount is required' })
  amount!: number;
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
