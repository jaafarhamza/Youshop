import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service';
import { NotificationsGateway } from './notifications.gateway';
import { Prisma, Notification } from '@prisma/client';

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
  }) {
    try {
      // 1. Persist to Database
      const notification = await this.prisma.notification.create({
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

  private async sendToUser(
    userId: string,
    event: string,
    payload: Notification,
  ) {
    if (this.notificationsGateway.server) {
      this.notificationsGateway.server
        .to(`user:${userId}`)
        .emit(event, payload);

      this.prisma.notification
        .updateMany({
          where: { id: payload.id },
          data: { sentViaWS: true },
        })
        .catch((err: unknown) => {
          this.logger.warn(
            'Failed to update sentViaWS status',
            err instanceof Error ? err.stack : undefined,
          );
        });
    }
  }
}
