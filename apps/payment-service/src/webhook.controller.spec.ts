import { Test, TestingModule } from '@nestjs/testing';
import { WebhookController } from './webhook.controller';
import { PaymentService } from './payment.service';
import { BadRequestException } from '@nestjs/common';
import { Request } from 'express';

describe('WebhookController', () => {
  let controller: WebhookController;
  let service: PaymentService;

  const mockPaymentService = {
    handleWebhookEvent: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WebhookController],
      providers: [{ provide: PaymentService, useValue: mockPaymentService }],
    }).compile();

    controller = module.get<WebhookController>(WebhookController);
    service = module.get<PaymentService>(PaymentService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleWebhook', () => {
    it('should process valid webhook request', async () => {
      const signature = 'valid_signature';
      const rawBody = Buffer.from('payload');
      const req = { rawBody };

      mockPaymentService.handleWebhookEvent.mockResolvedValue(undefined);

      const result = await controller.handleWebhook(signature, req);

      expect(result).toEqual({ received: true });
      expect(service.handleWebhookEvent).toHaveBeenCalledWith(
        signature,
        rawBody,
      );
    });

    it('should throw BadRequestException if signature missing', async () => {
      const req = { rawBody: Buffer.from('payload') };
      await expect(controller.handleWebhook('', req)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if rawBody missing', async () => {
      const req = {};
      await expect(controller.handleWebhook('sig', req)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
