import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService, InventoryLowStockEvent } from 'y/common';
import { EmailService } from './email/email.service';
import { RoleEnum } from '@prisma/client';

@Injectable()
export class AdminAlertListener {
  private readonly logger = new Logger(AdminAlertListener.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  @OnEvent('inventory.low-stock')
  async handleLowStock(event: InventoryLowStockEvent) {
    this.logger.log(`Received inventory.low-stock event for SKU ${event.sku}`);

    try {
      // 1. Find all admin users
      const admins = await this.prisma.user.findMany({
        where: { roles: { has: RoleEnum.ADMIN } },
        select: { email: true },
      });

      if (admins.length === 0) {
        this.logger.warn(
          'No admin users found to receive low stock email alert',
        );
        return;
      }

      // 2. Prepare context
      const context = {
        productName: event.productName,
        sku: event.sku,
        quantity: event.quantity,
        threshold: event.threshold,
        inventoryUrl: `${process.env.FRONTEND_URL || 'http://localhost:3006'}/admin/inventory`,
      };

      // 3. Send email to each admin
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
        `Low stock email alerts queued for ${admins.length} admins`,
      );
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to process low stock alert for SKU ${event.sku}: ${errorMessage}`,
      );
    }
  }
}
