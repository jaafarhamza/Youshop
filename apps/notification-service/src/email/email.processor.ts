import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { PrismaService } from 'y/common/database/prisma.service';
import { EmailStatus } from '@prisma/client';
import { TemplateService } from './template.service';
import { EmailProvider } from './providers/email-provider.interface';

interface EmailJobData {
  logId: string;
  to: string;
  subject: string;
  template: string;
  context: Record<string, unknown>;
  attachments?: Array<{
    filename: string;
    content: string | Buffer;
    contentType?: string;
  }>;
}

@Processor('email')
export class EmailProcessor {
  private readonly logger = new Logger(EmailProcessor.name);

  constructor(
    private readonly provider: EmailProvider,
    private readonly prisma: PrismaService,
    private readonly templateService: TemplateService,
  ) {}

  @Process('sendEmail')
  async handleSendEmail(job: Job<EmailJobData>) {
    const { logId, to, subject, template, context } = job.data;

    this.logger.debug(`Processing email job ${job.id} for ${to}`);

    try {
      // 1. Update attempts
      await this.prisma.emailLog.update({
        where: { id: logId },
        data: { attempts: { increment: 1 } },
      });

      // 2. Render template
      const html = this.templateService.compileTemplate(template, context);

      // 3. Send email using strategy provider
      await this.provider.send({
        to,
        subject,
        html,
        attachments: job.data.attachments,
      });

      // 4. Update status to SENT
      await this.prisma.emailLog.update({
        where: { id: logId },
        data: {
          status: EmailStatus.SENT,
          sentAt: new Date(),
        },
      });

      this.logger.log(`Email ${logId} sent successfully to ${to}`);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Failed to send email ${logId} to ${to}: ${errorMessage}`,
      );

      // Update status to FAILED if it was the last attempt
      if (job.attemptsMade + 1 >= (job.opts.attempts || 1)) {
        await this.prisma.emailLog.update({
          where: { id: logId },
          data: {
            status: EmailStatus.FAILED,
            error: errorMessage,
          },
        });
      }

      throw error; // Rethrow to let Bull handle retry
    }
  }
}
