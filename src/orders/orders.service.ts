import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CustomLoggerService } from '../common/logger/logger.service';
import { InventoryService } from '../inventory/inventory.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { plainToInstance } from 'class-transformer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrdersService {
  private readonly taxRate: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
    private readonly inventoryService: InventoryService,
    private readonly configService: ConfigService,
  ) {
    this.taxRate = this.configService.get<number>('TAX_RATE') ?? 20;
  }

  async createOrder(
    userId: string,
    createOrderDto: CreateOrderDto,
  ): Promise<OrderResponseDto> {
    this.logger.log(
      `Creating order for user ${userId} with ${createOrderDto.items.length} items`,
      'OrdersService',
    );

    // Use transaction to ensure atomicity
    const order = await this.prisma.$transaction(async (tx) => {
      // Step 1: Validate all products exist and get their prices
      const productMap = new Map<string, { id: string; price: number }>();

      for (const item of createOrderDto.items) {
        const product = await tx.product.findUnique({
          where: { sku: item.sku },
          select: { id: true, price: true, isActive: true, sku: true },
        });

        if (!product) {
          throw new NotFoundException(`Product not found for SKU: ${item.sku}`);
        }

        if (!product.isActive) {
          throw new BadRequestException(
            `Product ${item.sku} is not available for purchase`,
          );
        }

        productMap.set(item.sku, { id: product.id, price: product.price });
      }

      // Step 2: Check and reserve stock atomically for each item
      for (const item of createOrderDto.items) {
        this.logger.log(
          `Checking availability for SKU ${item.sku}, quantity: ${item.quantity}`,
          'OrdersService',
        );

        // Check availability first
        const inventory = await tx.inventoryItem.findUnique({
          where: { sku: item.sku },
        });

        if (!inventory) {
          throw new NotFoundException(
            `Inventory not found for SKU: ${item.sku}`,
          );
        }

        const available = inventory.quantity - inventory.reserved;

        if (available < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${item.sku}. Requested: ${item.quantity}, Available: ${available}`,
          );
        }

        // Atomically reserve stock
        await tx.inventoryItem.update({
          where: { sku: item.sku },
          data: {
            reserved: { increment: item.quantity },
          },
        });

        this.logger.log(
          `Reserved ${item.quantity} units of SKU ${item.sku}`,
          'OrdersService',
        );
      }

      // Step 3: Calculate order totals
      let subtotal = 0;

      for (const item of createOrderDto.items) {
        const productInfo = productMap.get(item.sku)!;
        subtotal += productInfo.price * item.quantity;
      }

      const tax = (subtotal * this.taxRate) / 100;
      const total = subtotal + tax;

      this.logger.log(
        `Order totals - Subtotal: ${subtotal}, Tax (${this.taxRate}%): ${tax}, Total: ${total}`,
        'OrdersService',
      );

      // Step 4: Create order with items
      const createdOrder = await tx.order.create({
        data: {
          userId,
          subtotal,
          tax,
          total,
          status: 'PENDING',
          items: {
            create: createOrderDto.items.map((item) => {
              const productInfo = productMap.get(item.sku)!;
              return {
                productId: productInfo.id,
                sku: item.sku,
                quantity: item.quantity,
                unitPrice: productInfo.price,
              };
            }),
          },
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  slug: true,
                  price: true,
                  currency: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(
        `Order ${createdOrder.id} created successfully for user ${userId}`,
        'OrdersService',
      );

      return createdOrder;
    });

    // Transform to DTO
    return plainToInstance(OrderResponseDto, order, {
      excludeExtraneousValues: true,
    });
  }

  async getOrderById(
    userId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
    this.logger.log(
      `Fetching order ${orderId} for user ${userId}`,
      'OrdersService',
    );

    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                currency: true,
              },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order not found: ${orderId}`);
    }

    return plainToInstance(OrderResponseDto, order, {
      excludeExtraneousValues: true,
    });
  }

  async getUserOrders(userId: string): Promise<OrderResponseDto[]> {
    this.logger.log(`Fetching all orders for user ${userId}`, 'OrdersService');

    const orders = await this.prisma.order.findMany({
      where: { userId },
      include: {
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                slug: true,
                price: true,
                currency: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return orders.map((order) =>
      plainToInstance(OrderResponseDto, order, {
        excludeExtraneousValues: true,
      }),
    );
  }
}
