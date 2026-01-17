import { Expose } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CheckoutSessionResponseDto {
  @ApiProperty({
    description: 'Stripe checkout session ID',
    example: 'cs_test_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
    type: String,
  })
  @Expose()
  sessionId!: string;

  @ApiProperty({
    description: 'Stripe checkout URL to redirect user',
    example: 'https://checkout.stripe.com/c/pay/cs_test_a1b2c3d4',
    type: String,
  })
  @Expose()
  checkoutUrl!: string;

  @ApiProperty({
    description: 'Session expiration timestamp (ISO 8601)',
    example: '2024-01-18T12:00:00.000Z',
    type: String,
  })
  @Expose()
  expiresAt!: string;

  @ApiProperty({
    description: 'Payment record ID in database',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  @Expose()
  paymentId!: string;

  @ApiProperty({
    description: 'Order ID associated with this payment',
    example: '123e4567-e89b-12d3-a456-426614174001',
    type: String,
  })
  @Expose()
  orderId!: string;

  @ApiProperty({
    description: 'Payment amount in smallest currency unit (cents for USD)',
    example: 9999,
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
}
