import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  PrismaService,
  CustomLoggerService,
  PaymentSucceededEvent,
  PaymentFailedEvent,
  OrderCreatedEvent,
  OrderCancelledEvent,
} from 'y/common';
import { EmailService } from './email/email.service';
import { PDFService } from './email/pdf.service';

@Injectable()
export class OrdersListener {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly pdfService: PDFService,
    private readonly logger: CustomLoggerService,
  ) {}

  @OnEvent('order.created')
  async handleOrderCreated(event: OrderCreatedEvent) {
    this.logger.log(
      `Processing order.created for order ${event.orderId}`,
      'OrdersListener',
    );

    try {
      // Idempotency check: Have we already sent an 'order-received' email for this order?
      const existingEmail = await this.prisma.emailLog.findFirst({
        where: {
          to: event.userId, // This might be userId or email, let's fetch email to be sure
          subject: { contains: event.orderId },
          template: 'order-received',
        },
      });

      if (existingEmail) {
        this.logger.warn(
          `Order received email already processed for order ${event.orderId}`,
          'OrdersListener',
        );
        return;
      }

      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        include: { user: true },
      });

      if (!order) {
        this.logger.error(
          `Order ${event.orderId} not found`,
          '',
          'OrdersListener',
        );
        return;
      }

      const context = {
        orderId: order.id,
        customerName: order.user.email.split('@')[0],
        total: event.totalAmount,
        itemsCount: event.items.length,
      };

      await this.emailService.sendEmail(
        order.user.email,
        `Order Received - #${order.id.substring(0, 8).toUpperCase()}`,
        'order-received',
        context,
      );

      this.logger.log(
        `Order received email queued for order ${order.id}`,
        'OrdersListener',
      );
    } catch (error) {
      this.logger.error(
        `Failed to process order.created for ${event.orderId}`,
        error instanceof Error ? error.stack : '',
        'OrdersListener',
      );
    }
  }

  @OnEvent('order.cancelled')
  async handleOrderCancelled(event: OrderCancelledEvent) {
    this.logger.log(
      `Processing order.cancelled for order ${event.orderId}`,
      'OrdersListener',
    );

    try {
      // Idempotency
      const existingEmail = await this.prisma.emailLog.findFirst({
        where: {
          subject: { contains: event.orderId },
          template: 'order-cancelled',
        },
      });

      if (existingEmail) return;

      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        include: { user: true },
      });

      if (!order) return;

      await this.emailService.sendEmail(
        order.user.email,
        `Order Cancelled - #${order.id.substring(0, 8).toUpperCase()}`,
        'order-cancelled',
        {
          orderId: order.id,
          customerName: order.user.email.split('@')[0],
          reason: event.reason || 'Requested by user',
        },
      );

      this.logger.log(
        `Order cancellation email queued for order ${order.id}`,
        'OrdersListener',
      );
    } catch (error) {
      this.logger.error(
        `Failed to process order.cancelled for ${event.orderId}`,
        error instanceof Error ? error.stack : '',
        'OrdersListener',
      );
    }
  }

  @OnEvent('payment.succeeded')
  async handlePaymentSucceeded(event: PaymentSucceededEvent) {
    this.logger.log(
      `Processing payment.succeeded for order ${event.orderId}`,
      'OrdersListener',
    );

    try {
      // Idempotency
      const existingEmail = await this.prisma.emailLog.findFirst({
        where: {
          subject: { contains: event.orderId },
          template: 'order-confirmation',
        },
      });

      if (existingEmail) {
        this.logger.warn(
          `Order confirmation already sent for ${event.orderId}`,
          'OrdersListener',
        );
        return;
      }

      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        include: {
          user: true,
          items: { include: { product: true } },
        },
      });

      if (!order) return;

      const context = {
        orderId: order.id,
        customerName: order.user.email.split('@')[0],
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

      let pdfBuffer: Buffer | undefined;
      try {
        pdfBuffer = await this.pdfService.generateInvoice({
          ...context,
          customerEmail: order.user.email,
          paidAt: order.paidAt || new Date(),
        });
      } catch (pdfError) {
        this.logger.error(
          `PDF generation failed: ${pdfError instanceof Error ? pdfError.message : String(pdfError)}`,
          '',
          'OrdersListener',
        );
      }

      await this.emailService.sendEmail(
        order.user.email,
        `Order Confirmation - #${order.id.substring(0, 8).toUpperCase()}`,
        'order-confirmation',
        context,
        pdfBuffer
          ? [
              {
                filename: `invoice-${order.id.substring(0, 8)}.pdf`,
                content: pdfBuffer,
                contentType: 'application/pdf',
              },
            ]
          : undefined,
      );

      this.logger.log(
        `Order confirmation email queued for order ${order.id}`,
        'OrdersListener',
      );
    } catch (error) {
      this.logger.error(
        `Failed to process payment.succeeded for ${event.orderId}`,
        error instanceof Error ? error.stack : '',
        'OrdersListener',
      );
    }
  }

  @OnEvent('payment.failed')
  async handlePaymentFailed(event: PaymentFailedEvent) {
    this.logger.log(
      `Processing payment.failed for order ${event.orderId}`,
      'OrdersListener',
    );

    try {
      // Idempotency
      const existingEmail = await this.prisma.emailLog.findFirst({
        where: {
          subject: { contains: event.orderId },
          template: 'payment-failed',
        },
      });

      if (existingEmail) return;

      const order = await this.prisma.order.findUnique({
        where: { id: event.orderId },
        include: { user: true },
      });

      if (!order) return;

      await this.emailService.sendEmail(
        order.user.email,
        `Payment Failed - Order #${order.id.substring(0, 8).toUpperCase()}`,
        'payment-failed',
        {
          orderId: order.id,
          customerName: order.user.email.split('@')[0],
          failureReason: event.failureReason || 'An unknown error occurred.',
          retryUrl: `${process.env.FRONTEND_URL || 'http://localhost:3006'}/checkout/payment/${order.id}`,
        },
      );

      this.logger.log(
        `Payment failed email queued for order ${order.id}`,
        'OrdersListener',
      );
    } catch (error) {
      this.logger.error(
        `Failed to process payment.failed for ${event.orderId}`,
        error instanceof Error ? error.stack : '',
        'OrdersListener',
      );
    }
  }
}
