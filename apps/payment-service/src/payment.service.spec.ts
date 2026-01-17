import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { ConfigService } from '@nestjs/config';
import {
  PrismaService,
  CustomLoggerService,
  CreateCheckoutSessionDto,
} from '../../../../Youshop/libs/common/src';

// Mock Stripe
jest.mock('stripe', () => {
  return jest.fn().mockImplementation(() => ({
    checkout: {
      sessions: {
        create: jest.fn().mockResolvedValue({
          id: 'cs_test_mock',
          url: 'http://stripe.com/checkout',
          expires_at: 1700000000,
        }),
        retrieve: jest.fn(),
      },
    },
  }));
});

describe('PaymentService', () => {
  let service: PaymentService;

  const mockPrismaService = {
    order: {
      findUnique: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key) => {
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock';
      if (key === 'STRIPE_CURRENCY') return 'USD';
      return null;
    }),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLoggerService, useValue: mockLogger },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    const userId = 'user-123';
    const dto: CreateCheckoutSessionDto = { orderId: 'order-123' };
    const mockOrder = {
      id: 'order-123',
      userId: 'user-123',
      status: 'PENDING',
      total: 100,
      user: { email: 'test@example.com' },
      items: [
        {
          product: { name: 'Test Product' },
          quantity: 1,
          unitPrice: 100,
        },
      ],
    };

    it('should create a checkout session successfully', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(null);
      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.payment.create.mockResolvedValue({
        id: 'payment-123',
        orderId: 'order-123',
        amount: 100,
        currency: 'USD',
      });

      const result = await service.createCheckoutSession(userId, dto);

      expect(result).toEqual(
        expect.objectContaining({
          sessionId: 'cs_test_mock',
          checkoutUrl: 'http://stripe.com/checkout',
          paymentId: 'payment-123',
        }),
      );
    });

    it('should throw BadRequestException if order not found', async () => {
      mockPrismaService.payment.findFirst.mockResolvedValue(null);
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(
        service.createCheckoutSession(userId, dto),
      ).rejects.toThrow();
    });
  });
});
