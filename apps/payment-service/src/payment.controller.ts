import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PaymentService } from './payment.service';
import {
  CreateCheckoutSessionDto,
  CheckoutSessionResponseDto,
  JwtAuthGuard,
  CurrentUser,
} from 'y/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';

@ApiTags('Payment')
@Controller('payment')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Post('checkout')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create Stripe checkout session',
    description:
      'Creates a Stripe checkout session for a pending order. Returns a URL to redirect the user to complete payment. Only the order owner can create a checkout session.',
  })
  @ApiBody({ type: CreateCheckoutSessionDto })
  @ApiResponse({
    status: 201,
    description: 'Checkout session created successfully',
    type: CheckoutSessionResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad Request - Invalid order status or data',
    schema: {
      properties: {
        statusCode: { type: 'number', example: 400 },
        message: {
          type: 'string',
          example: 'Cannot create payment for order with status: PAID',
        },
        error: { type: 'string', example: 'Bad Request' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
    schema: {
      properties: {
        statusCode: { type: 'number', example: 401 },
        message: { type: 'string', example: 'Unauthorized' },
      },
    },
  })
  @ApiResponse({
    status: 403,
    description: "Forbidden - User cannot pay for another user's order",
    schema: {
      properties: {
        statusCode: { type: 'number', example: 403 },
        message: {
          type: 'string',
          example: 'You can only pay for your own orders',
        },
        error: { type: 'string', example: 'Forbidden' },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Not Found - Order not found',
    schema: {
      properties: {
        statusCode: { type: 'number', example: 404 },
        message: { type: 'string', example: 'Order not found' },
        error: { type: 'string', example: 'Not Found' },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Payment already exists for this order',
    schema: {
      properties: {
        statusCode: { type: 'number', example: 409 },
        message: {
          type: 'string',
          example:
            'Payment already exists for this order. Please contact support if you need assistance.',
        },
        error: { type: 'string', example: 'Conflict' },
      },
    },
  })
  async createCheckoutSession(
    @CurrentUser('id') userId: string,
    @Body() createCheckoutSessionDto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    return this.paymentService.createCheckoutSession(
      userId,
      createCheckoutSessionDto,
    );
  }
}
