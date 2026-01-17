import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PaymentSucceededEvent, PaymentFailedEvent } from 'y/common';
import { OrdersService } from './orders.service';
import { CustomLoggerService } from 'y/common';

@Injectable()
export class OrdersListener {
  constructor(
    private readonly ordersService: OrdersService,
    private readonly logger: CustomLoggerService,
  ) {}

  @OnEvent('payment.succeeded')
  async handlePaymentSucceeded(event: PaymentSucceededEvent) {
    this.logger.log(
      `Received payment.succeeded event for Order ${event.orderId}`,
      'OrdersListener',
    );
    try {
      await this.ordersService.completeOrder(
        event.orderId,
        event.paymentId,
        event.stripePaymentId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to complete order ${event.orderId}`,
        error instanceof Error ? error.stack : '',
        'OrdersListener',
      );
    }
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(event: PaymentFailedEvent) {
    this.logger.warn(
      `Received payment.failed event for Order ${event.orderId}: ${event.failureReason}`,
      'OrdersListener',
    );
    try {
      await this.ordersService.cancelOrder(
        (event.metadata?.userId as string) || 'system',
        event.orderId,
      );
    } catch (error) {
      this.logger.error(
        `Failed to cancel order ${event.orderId}`,
        error instanceof Error ? error.stack : '',
        'OrdersListener',
      );
    }
  }
}
