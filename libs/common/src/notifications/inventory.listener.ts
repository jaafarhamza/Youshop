import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { InventoryLowStockEvent } from '../events/inventory.events';

@Injectable()
export class InventoryListener {
  private readonly logger = new Logger(InventoryListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent('inventory.low-stock')
  async handleLowStock(event: InventoryLowStockEvent) {
    this.logger.log(`Handling low stock alert for SKU ${event.sku}`);
    try {
      await this.notificationsService.notifyAdmins({
        type: 'inventory:low-stock',
        title: 'Low Stock Alert',
        message: `Product "${event.productName}" (SKU: ${event.sku}) is low on stock: ${event.quantity} remaining (Threshold: ${event.threshold}).`,
        data: {
          sku: event.sku,
          productId: event.productId,
          quantity: event.quantity,
          threshold: event.threshold,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error handling low stock notification: ${message}`);
    }
  }
}
