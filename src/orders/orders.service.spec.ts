import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { CustomLoggerService } from '../common/logger/logger.service';
import { ConfigService } from '@nestjs/config';
import { InventoryService } from '../inventory/inventory.service';

describe('OrdersService Calculation Logic', () => {
  let service: OrdersService;
  let configService: ConfigService;

  const mockPrismaService = {};
  const mockLoggerService = {};
  const mockInventoryService = {};
  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    mockConfigService.get.mockReturnValue(20);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: CustomLoggerService, useValue: mockLoggerService },
        { provide: InventoryService, useValue: mockInventoryService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should calculate totals correctly for a single item', () => {
    const items = [{ sku: 'ITEM-1', quantity: 1 }];
    const productMap = new Map([['ITEM-1', { price: 100 }]]);

    const result = service.calculateOrderTotals(items, productMap);

    expect(result.subtotal).toBe(100);
    expect(result.tax).toBe(20);
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

    expect(result.subtotal).toBe(250);
    expect(result.tax).toBe(50);
    expect(result.total).toBe(300);
  });

  it('should handle floating point precision correctly', () => {
    const items = [{ sku: 'ITEM-1', quantity: 1 }];
    const productMap = new Map([['ITEM-1', { price: 19.99 }]]);

    const result = service.calculateOrderTotals(items, productMap);

    expect(result.subtotal).toBe(19.99);
    expect(result.tax).toBe(4);
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
        { provide: InventoryService, useValue: mockInventoryService },
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
    const productMap = new Map();

    const result = service.calculateOrderTotals(items, productMap);

    expect(result.subtotal).toBe(0);
    expect(result.tax).toBe(0);
    expect(result.total).toBe(0);
  });
});
