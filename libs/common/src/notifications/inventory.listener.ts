import { Injectable, Logger, Inject } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationsService } from './notifications.service';
import { InventoryLowStockEvent } from '../events/inventory.events';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';

@Injectable()
export class InventoryListener {
  private readonly logger = new Logger(InventoryListener.name);
  private readonly THROTTLE_TTL = 3600000; // 1 hour in ms

  constructor(
    private readonly notificationsService: NotificationsService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
  ) {}

  @OnEvent('inventory.low-stock')
  async handleLowStock(event: InventoryLowStockEvent) {
    const cacheKey = `low-stock-alert:${event.sku}`;

    try {
      // 1. Check if alert was recently sent
      const isThrottled = await this.cacheManager.get(cacheKey);
      if (isThrottled) {
        this.logger.log(`Low stock alert for SKU ${event.sku} is throttled.`);
        return;
      }

      this.logger.log(`Handling low stock alert for SKU ${event.sku}`);

      // 2. Notify Admins
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

      // 3. Set throttle key in cache
      await this.cacheManager.set(cacheKey, true, this.THROTTLE_TTL);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Error handling low stock notification: ${message}`);
    }
  }
}
