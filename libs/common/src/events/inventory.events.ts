export class InventoryLowStockEvent {
  constructor(
    public readonly sku: string,
    public readonly productId: string,
    public readonly quantity: number,
    public readonly threshold: number,
    public readonly productName: string,
  ) {}
}
