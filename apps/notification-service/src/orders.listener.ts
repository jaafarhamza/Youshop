import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService, PaymentSucceededEvent } from 'y/common';
import { EmailService } from './email/email.service';

@Injectable()
export class OrdersListener {
  private readonly logger = new Logger(OrdersListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent('payment.succeeded')
  async handlePaymentSucceeded(event: PaymentSucceededEvent) {
    this.logger.log(
      `Received payment.succeeded event for order ${event.orderId}`,
    );

    try {
      // 1. Fetch order details with user and items
      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        include: {
          user: {
            select: {
              email: true,
            },
          },
          items: {
            include: {
              product: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
      });

      if (!order) {
        this.logger.error(`Order ${event.orderId} not found`);
        return;
      }

      // 2. Prepare context for the email template
      const context = {
        orderId: order.id,
        customerName: order.user.email.split('@')[0], // Basic customer name from email
        currency: event.currency || 'USD',
        subtotal: order.subtotal,
        tax: order.tax,
        total: order.total,
        items: order.items.map((item) => ({
          name: item.product.name,
          quantity: item.quantity,
          price: item.unitPrice,
          currency: event.currency || 'USD',
        })),
      };

      // 3. Send the order confirmation email
      await this.emailService.sendEmail(
        order.user.email,
        `Order Confirmation - #${order.id.substring(0, 8).toUpperCase()}`,
        'order-confirmation',
        context,
      );

      this.logger.log(`Order confirmation email queued for order ${order.id}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to process payment success for order ${event.orderId}: ${errorMessage}`,
      );
    }
  }
}
