import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from 'y/common';
import { CustomLoggerService } from 'y/common';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { InventoryItem } from '@prisma/client';

describe('InventoryService', () => {
  let service: InventoryService;

  const mockPrismaService = {
    inventoryItem: {
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
      fields: {
        reserved: 'reserved',
      },
    },
    $transaction: jest.fn(),
  };

  mockPrismaService.$transaction.mockImplementation(
    (callback: (client: typeof mockPrismaService) => unknown) =>
      callback(mockPrismaService),
  );

  const mockLoggerService = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        {
          provide: PrismaService,
          useValue: mockPrismaService as unknown as PrismaService,
        },
        { provide: CustomLoggerService, useValue: mockLoggerService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkAvailability', () => {
    it('should return true when sufficient stock is available', async () => {
      const mockInventory: Partial<InventoryItem> = {
        quantity: 100,
        reserved: 10,
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventory,
      );

      const result = await service.checkAvailability('TEST-SKU', 50);

      expect(result.available).toBe(true);
      expect(result.current).toBe(90); // 100 - 10
      expect(mockPrismaService.inventoryItem.findUnique).toHaveBeenCalledWith({
        where: { sku: 'TEST-SKU' },
        select: { quantity: true, reserved: true },
      });
    });

    it('should return false when insufficient stock is available', async () => {
      const mockInventory: Partial<InventoryItem> = {
        quantity: 100,
        reserved: 95,
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventory,
      );

      const result = await service.checkAvailability('TEST-SKU', 10);

      expect(result.available).toBe(false);
      expect(result.current).toBe(5); // 100 - 95
    });

    it('should return true when requested quantity equals available stock', async () => {
      const mockInventory: Partial<InventoryItem> = {
        quantity: 100,
        reserved: 50,
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventory,
      );

      const result = await service.checkAvailability('TEST-SKU', 50);

      expect(result.available).toBe(true);
      expect(result.current).toBe(50);
    });

    it('should throw NotFoundException when inventory not found', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(
        service.checkAvailability('INVALID-SKU', 10),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('reserveStock', () => {
    it('should successfully reserve stock when sufficient quantity available', async () => {
      const mockInventoryBefore: InventoryItem = {
        id: '1',
        sku: 'TEST-SKU',
        productId: 'product-1',
        quantity: 100,
        reserved: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInventoryAfter: InventoryItem = {
        ...mockInventoryBefore,
        reserved: 20, // 10 + 10
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventoryBefore,
      );
      mockPrismaService.inventoryItem.update.mockResolvedValue(
        mockInventoryAfter,
      );

      const result = await service.reserveStock('TEST-SKU', 10);

      expect(result).toMatchObject({
        sku: 'TEST-SKU',
        quantity: 100,
        reserved: 20,
      });
      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { sku: 'TEST-SKU' },
        data: { reserved: { increment: 10 } },
      });
    });

    it('should throw BadRequestException when insufficient stock available', async () => {
      const mockInventory: InventoryItem = {
        id: '1',
        sku: 'TEST-SKU',
        productId: 'product-1',
        quantity: 100,
        reserved: 95,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventory,
      );

      await expect(service.reserveStock('TEST-SKU', 10)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.reserveStock('TEST-SKU', 10)).rejects.toThrow(
        'Insufficient stock',
      );
    });

    it('should successfully reserve when requesting exact available quantity', async () => {
      const mockInventoryBefore: InventoryItem = {
        id: '1',
        sku: 'TEST-SKU',
        productId: 'product-1',
        quantity: 100,
        reserved: 50,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInventoryAfter: InventoryItem = {
        ...mockInventoryBefore,
        reserved: 100,
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventoryBefore,
      );
      mockPrismaService.inventoryItem.update.mockResolvedValue(
        mockInventoryAfter,
      );

      const result = await service.reserveStock('TEST-SKU', 50);

      expect(result.reserved).toBe(100);
    });

    it('should throw NotFoundException when inventory not found', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(service.reserveStock('INVALID-SKU', 10)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException for zero quantity', async () => {
      const mockInventory: InventoryItem = {
        id: '1',
        sku: 'TEST-SKU',
        productId: 'product-1',
        quantity: 100,
        reserved: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventory,
      );

      await expect(service.reserveStock('TEST-SKU', 0)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('releaseStock', () => {
    it('should successfully release reserved stock', async () => {
      const mockInventoryBefore: InventoryItem = {
        id: '1',
        sku: 'TEST-SKU',
        productId: 'product-1',
        quantity: 100,
        reserved: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInventoryAfter: InventoryItem = {
        ...mockInventoryBefore,
        reserved: 10, // 20 - 10
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventoryBefore,
      );
      mockPrismaService.inventoryItem.update.mockResolvedValue(
        mockInventoryAfter,
      );

      const result = await service.releaseStock('TEST-SKU', 10);

      expect(result.reserved).toBe(10);
      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { sku: 'TEST-SKU' },
        data: { reserved: { decrement: 10 } },
      });
    });

    it('should throw BadRequestException when releasing more than reserved', async () => {
      const mockInventory: InventoryItem = {
        id: '1',
        sku: 'TEST-SKU',
        productId: 'product-1',
        quantity: 100,
        reserved: 5,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventory,
      );

      await expect(service.releaseStock('TEST-SKU', 10)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.releaseStock('TEST-SKU', 10)).rejects.toThrow(
        'Cannot release',
      );
    });

    it('should successfully release all reserved stock', async () => {
      const mockInventoryBefore: InventoryItem = {
        id: '1',
        sku: 'TEST-SKU',
        productId: 'product-1',
        quantity: 100,
        reserved: 20,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInventoryAfter: InventoryItem = {
        ...mockInventoryBefore,
        reserved: 0,
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventoryBefore,
      );
      mockPrismaService.inventoryItem.update.mockResolvedValue(
        mockInventoryAfter,
      );

      const result = await service.releaseStock('TEST-SKU', 20);

      expect(result.reserved).toBe(0);
    });

    it('should throw NotFoundException when inventory not found', async () => {
      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(null);

      await expect(service.releaseStock('INVALID-SKU', 10)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addStock', () => {
    it('should successfully add stock to inventory', async () => {
      const mockInventoryBefore: InventoryItem = {
        id: '1',
        sku: 'TEST-SKU',
        productId: 'product-1',
        quantity: 100,
        reserved: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInventoryAfter: InventoryItem = {
        ...mockInventoryBefore,
        quantity: 150, // 100 + 50
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventoryBefore,
      );
      mockPrismaService.inventoryItem.update.mockResolvedValue(
        mockInventoryAfter,
      );

      const result = await service.addStock('TEST-SKU', 50);

      expect(result.quantity).toBe(150);
      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { sku: 'TEST-SKU' },
        data: { quantity: { increment: 50 } },
      });
    });

    it('should throw BadRequestException for zero or negative amount', async () => {
      const mockInventory: InventoryItem = {
        id: '1',
        sku: 'TEST-SKU',
        productId: 'product-1',
        quantity: 100,
        reserved: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventory,
      );

      await expect(service.addStock('TEST-SKU', 0)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.addStock('TEST-SKU', -10)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('removeStock', () => {
    it('should successfully remove stock from inventory', async () => {
      const mockInventoryBefore: InventoryItem = {
        id: '1',
        sku: 'TEST-SKU',
        productId: 'product-1',
        quantity: 100,
        reserved: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInventoryAfter: InventoryItem = {
        ...mockInventoryBefore,
        quantity: 80, // 100 - 20
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventoryBefore,
      );
      mockPrismaService.inventoryItem.update.mockResolvedValue(
        mockInventoryAfter,
      );

      const result = await service.removeStock('TEST-SKU', 20);

      expect(result.quantity).toBe(80);
      expect(mockPrismaService.inventoryItem.update).toHaveBeenCalledWith({
        where: { sku: 'TEST-SKU' },
        data: { quantity: { decrement: 20 } },
      });
    });

    it('should throw BadRequestException when removing more than available stock', async () => {
      const mockInventory: InventoryItem = {
        id: '1',
        sku: 'TEST-SKU',
        productId: 'product-1',
        quantity: 100,
        reserved: 90,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventory,
      );

      await expect(service.removeStock('TEST-SKU', 20)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.removeStock('TEST-SKU', 20)).rejects.toThrow(
        'Cannot remove',
      );
    });

    it('should throw BadRequestException for zero or negative amount', async () => {
      const mockInventory: InventoryItem = {
        id: '1',
        sku: 'TEST-SKU',
        productId: 'product-1',
        quantity: 100,
        reserved: 10,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.inventoryItem.findUnique.mockResolvedValue(
        mockInventory,
      );

      await expect(service.removeStock('TEST-SKU', 0)).rejects.toThrow(
        BadRequestException,
      );
      await expect(service.removeStock('TEST-SKU', -10)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getLowStockItems', () => {
    it('should return items with available stock below threshold', async () => {
      const mockInventoryItems: InventoryItem[] = [
        {
          id: '1',
          sku: 'LOW-STOCK-1',
          productId: 'product-1',
          quantity: 15,
          reserved: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          sku: 'LOW-STOCK-2',
          productId: 'product-2',
          quantity: 8,
          reserved: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.inventoryItem.findMany.mockResolvedValue(
        mockInventoryItems,
      );

      const result = await service.getLowStockItems(10);

      expect(result).toHaveLength(2);
      expect(mockPrismaService.inventoryItem.findMany).toHaveBeenCalled();
    });
  });

  describe('getOutOfStockItems', () => {
    it('should return items with zero available stock', async () => {
      const mockInventoryItems: InventoryItem[] = [
        {
          id: '1',
          sku: 'OUT-OF-STOCK-1',
          productId: 'product-1',
          quantity: 10,
          reserved: 10,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: '2',
          sku: 'OUT-OF-STOCK-2',
          productId: 'product-2',
          quantity: 0,
          reserved: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      mockPrismaService.inventoryItem.findMany.mockResolvedValue(
        mockInventoryItems,
      );

      const result = await service.getOutOfStockItems();

      expect(result).toHaveLength(2);
    });
  });
});
