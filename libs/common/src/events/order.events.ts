export interface OrderItem {
  sku: string;
  quantity: number;
  unitPrice: number;
}

export class OrderCreatedEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly totalAmount: number,
    public readonly items: OrderItem[],
  ) {}
}

export class OrderCancelledEvent {
  constructor(
    public readonly orderId: string,
    public readonly userId: string,
    public readonly reason?: string,
  ) {}
}
