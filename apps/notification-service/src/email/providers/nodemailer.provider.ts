import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { EmailProvider, SendEmailOptions } from './email-provider.interface';

@Injectable()
export class NodemailerProvider extends EmailProvider {
  constructor(private readonly mailerService: MailerService) {
    super();
  }

  async send(options: SendEmailOptions): Promise<void> {
    await this.mailerService.sendMail({
      to: options.to,
      subject: options.subject,
      html: options.html,
      attachments: options.attachments,
    });
  }

  getName(): string {
    return 'nodemailer';
  }
}
