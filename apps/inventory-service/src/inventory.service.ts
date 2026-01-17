import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import {
  PrismaService,
  CustomLoggerService,
  InventoryResponseDto,
  UpdateInventoryStockDto,
  InventoryLowStockEvent,
} from 'y/common';
import { InventoryItem } from '@prisma/client';
import { plainToInstance } from 'class-transformer';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class InventoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // Get inventory by SKU

  async getInventoryBySku(sku: string): Promise<InventoryResponseDto> {
    this.logger.log(`Fetching inventory for SKU: ${sku}`, 'InventoryService');

    const inventory = await this.prisma.inventoryItem.findUnique({
      where: { sku },
    });

    if (!inventory) {
      throw new NotFoundException(`Inventory not found for SKU: ${sku}`);
    }

    return this.mapToDto(inventory);
  }

  // Get inventory by product ID

  async getInventoryByProductId(
    productId: string,
  ): Promise<InventoryResponseDto> {
    this.logger.log(
      `Fetching inventory for product ID: ${productId}`,
      'InventoryService',
    );

    const inventory = await this.prisma.inventoryItem.findUnique({
      where: { productId },
    });

    if (!inventory) {
      throw new NotFoundException(
        `Inventory not found for product ID: ${productId}`,
      );
    }

    return this.mapToDto(inventory);
  }

  // Add stock - Transaction-safe

  async addStock(sku: string, quantity: number): Promise<InventoryResponseDto> {
    this.logger.log(
      `Adding ${quantity} units to SKU: ${sku}`,
      'InventoryService',
    );

    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const inventory = await this.prisma.$transaction(async (tx) => {
      // Verify inventory exists
      const existing = await tx.inventoryItem.findUnique({
        where: { sku },
      });

      if (!existing) {
        throw new NotFoundException(`Inventory not found for SKU: ${sku}`);
      }

      // Atomic increment
      return tx.inventoryItem.update({
        where: { sku },
        data: {
          quantity: { increment: quantity },
        },
      });
    });

    this.logger.log(
      `Successfully added ${quantity} units to SKU: ${sku}. New quantity: ${inventory.quantity}`,
      'InventoryService',
    );

    return this.mapToDto(inventory);
  }

  // Update inventory stock - Direct update with transaction safety and invariant validation

  async updateInventoryStock(
    sku: string,
    updateDto: UpdateInventoryStockDto,
  ): Promise<InventoryResponseDto> {
    this.logger.log(
      `Updating inventory for SKU: ${sku} - ${JSON.stringify(updateDto)}`,
      'InventoryService',
    );

    const inventory = await this.prisma.$transaction(async (tx) => {
      // Fetch existing inventory
      const existing = await tx.inventoryItem.findUnique({
        where: { sku },
      });

      if (!existing) {
        throw new NotFoundException(`Inventory not found for SKU: ${sku}`);
      }

      // Determine new values (preserve existing if not provided)
      const newQuantity = updateDto.quantity ?? existing.quantity;
      const newReserved = updateDto.reserved ?? existing.reserved;

      // Invariant check: reserved must not exceed quantity
      if (newReserved > newQuantity) {
        throw new BadRequestException(
          `Invalid update: reserved (${newReserved}) cannot exceed quantity (${newQuantity})`,
        );
      }

      // Log old values for audit
      this.logger.log(
        `[AUDIT] SKU: ${sku} - Before update: quantity=${existing.quantity}, reserved=${existing.reserved}, available=${existing.quantity - existing.reserved}`,
        'InventoryService',
      );

      // Perform atomic update
      const updated = (await tx.inventoryItem.update({
        where: { sku },
        data: {
          quantity: newQuantity,
          reserved: newReserved,
        },
        include: {
          product: { select: { name: true } },
        },
      })) as InventoryItem & { product: { name: string } };

      // Log new values for audit
      this.logger.log(
        `[AUDIT] SKU: ${sku} - After update: quantity=${updated.quantity}, reserved=${updated.reserved}, available=${updated.quantity - updated.reserved}`,
        'InventoryService',
      );

      // Check for Low Stock
      if (updated.quantity <= updated.lowStockThreshold) {
        this.logger.warn(
          `LOW STOCK ALERT: SKU ${sku} is at ${updated.quantity} (Threshold: ${updated.lowStockThreshold})`,
          'InventoryService',
        );
        this.eventEmitter.emit(
          'inventory.low-stock',
          new InventoryLowStockEvent(
            sku,
            updated.productId,
            updated.quantity,
            updated.lowStockThreshold,
            updated.product.name,
          ),
        );
      }

      return updated;
    });

    this.logger.log(
      `Successfully updated inventory for SKU: ${sku}`,
      'InventoryService',
    );

    return this.mapToDto(inventory);
  }

  // Remove stock - Transaction-safe with validation

  async removeStock(
    sku: string,
    quantity: number,
  ): Promise<InventoryResponseDto> {
    this.logger.log(
      `Removing ${quantity} units from SKU: ${sku}`,
      'InventoryService',
    );

    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const inventory = await this.prisma.$transaction(async (tx) => {
      // Get current inventory
      const existing = await tx.inventoryItem.findUnique({
        where: { sku },
      });

      if (!existing) {
        throw new NotFoundException(`Inventory not found for SKU: ${sku}`);
      }

      // Check if we have enough stock
      const available = existing.quantity - existing.reserved;
      if (available < quantity) {
        throw new BadRequestException(
          `Cannot remove ${quantity} units. Only ${available} available (${existing.reserved} reserved)`,
        );
      }

      // Atomic decrement
      const updated = (await tx.inventoryItem.update({
        where: { sku },
        data: {
          quantity: { decrement: quantity },
        },
        include: {
          product: { select: { name: true } },
        },
      })) as InventoryItem & { product: { name: string } };

      // Check for Low Stock
      if (updated.quantity <= updated.lowStockThreshold) {
        this.logger.warn(
          `LOW STOCK ALERT: SKU ${sku} is at ${updated.quantity} (Threshold: ${updated.lowStockThreshold})`,
          'InventoryService',
        );
        this.eventEmitter.emit(
          'inventory.low-stock',
          new InventoryLowStockEvent(
            sku,
            updated.productId,
            updated.quantity,
            updated.lowStockThreshold,
            updated.product.name,
          ),
        );
      }

      return updated;
    });

    this.logger.log(
      `Successfully removed ${quantity} units from SKU: ${sku}. New quantity: ${inventory.quantity}`,
      'InventoryService',
    );

    return this.mapToDto(inventory);
  }

  // Reserve stock for order - Transaction-safe (prevents overselling)

  async reserveStock(
    sku: string,
    quantity: number,
  ): Promise<InventoryResponseDto> {
    this.logger.log(
      `Reserving ${quantity} units for SKU: ${sku}`,
      'InventoryService',
    );

    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const inventory = await this.prisma.$transaction(async (tx) => {
      // Get current inventory (row lock in transaction)
      const existing = await tx.inventoryItem.findUnique({
        where: { sku },
      });

      if (!existing) {
        throw new NotFoundException(`Inventory not found for SKU: ${sku}`);
      }

      // Calculate available stock
      const available = existing.quantity - existing.reserved;

      if (available < quantity) {
        throw new BadRequestException(
          `Insufficient stock for SKU: ${sku}. Requested: ${quantity}, Available: ${available}`,
        );
      }

      // Atomic increment of reserved
      return tx.inventoryItem.update({
        where: { sku },
        data: {
          reserved: { increment: quantity },
        },
      });
    });

    this.logger.log(
      `Successfully reserved ${quantity} units for SKU: ${sku}. Reserved: ${inventory.reserved}`,
      'InventoryService',
    );

    return this.mapToDto(inventory);
  }

  // Release reserved stock - Transaction-safe

  async releaseStock(
    sku: string,
    quantity: number,
  ): Promise<InventoryResponseDto> {
    this.logger.log(
      `Releasing ${quantity} reserved units for SKU: ${sku}`,
      'InventoryService',
    );

    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    const inventory = await this.prisma.$transaction(async (tx) => {
      // Get current inventory
      const existing = await tx.inventoryItem.findUnique({
        where: { sku },
      });

      if (!existing) {
        throw new NotFoundException(`Inventory not found for SKU: ${sku}`);
      }

      // Validate we have enough reserved stock
      if (existing.reserved < quantity) {
        throw new BadRequestException(
          `Cannot release ${quantity} units. Only ${existing.reserved} reserved`,
        );
      }

      // Atomic decrement of reserved
      return tx.inventoryItem.update({
        where: { sku },
        data: {
          reserved: { decrement: quantity },
        },
      });
    });

    this.logger.log(
      `Successfully released ${quantity} units for SKU: ${sku}. Reserved: ${inventory.reserved}`,
      'InventoryService',
    );

    return this.mapToDto(inventory);
  }

  // Check stock availability

  async checkAvailability(
    sku: string,
    quantity: number,
  ): Promise<{ available: boolean; current: number }> {
    const inventory = await this.prisma.inventoryItem.findUnique({
      where: { sku },
      select: { quantity: true, reserved: true },
    });

    if (!inventory) {
      throw new NotFoundException(`Inventory not found for SKU: ${sku}`);
    }

    const available = inventory.quantity - inventory.reserved;

    return {
      available: available >= quantity,
      current: available,
    };
  }

  // Get low stock items

  async getLowStockItems(threshold: number = 10) {
    this.logger.log(
      `Fetching items with stock below ${threshold}`,
      'InventoryService',
    );

    const items = await this.prisma.inventoryItem.findMany({
      where: {
        quantity: {
          lte: threshold,
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            isActive: true,
          },
        },
      },
      orderBy: { quantity: 'asc' },
    });

    return items.map((item) => ({
      ...this.mapToDto(item),
      product: item.product,
    }));
  }

  // Get out-of-stock items

  async getOutOfStockItems() {
    this.logger.log(
      'Fetching out-of-stock items (available <= 0)',
      'InventoryService',
    );

    // Query items where quantity - reserved <= 0
    const items = await this.prisma.inventoryItem.findMany({
      where: {
        OR: [
          // Case 1: quantity <= reserved (available is 0 or negative)
          {
            quantity: {
              lte: this.prisma.inventoryItem.fields.reserved,
            },
          },
        ],
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            price: true,
            currency: true,
            isActive: true,
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
      },
      orderBy: [{ quantity: 'asc' }, { reserved: 'desc' }],
    });

    // Filter in-memory to ensure accurate calculation
    const outOfStock = items.filter(
      (item) => item.quantity - item.reserved <= 0,
    );

    this.logger.log(
      `Found ${outOfStock.length} out-of-stock items`,
      'InventoryService',
    );

    return outOfStock.map((item) => ({
      ...this.mapToDto(item),
      product: item.product,
    }));
  }

  // Map inventory to DTO with calculated fields

  private mapToDto(inventory: {
    id: string;
    sku: string;
    productId: string;
    quantity: number;
    reserved: number;
    createdAt: Date;
    updatedAt: Date;
  }): InventoryResponseDto {
    const available = inventory.quantity - inventory.reserved;

    return plainToInstance(
      InventoryResponseDto,
      {
        ...inventory,
        available,
        inStock: available > 0,
      },
      { excludeExtraneousValues: true },
    );
  }
}
