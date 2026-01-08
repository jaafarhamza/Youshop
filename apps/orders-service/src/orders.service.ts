import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  PrismaService,
  CustomLoggerService,
  CreateOrderDto,
  OrderResponseDto,
  OrderPreviewResponseDto,
  OrderPreviewItemDto,
} from 'y/common';
import { plainToInstance } from 'class-transformer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class OrdersService {
  private readonly taxRate: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
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
      const { subtotal, tax, total } = this.calculateOrderTotals(
        createOrderDto.items,
        productMap,
      );

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

  async getUserOrders(
    userId: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<OrderResponseDto[]> {
    this.logger.log(
      `Fetching orders for user ${userId}, page ${page}, limit ${limit}`,
      'OrdersService',
    );

    const skip = (page - 1) * limit;

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
      skip,
      take: limit,
    });

    return orders.map((order) =>
      plainToInstance(OrderResponseDto, order, {
        excludeExtraneousValues: true,
      }),
    );
  }

  async cancelOrder(
    userId: string,
    orderId: string,
  ): Promise<OrderResponseDto> {
    this.logger.log(
      `Attempting to cancel order ${orderId} for user ${userId}`,
      'OrdersService',
    );

    const order = await this.prisma.$transaction(async (tx) => {
      // 1. Get order with items
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
        include: { items: true },
      });

      if (!existingOrder) {
        throw new NotFoundException(`Order not found: ${orderId}`);
      }

      if (existingOrder.userId !== userId) {
        throw new NotFoundException(`Order not found: ${orderId}`);
      }

      // 2. Idempotency & State Check
      if (existingOrder.status === 'CANCELLED') {
        this.logger.log(
          `Order ${orderId} is already cancelled`,
          'OrdersService',
        );
        return existingOrder;
      }

      if (existingOrder.status !== 'PENDING') {
        throw new BadRequestException(
          `Cannot cancel order with status: ${existingOrder.status}`,
        );
      }

      // 3. Update Order Status
      const cancelledOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
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

      // 4. Release Reserved Stock
      for (const item of existingOrder.items) {
        await tx.inventoryItem.update({
          where: { sku: item.sku },
          data: {
            reserved: { decrement: item.quantity },
          },
        });

        this.logger.log(
          `Released ${item.quantity} reserved units for SKU ${item.sku}`,
          'OrdersService',
        );
      }

      return cancelledOrder;
    });

    return plainToInstance(OrderResponseDto, order, {
      excludeExtraneousValues: true,
    });
  }

  async payOrder(userId: string, orderId: string): Promise<OrderResponseDto> {
    this.logger.log(`Attempting to pay order ${orderId}`, 'OrdersService');

    const order = await this.prisma.$transaction(async (tx) => {
      const existingOrder = await tx.order.findUnique({
        where: { id: orderId },
      });

      if (!existingOrder) {
        throw new NotFoundException(`Order not found: ${orderId}`);
      }

      if (existingOrder.userId !== userId) {
        throw new NotFoundException(`Order not found: ${orderId}`);
      }

      if (existingOrder.status !== 'PENDING') {
        throw new BadRequestException(
          `Cannot pay order with status: ${existingOrder.status}`,
        );
      }

      const paidOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: 'PAID' },
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

      return paidOrder;
    });

    this.logger.log(
      `Order ${orderId} paid successfully by user ${userId}`,
      'OrdersService',
    );

    return plainToInstance(OrderResponseDto, order, {
      excludeExtraneousValues: true,
    });
  }

  async previewOrder(
    createOrderDto: CreateOrderDto,
  ): Promise<OrderPreviewResponseDto> {
    // 1. Validate items and fetch prices
    const itemPreviews: OrderPreviewItemDto[] = [];
    const productMap = new Map<string, { price: number }>();

    for (const item of createOrderDto.items) {
      const product = await this.prisma.product.findUnique({
        where: { sku: item.sku },
        select: { id: true, price: true, isActive: true },
      });

      if (!product) {
        throw new NotFoundException(`Product not found for SKU: ${item.sku}`);
      }

      if (!product.isActive) {
        throw new BadRequestException(
          `Product ${item.sku} is not available for purchase`,
        );
      }

      productMap.set(item.sku, { price: product.price });

      itemPreviews.push({
        sku: item.sku,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal: product.price * item.quantity,
      });
    }

    const { subtotal, tax, total } = this.calculateOrderTotals(
      createOrderDto.items,
      productMap,
    );

    return {
      items: itemPreviews,
      subtotal,
      tax,
      total,
    };
  }

  calculateOrderTotals(
    items: { sku: string; quantity: number }[],
    productMap: Map<string, { price: number }>,
  ): { subtotal: number; tax: number; total: number } {
    let subtotal = 0;

    for (const item of items) {
      const productInfo = productMap.get(item.sku);
      if (productInfo) {
        subtotal += productInfo.price * item.quantity;
      }
    }

    // Fix floating point issues
    subtotal = Math.round(subtotal * 100) / 100;
    const tax = Math.round(subtotal * this.taxRate) / 100;
    const total = Math.round((subtotal + tax) * 100) / 100;

    return { subtotal, tax, total };
  }
}
