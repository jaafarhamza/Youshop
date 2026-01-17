import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export enum PaymentStatusEnum {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  SUCCEEDED = 'SUCCEEDED',
  FAILED = 'FAILED',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export class PaymentResponseDto {
  @ApiProperty({
    description: 'Payment ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  @Expose()
  id!: string;

  @ApiProperty({
    description: 'Order ID associated with payment',
    example: '123e4567-e89b-12d3-a456-426614174001',
    type: String,
  })
  @Expose()
  orderId!: string;

  @ApiProperty({
    description: 'Payment amount',
    example: 99.99,
    type: Number,
  })
  @Expose()
  amount!: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'USD',
    type: String,
  })
  @Expose()
  currency!: string;

  @ApiProperty({
    description: 'Payment status',
    enum: PaymentStatusEnum,
    example: PaymentStatusEnum.SUCCEEDED,
  })
  @Expose()
  status!: PaymentStatusEnum;

  @ApiProperty({
    description: 'Stripe session ID',
    example: 'cs_test_a1b2c3d4e5f6g7h8i9j0',
    type: String,
    required: false,
  })
  @Expose()
  stripeSessionId?: string | null;

  @ApiProperty({
    description: 'Stripe payment intent ID',
    example: 'pi_test_a1b2c3d4e5f6g7h8i9j0',
    type: String,
    required: false,
  })
  @Expose()
  stripePaymentId?: string | null;

  @ApiProperty({
    description: 'Failure reason if payment failed',
    example: 'Insufficient funds',
    type: String,
    required: false,
  })
  @Expose()
  failureReason?: string | null;

  @ApiProperty({
    description: 'Payment creation timestamp',
    example: '2024-01-17T12:00:00.000Z',
    type: Date,
  })
  @Expose()
  createdAt!: Date;

  @ApiProperty({
    description: 'Payment last update timestamp',
    example: '2024-01-17T12:05:00.000Z',
    type: Date,
  })
  @Expose()
  updatedAt!: Date;
}
