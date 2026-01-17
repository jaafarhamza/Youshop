import { Test, TestingModule } from '@nestjs/testing';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { CheckoutSessionResponseDto, CreateCheckoutSessionDto } from 'y/common';
import { ConfigService } from '@nestjs/config';

describe('PaymentController', () => {
  let controller: PaymentController;
  let service: PaymentService;

  const mockPaymentService = {
    createCheckoutSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentController],
      providers: [
        { provide: PaymentService, useValue: mockPaymentService },
        { provide: ConfigService, useValue: {} }, // Mock config if needed
      ],
    }).compile();

    controller = module.get<PaymentController>(PaymentController);
    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createCheckoutSession', () => {
    it('should return checkout session details', async () => {
      const userId = 'user-123';
      const dto: CreateCheckoutSessionDto = { orderId: 'order-uuid' };
      const expectedResult: CheckoutSessionResponseDto = {
        sessionId: 'sess_123',
        checkoutUrl: 'http://url',
        expiresAt: '2023-01-01',
        paymentId: 'pay_123',
        orderId: 'order-uuid',
        amount: 100,
        currency: 'USD',
      };

      mockPaymentService.createCheckoutSession.mockResolvedValue(
        expectedResult,
      );

      // Emulate @CurrentUser decorator behavior?
      // In unit test we call the method directly with arguments.
      const result = await controller.createCheckoutSession(userId, dto);

      expect(result).toBe(expectedResult);
      expect(service.createCheckoutSession).toHaveBeenCalledWith(userId, dto);
    });
  });
});
