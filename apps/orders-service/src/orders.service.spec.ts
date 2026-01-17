import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from 'y/common';
import { CustomLoggerService } from 'y/common';
import { ConfigService } from '@nestjs/config';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockPrismaService = {
    product: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConfigService.get.mockReturnValue(20); // 20% tax rate

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CustomLoggerService, useValue: mockLoggerService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('calculateOrderTotals', () => {
    it('should calculate totals correctly for a single item', () => {
      const items = [{ sku: 'ITEM-1', quantity: 1 }];
      const productMap = new Map([['ITEM-1', { price: 100 }]]);

      const result = service.calculateOrderTotals(items, productMap);

      expect(result.subtotal).toBe(100);
      expect(result.tax).toBe(20); // 20% of 100
      expect(result.total).toBe(120);
    });

    it('should calculate totals correctly for multiple items', () => {
      const items = [
        { sku: 'ITEM-1', quantity: 2 },
        { sku: 'ITEM-2', quantity: 1 },
      ];
      const productMap = new Map([
        ['ITEM-1', { price: 100 }],
        ['ITEM-2', { price: 50 }],
      ]);

      const result = service.calculateOrderTotals(items, productMap);

      expect(result.subtotal).toBe(250); // (100 * 2) + (50 * 1)
      expect(result.tax).toBe(50); // 20% of 250
      expect(result.total).toBe(300);
    });

    it('should handle floating point precision correctly', () => {
      const items = [{ sku: 'ITEM-1', quantity: 1 }];
      const productMap = new Map([['ITEM-1', { price: 19.99 }]]);

      const result = service.calculateOrderTotals(items, productMap);

      expect(result.subtotal).toBe(19.99);
      expect(result.tax).toBe(4); // 20% of 19.99 = 3.998, rounded to 4
      expect(result.total).toBe(23.99);
    });

    it('should calculate totals with zero tax rate', async () => {
      // Re-initialize with 0% tax
      mockConfigService.get.mockReturnValue(0);
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          OrdersService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: CustomLoggerService, useValue: mockLoggerService },
          // { provide: InventoryService, useValue: mockInventoryService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const zeroTaxService = module.get<OrdersService>(OrdersService);

      const items = [{ sku: 'ITEM-1', quantity: 1 }];
      const productMap = new Map([['ITEM-1', { price: 100 }]]);

      const result = zeroTaxService.calculateOrderTotals(items, productMap);

      expect(result.subtotal).toBe(100);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(100);
    });

    it('should handle empty items array', () => {
      const items: { sku: string; quantity: number }[] = [];
      const productMap = new Map<string, { price: number }>();

      const result = service.calculateOrderTotals(items, productMap);

      expect(result.subtotal).toBe(0);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(0);
    });

    it('should calculate correctly with different quantities', () => {
      const items = [
        { sku: 'ITEM-1', quantity: 5 },
        { sku: 'ITEM-2', quantity: 3 },
      ];
      const productMap = new Map([
        ['ITEM-1', { price: 25.5 }],
        ['ITEM-2', { price: 10.99 }],
      ]);

      const result = service.calculateOrderTotals(items, productMap);

      expect(result.subtotal).toBe(160.47); // (25.5 * 5) + (10.99 * 3) = 127.5 + 32.97
      expect(result.tax).toBe(32.09); // 20% of 160.47
      expect(result.total).toBe(192.56);
    });

    it('should handle products with zero price', () => {
      const items = [{ sku: 'FREE-ITEM', quantity: 1 }];
      const productMap = new Map([['FREE-ITEM', { price: 0 }]]);

      const result = service.calculateOrderTotals(items, productMap);

      expect(result.subtotal).toBe(0);
      expect(result.tax).toBe(0);
      expect(result.total).toBe(0);
    });
  });

  describe('previewOrder', () => {
    it('should successfully preview order with valid products', async () => {
      const createOrderDto = {
        items: [
          { sku: 'PROD-1', quantity: 2 },
          { sku: 'PROD-2', quantity: 1 },
        ],
      };

      mockPrismaService.product.findUnique
        .mockResolvedValueOnce({
          id: 'prod-1',
          price: 50,
          isActive: true,
        })
        .mockResolvedValueOnce({
          id: 'prod-2',
          price: 30,
          isActive: true,
        });

      const result = await service.previewOrder(createOrderDto);

      expect(result.subtotal).toBe(130); // (50 * 2) + (30 * 1)
      expect(result.tax).toBe(26); // 20% of 130
      expect(result.total).toBe(156);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toMatchObject({
        sku: 'PROD-1',
        quantity: 2,
        unitPrice: 50,
        subtotal: 100,
      });
    });

    it('should throw NotFoundException when product not found', async () => {
      const createOrderDto = {
        items: [{ sku: 'INVALID-SKU', quantity: 1 }],
      };

      mockPrismaService.product.findUnique.mockResolvedValue(null);

      await expect(service.previewOrder(createOrderDto)).rejects.toThrow(
        NotFoundException,
      );
      await expect(service.previewOrder(createOrderDto)).rejects.toThrow(
        'Product not found for SKU: INVALID-SKU',
      );
    });

    it('should throw BadRequestException when product is inactive', async () => {
      const createOrderDto = {
        items: [{ sku: 'INACTIVE-PROD', quantity: 1 }],
      };

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        price: 50,
        isActive: false,
      });

      await expect(service.previewOrder(createOrderDto)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.previewOrder(createOrderDto)).rejects.toThrow(
        'not available for purchase',
      );
    });

    it('should calculate preview correctly with single item', async () => {
      const createOrderDto = {
        items: [{ sku: 'PROD-1', quantity: 1 }],
      };

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        price: 99.99,
        isActive: true,
      });

      const result = await service.previewOrder(createOrderDto);

      expect(result.subtotal).toBe(99.99);
      expect(result.tax).toBe(20); // 20% of 99.99 = 19.998, rounded to 20
      expect(result.total).toBe(119.99);
    });

    it('should handle order preview with high quantity', async () => {
      const createOrderDto = {
        items: [{ sku: 'PROD-1', quantity: 100 }],
      };

      mockPrismaService.product.findUnique.mockResolvedValue({
        id: 'prod-1',
        price: 10,
        isActive: true,
      });

      const result = await service.previewOrder(createOrderDto);

      expect(result.subtotal).toBe(1000);
      expect(result.tax).toBe(200);
      expect(result.total).toBe(1200);
      expect(result.items[0].subtotal).toBe(1000);
    });
  });

  describe('completeOrder', () => {
    it('should complete order and finalize inventory', async () => {
      const orderId = 'order-123';
      const items = [{ sku: 'ITEM-1', quantity: 2 }];

      const mockTx = {
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: orderId,
            status: 'PENDING',
            items: items,
          }),
          update: jest.fn(),
        },
        inventoryItem: {
          update: jest.fn(),
        },
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await service.completeOrder(orderId, 'pay-1', 'stripe-1');

      expect(mockTx.order.update).toHaveBeenCalledWith({
        where: { id: orderId },
        data: {
          status: 'PAID',
          paidAt: expect.any(Date),
        },
      });

      expect(mockTx.inventoryItem.update).toHaveBeenCalledWith({
        where: { sku: 'ITEM-1' },
        data: {
          quantity: { decrement: 2 },
          reserved: { decrement: 2 },
        },
      });
    });

    it('should throw NotFoundException if order does not exist', async () => {
      const mockTx = {
        order: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      };

      mockPrismaService.$transaction.mockImplementation(async (callback) => {
        return callback(mockTx);
      });

      await expect(
        service.completeOrder('invalid-id', 'pay-1', 'stripe-1'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should not update if order is already PAID', async () => {
      const mockTx = {
        order: {
          findUnique: jest.fn().mockResolvedValue({
            id: 'order-123',
            status: 'PAID',
          }),
          update: jest.fn(),
        },
      };

      mockPrismaService.$transaction.mockImplementation((callback) => {
        return callback(mockTx);
      });

      await service.completeOrder('order-123', 'pay-1', 'stripe-1');

      expect(mockTx.order.update).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle very small prices correctly', () => {
      const items = [{ sku: 'CHEAP-ITEM', quantity: 1 }];
      const productMap = new Map([['CHEAP-ITEM', { price: 0.01 }]]);

      const result = service.calculateOrderTotals(items, productMap);

      expect(result.subtotal).toBe(0.01);
      expect(result.tax).toBe(0); // 20% of 0.01 = 0.002, rounded to 0
      expect(result.total).toBe(0.01);
    });

    it('should handle large prices correctly', () => {
      const items = [{ sku: 'EXPENSIVE-ITEM', quantity: 1 }];
      const productMap = new Map([['EXPENSIVE-ITEM', { price: 99999.99 }]]);

      const result = service.calculateOrderTotals(items, productMap);

      expect(result.subtotal).toBe(99999.99);
      expect(result.tax).toBe(20000); // 20% of 99999.99
      expect(result.total).toBe(119999.99);
    });

    it('should round tax calculation to 2 decimal places', () => {
      const items = [{ sku: 'ITEM-1', quantity: 1 }];
      const productMap = new Map([['ITEM-1', { price: 33.33 }]]);

      const result = service.calculateOrderTotals(items, productMap);

      expect(result.subtotal).toBe(33.33);
      expect(result.tax).toBe(6.67); // 20% of 33.33 = 6.666, rounded
      expect(result.total).toBe(40);
    });
  });
});
