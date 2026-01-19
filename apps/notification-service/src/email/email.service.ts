import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import type { Queue } from 'bull';
import { PrismaService } from 'y/common/database/prisma.service';
import { EmailStatus } from '@prisma/client';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async sendEmail(
    to: string,
    subject: string,
    template: string,
    context: Record<string, unknown>,
  ): Promise<string> {
    try {
      // 1. Log the email in the database
      const emailLog = await this.prisma.emailLog.create({
        data: {
          to,
          subject,
          template,
          status: EmailStatus.PENDING,
          attempts: 0,
        },
      });

      // 2. Add to Bull queue
      await this.emailQueue.add(
        'sendEmail',
        {
          logId: emailLog.id,
          to,
          subject,
          template,
          context,
        },
        {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
          removeOnComplete: true,
        },
      );

      this.logger.log(`Email queued for ${to} with template ${template}`);
      return emailLog.id;
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to queue email to ${to}: ${errorMessage}`);
      throw error;
    }
  }
}
