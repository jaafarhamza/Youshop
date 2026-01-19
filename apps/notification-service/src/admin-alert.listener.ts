import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  PrismaService,
  CustomLoggerService,
  InventoryLowStockEvent,
  InventoryOutOfStockEvent,
} from 'y/common';
import { EmailService } from './email/email.service';
import { RoleEnum } from '@prisma/client';

@Injectable()
export class AdminAlertListener {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
    private readonly logger: CustomLoggerService,
  ) {}

  @OnEvent('inventory.low-stock')
  async handleLowStock(event: InventoryLowStockEvent) {
    this.logger.log(
      `Received inventory.low-stock event for SKU ${event.sku}`,
      'AdminAlertListener',
    );

    try {
      const admins = await this.prisma.user.findMany({
        where: { roles: { has: RoleEnum.ADMIN } },
        select: { email: true },
      });

      if (admins.length === 0) {
        this.logger.warn(
          'No admin users found for low stock alert',
          'AdminAlertListener',
        );
        return;
      }

      const context = {
        productName: event.productName,
        sku: event.sku,
        quantity: event.quantity,
        threshold: event.threshold,
        inventoryUrl: `${process.env.FRONTEND_URL || 'http://localhost:3006'}/admin/inventory`,
      };

      await Promise.all(
        admins.map((admin) =>
          this.emailService.sendEmail(
            admin.email,
            `Low Stock Alert: ${event.productName}`,
            'low-stock-alert',
            context,
          ),
        ),
      );

      this.logger.log(
        `Low stock alerts sent to ${admins.length} admins`,
        'AdminAlertListener',
      );
    } catch (error) {
      this.logger.error(
        `Failed to process low stock alert for SKU ${event.sku}`,
        error instanceof Error ? error.stack : '',
        'AdminAlertListener',
      );
    }
  }

  @OnEvent('inventory.out-of-stock')
  async handleOutOfStock(event: InventoryOutOfStockEvent) {
    this.logger.error(
      `CRITICAL: Inventory out of stock for SKU ${event.sku}`,
      '',
      'AdminAlertListener',
    );

    try {
      const admins = await this.prisma.user.findMany({
        where: { roles: { has: RoleEnum.ADMIN } },
        select: { email: true },
      });

      if (admins.length === 0) return;

      const context = {
        productName: event.productName,
        sku: event.sku,
        inventoryUrl: `${process.env.FRONTEND_URL || 'http://localhost:3006'}/admin/inventory`,
      };

      await Promise.all(
        admins.map((admin) =>
          this.emailService.sendEmail(
            admin.email,
            `URGENT: Out of Stock Alert - ${event.productName}`,
            'out-of-stock-alert', // I hope this template exists or I'll create it
            context,
          ),
        ),
      );

      this.logger.log(
        `Out of stock alerts sent to ${admins.length} admins`,
        'AdminAlertListener',
      );
    } catch (error) {
      this.logger.error(
        `Failed to process out of stock alert for SKU ${event.sku}`,
        error instanceof Error ? error.stack : '',
        'AdminAlertListener',
      );
    }
  }
}
