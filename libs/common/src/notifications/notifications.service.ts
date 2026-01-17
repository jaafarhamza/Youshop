import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { Prisma, Notification, RoleEnum, PrismaClient } from '@prisma/client';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  async createNotification(data: {
    userId: string;
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): Promise<Notification> {
    const prisma = this.prisma as PrismaClient;
    try {
      // 1. Persist to Database
      const notification = await prisma.notification.create({
        data: {
          userId: data.userId,
          type: data.type,
          title: data.title,
          message: data.message,
          data: (data.data || {}) as Prisma.InputJsonValue,
          read: false,
          sentViaWS: false,
        },
      });

      // 2. Send via WebSocket
      await this.sendToUser(data.userId, 'notification', notification);

      this.logger.log(
        `Notification created for user ${data.userId}: ${data.title}`,
      );
      return notification;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to create notification: ${message}`);
      throw error;
    }
  }

  async notifyAdmins(data: {
    type: string;
    title: string;
    message: string;
    data?: Record<string, unknown>;
  }): Promise<void> {
    const prisma = this.prisma as PrismaClient;
    try {
      // 1. Find all admins
      const admins = await prisma.user.findMany({
        where: { roles: { has: RoleEnum.ADMIN } },
        select: { id: true },
      });

      if (admins.length === 0) {
        this.logger.warn('No admins found to notify');
        return;
      }

      // 2. Persist notifications for each admin
      const notifications = await Promise.all(
        admins.map((admin) =>
          prisma.notification.create({
            data: {
              userId: admin.id,
              type: data.type,
              title: data.title,
              message: data.message,
              data: (data.data || {}) as Prisma.InputJsonValue,
              read: false,
              sentViaWS: false,
            },
          }),
        ),
      );

      // 3. Send via WebSocket to 'admin' room
      if (this.notificationsGateway.server) {
        this.notificationsGateway.server
          .to('admin')
          .emit('notification', { ...data, createdAt: new Date() });

        // Update sentViaWS for the persisted records
        await prisma.notification.updateMany({
          where: { id: { in: notifications.map((n) => n.id) } },
          data: { sentViaWS: true },
        });
      }

      this.logger.log(`Notified ${admins.length} admins: ${data.title}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to notify admins: ${message}`);
    }
  }

  private async sendToUser(
    userId: string,
    event: string,
    payload: Notification,
  ): Promise<void> {
    const prisma = this.prisma as PrismaClient;
    if (this.notificationsGateway.server) {
      this.notificationsGateway.server
        .to(`user:${userId}`)
        .emit(event, payload);

      try {
        await prisma.notification.updateMany({
          where: { id: payload.id },
          data: { sentViaWS: true },
        });
      } catch (err: unknown) {
        this.logger.warn(
          'Failed to update sentViaWS status',
          err instanceof Error ? err.stack : undefined,
        );
      }
    }
  }
}
