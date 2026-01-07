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
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('orders')
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @CurrentUser('id') userId: string,
    @Body() createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    return this.ordersService.createOrder(userId, createOrderDto);
  }

  @Get()
  async getUserOrders(
    @CurrentUser('id') userId: string,
    @Query('page') page = 1,
    @Query('limit') limit = 10,
  ): Promise<OrderResponseDto[]> {
    return this.ordersService.getUserOrders(userId, +page, +limit);
  }

  @Get(':id')
  async getOrderById(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.getOrderById(userId, orderId);
  }

  @Patch(':id/cancel')
  async cancelOrder(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.cancelOrder(userId, orderId);
  }

  @Patch(':id/pay')
  async payOrder(
    @CurrentUser('id') userId: string,
    @Param('id') orderId: string,
  ): Promise<OrderResponseDto> {
    return this.ordersService.payOrder(userId, orderId);
  }

  @Post('preview')
  @HttpCode(HttpStatus.OK)
  async previewOrder(@Body() createOrderDto: CreateOrderDto): Promise<any> {
    return this.ordersService.previewOrder(createOrderDto);
  }
}
