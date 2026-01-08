import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import {
  CreateOrderDto,
  OrderResponseDto,
  OrderPreviewResponseDto,
  JwtAuthGuard,
  CurrentUser,
} from 'y/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
  ApiQuery,
} from '@nestjs/swagger';

@ApiTags('Orders')
@Controller('orders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Create a new order',
    description:
      'Create an order with items. Stock is reserved atomically and tax is calculated server-side.',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: 201,
    description: 'Order created successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid order data or insufficient stock',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.createOrder(userId, createOrderDto);
  }

  @Get()
  @ApiOperation({
    summary: 'Get user orders',
    description: 'Retrieve paginated list of orders for the authenticated user',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: Number,
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Orders retrieved successfully',
    type: [OrderResponseDto],
  })
  async getUserOrders(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.getUserOrders(userId, +page, +limit);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Get order by ID',
    description: 'Retrieve detailed information about a specific order',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Order details retrieved successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found or unauthorized',
  })
  async getOrderById(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrderById(userId, orderId);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: 'Cancel an order',
    description:
      'Cancel a PENDING order and release reserved inventory. Idempotent operation.',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Order cancelled successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot cancel order (not in PENDING status)',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found or unauthorized',
  })
  async cancelOrder(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrder(userId, orderId);
  }

  @Patch(':id/pay')
  @ApiOperation({
    summary: 'Mark order as paid',
    description: 'Update order status from PENDING to PAID',
  })
  @ApiParam({ name: 'id', description: 'Order UUID' })
  @ApiResponse({
    status: 200,
    description: 'Order marked as paid successfully',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot pay order (not in PENDING status)',
  })
  @ApiResponse({
    status: 404,
    description: 'Order not found or unauthorized',
  })
  async payOrder(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.payOrder(userId, orderId);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Preview order totals',
    description:
      'Calculate order totals (subtotal, tax, total) without creating an order',
  })
  @ApiBody({ type: CreateOrderDto })
  @ApiResponse({
    status: 200,
    description: 'Order preview calculated successfully',
    type: OrderPreviewResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid order data or product not found',
  })
  async previewOrder(
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderPreviewResponseDto> {
    return this.ordersService.previewOrder(createOrderDto);
  }
}
