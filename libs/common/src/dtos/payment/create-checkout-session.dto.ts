import { IsUUID, IsOptional, IsString, IsUrl } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCheckoutSessionDto {
  @ApiProperty({
    description: 'Order ID to create checkout session for',
    example: '123e4567-e89b-12d3-a456-426614174000',
    type: String,
  })
  @IsUUID('4', { message: 'Order ID must be a valid UUID' })
  orderId!: string;

  @ApiPropertyOptional({
    description:
      'Success redirect URL (optional, uses default if not provided)',
    example:
      'https://youshop.com/payment/success?session_id={CHECKOUT_SESSION_ID}',
    type: String,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Success URL must be a valid URL' })
  @IsString()
  successUrl?: string;

  @ApiPropertyOptional({
    description: 'Cancel redirect URL (optional, uses default if not provided)',
    example: 'https://youshop.com/payment/cancel',
    type: String,
  })
  @IsOptional()
  @IsUrl({}, { message: 'Cancel URL must be a valid URL' })
  @IsString()
  cancelUrl?: string;
}
