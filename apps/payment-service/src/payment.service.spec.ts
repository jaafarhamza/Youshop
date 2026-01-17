import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';
import { ConfigService } from '@nestjs/config';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PrismaService,
  CustomLoggerService,
  CreateCheckoutSessionDto,
} from '../../../../Youshop/libs/common/src';

// Mock Stripe
// Mock Stripe
jest.mock('stripe', () => {
  const mockStripeInstance = {
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
    webhooks: {
      constructEvent: jest.fn(),
    },
  };
  return {
    default: jest.fn(() => mockStripeInstance),
    __esModule: true,
  };
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
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn((key) => {
      if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock';
      if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test_mock';
      if (key === 'STRIPE_CURRENCY') return 'USD';
      return null;
    }),
  };

  const mockLogger = {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: CustomLoggerService, useValue: mockLogger },
        { provide: EventEmitter2, useValue: mockEventEmitter },
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

  describe('handleWebhookEvent', () => {
    it('should emit payment.succeeded event on verified webhook', async () => {
      // Mock Stripe constructEvent
      (service['stripe'].webhooks.constructEvent as jest.Mock).mockReturnValue({
        id: 'evt_123',
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'sess_123',
            payment_intent: 'pi_123',
            metadata: { orderId: 'order-123' },
          },
        },
      } as any);

      mockPrismaService.payment.findUnique = jest.fn().mockResolvedValue({
        id: 'pay-123',
        stripeSessionId: 'sess_123',
        status: 'PENDING',
        orderId: 'order-123',
        amount: 100,
        currency: 'USD',
      });
      mockPrismaService.payment.update = jest.fn();
      mockPrismaService.order.findUnique = jest.fn();

      await service.handleWebhookEvent('sig', Buffer.from('payload'));

      expect(mockEventEmitter.emit).toHaveBeenCalledWith(
        'payment.succeeded',
        expect.objectContaining({
          orderId: 'order-123',
          paymentId: 'pay-123',
        }),
      );
    });
  });
});
