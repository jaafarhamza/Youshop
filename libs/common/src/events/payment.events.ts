export class PaymentSucceededEvent {
  constructor(
    public readonly orderId: string,
    public readonly paymentId: string,
    public readonly stripePaymentId: string | null,
    public readonly amount: number,
    public readonly currency: string,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}

export class PaymentFailedEvent {
  constructor(
    public readonly orderId: string,
    public readonly failureReason: string,
    public readonly metadata?: Record<string, unknown>,
  ) {}
}
