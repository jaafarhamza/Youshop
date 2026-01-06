export class OrderPreviewResponseDto {
  items!: {
    sku: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }[];
  subtotal!: number;
  tax!: number;
  total!: number;
}
