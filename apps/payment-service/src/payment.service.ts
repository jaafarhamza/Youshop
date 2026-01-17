import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import {
  PrismaService,
  CustomLoggerService,
  CreateCheckoutSessionDto,
  CheckoutSessionResponseDto,
} from 'y/common';
import { plainToInstance } from 'class-transformer';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class PaymentService {
  private readonly stripe: Stripe;
  private readonly successUrl: string;
  private readonly cancelUrl: string;
  private readonly currency: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly logger: CustomLoggerService,
    private readonly configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!stripeSecretKey) {
      this.logger.error(
        'STRIPE_SECRET_KEY is not configured',
        undefined,
        'PaymentService',
      );
      throw new Error('Payment service configuration error');
    }

    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-12-15.clover',
      typescript: true,
    });

    this.successUrl =
      this.configService.get<string>('STRIPE_SUCCESS_URL') ||
      'http://localhost:3000/payment/success';
    this.cancelUrl =
      this.configService.get<string>('STRIPE_CANCEL_URL') ||
      'http://localhost:3000/payment/cancel';
    this.currency = this.configService.get<string>('STRIPE_CURRENCY') || 'USD';

    this.logger.log('Payment Service initialized', 'PaymentService');
  }

  async createCheckoutSession(
    userId: string,
    dto: CreateCheckoutSessionDto,
  ): Promise<CheckoutSessionResponseDto> {
    this.logger.log(
      `Creating checkout session for order: ${dto.orderId}, user: ${userId}`,
      'PaymentService',
    );

    // Check for existing pending payment (idempotency)
    const existingPayment = await this.checkIdempotency(dto.orderId);
    if (existingPayment) {
      this.logger.warn(
        `Payment already exists for order: ${dto.orderId}`,
        'PaymentService',
      );

      // If session still valid, return existing session
      if (
        existingPayment.stripeSessionId &&
        existingPayment.status === PaymentStatus.PENDING
      ) {
        try {
          const session = await this.stripe.checkout.sessions.retrieve(
            existingPayment.stripeSessionId,
          );

          if (
            session.status === 'open' &&
            session.expires_at &&
            session.expires_at * 1000 > Date.now()
          ) {
            this.logger.log(
              `Returning existing valid session: ${session.id}`,
              'PaymentService',
            );

            return plainToInstance(CheckoutSessionResponseDto, {
              sessionId: session.id,
              checkoutUrl: session.url,
              expiresAt: new Date(session.expires_at * 1000).toISOString(),
              paymentId: existingPayment.id,
              orderId: existingPayment.orderId,
              amount: existingPayment.amount,
              currency: existingPayment.currency,
            });
          }
        } catch {
          this.logger.warn(
            `Existing session expired or invalid: ${existingPayment.stripeSessionId}`,
            'PaymentService',
          );
        }
      }

      throw new ConflictException(
        'Payment already exists for this order. Please contact support if you need assistance.',
      );
    }

    // Validate and retrieve order
    const order = await this.validateOrder(dto.orderId, userId);

    // Calculate line items from order
    const lineItems = this.calculateLineItems(order);

    // Create idempotency key
    const idempotencyKey = `${order.id}-${Date.now()}`;

    try {
      // Create Stripe Checkout Session
      const session = await this.stripe.checkout.sessions.create(
        {
          payment_method_types: ['card'],
          line_items: lineItems,
          mode: 'payment',
          success_url: dto.successUrl || this.successUrl,
          cancel_url: dto.cancelUrl || this.cancelUrl,
          client_reference_id: order.id,
          customer_email: order.user.email,
          metadata: {
            orderId: order.id,
            userId: userId,
          },
          expires_at: Math.floor(Date.now() / 1000) + 86400, // 24 hours
        },
        {
          idempotencyKey,
        },
      );

      this.logger.log(
        `Stripe checkout session created: ${session.id}`,
        'PaymentService',
      );

      // Create payment record in database
      const payment = await this.createPaymentRecord(
        order.id,
        session.id,
        order.total,
        idempotencyKey,
      );

      this.logger.log(
        `Payment record created: ${payment.id} for order: ${order.id}`,
        'PaymentService',
      );

      // Return response DTO
      return plainToInstance(CheckoutSessionResponseDto, {
        sessionId: session.id,
        checkoutUrl: session.url,
        expiresAt: session.expires_at
          ? new Date(session.expires_at * 1000).toISOString()
          : new Date(Date.now() + 86400000).toISOString(),
        paymentId: payment.id,
        orderId: order.id,
        amount: payment.amount,
        currency: payment.currency,
      });
    } catch (error) {
      this.logger.error(
        `Failed to create checkout session for order: ${dto.orderId}`,
        error instanceof Error ? error.stack : String(error),
        'PaymentService',
      );

      if (error instanceof Stripe.errors.StripeError) {
        throw new BadRequestException(
          `Payment service error: ${error.message}`,
        );
      }

      throw new BadRequestException('Failed to create checkout session');
    }
  }

  // Validate order exists, belongs to user, and is in PENDING status

  private async validateOrder(
    orderId: string,
    userId: string,
  ): Promise<{
    id: string;
    userId: string;
    status: OrderStatus;
    total: number;
    user: { email: string };
    items: Array<{
      product: { name: string };
      quantity: number;
      unitPrice: number;
    }>;
  }> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        user: {
          select: { email: true },
        },
        items: {
          include: {
            product: {
              select: { name: true },
            },
          },
        },
      },
    });

    if (!order) {
      this.logger.warn(`Order not found: ${orderId}`, 'PaymentService');
      throw new NotFoundException('Order not found');
    }

    // Check order ownership
    if (order.userId !== userId) {
      this.logger.warn(
        `Unauthorized payment attempt: user ${userId} trying to pay order ${orderId} owned by ${order.userId}`,
        'PaymentService',
      );
      throw new ForbiddenException('You can only pay for your own orders');
    }

    // Check order status
    if (order.status !== OrderStatus.PENDING) {
      this.logger.warn(
        `Invalid order status for payment: ${order.status} for order ${orderId}`,
        'PaymentService',
      );
      throw new BadRequestException(
        `Cannot create payment for order with status: ${order.status}`,
      );
    }

    return order;
  }

  // Calculate Stripe line items from order

  private calculateLineItems(order: {
    total: number;
    items: Array<{
      product: { name: string };
      quantity: number;
      unitPrice: number;
    }>;
  }): Stripe.Checkout.SessionCreateParams.LineItem[] {
    return order.items.map((item) => ({
      price_data: {
        currency: this.currency.toLowerCase(),
        product_data: {
          name: item.product.name,
        },
        unit_amount: Math.round(item.unitPrice * 100), // Convert to cents
      },
      quantity: item.quantity,
    }));
  }

  // Create payment record in database

  private async createPaymentRecord(
    orderId: string,
    sessionId: string,
    amount: number,
    idempotencyKey: string,
  ): Promise<{
    id: string;
    orderId: string;
    amount: number;
    currency: string;
  }> {
    return await this.prisma.payment.create({
      data: {
        orderId,
        stripeSessionId: sessionId,
        amount,
        currency: this.currency,
        status: PaymentStatus.PENDING,
        idempotencyKey,
        metadata: {
          createdVia: 'checkout_session',
          sessionId,
        },
      },
      select: {
        id: true,
        orderId: true,
        amount: true,
        currency: true,
      },
    });
  }

  // Check if payment already exists for order (idempotency)

  private async checkIdempotency(orderId: string): Promise<{
    id: string;
    orderId: string;
    stripeSessionId: string | null;
    amount: number;
    currency: string;
    status: PaymentStatus;
  } | null> {
    return await this.prisma.payment.findFirst({
      where: {
        orderId,
        status: {
          in: [PaymentStatus.PENDING, PaymentStatus.PROCESSING],
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
      select: {
        id: true,
        orderId: true,
        stripeSessionId: true,
        amount: true,
        currency: true,
        status: true,
      },
    });
  }
}
