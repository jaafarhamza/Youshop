import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { PaymentSucceededEvent } from '../events/payment.events';

@Injectable()
export class NotificationsListener {
  private readonly logger = new Logger(NotificationsListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('payment.succeeded')
  async handlePaymentSuccess(event: PaymentSucceededEvent) {
    this.logger.log(
      `Handling payment success event for order ${event.orderId}`,
    );
    try {
      await this.notificationsService.createNotification({
        userId: event.userId,
        type: 'payment:success',
        title: 'Payment Successful',
        message: `Your payment of ${event.amount} ${event.currency} for order ${event.orderId} was successful!`,
        data: {
          orderId: event.orderId,
          amount: event.amount,
          currency: event.currency,
          paymentId: event.paymentId,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Error handling payment success notification: ${message}`,
      );
    }
  }
}
