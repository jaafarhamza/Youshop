import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { NotificationServiceController } from './notification-service.controller';
import { NotificationServiceService } from './notification-service.service';
import { EmailService } from './email/email.service';
import { EmailProcessor } from './email/email.processor';
import { TemplateService } from './email/template.service';
import { PrismaModule, CommonModule } from 'y/common';
import { OrdersListener } from './orders.listener';
import { PDFService } from './email/pdf.service';
import { AdminAlertListener } from './admin-alert.listener';
import { EmailProvider } from './email/providers/email-provider.interface';
import { NodemailerProvider } from './email/providers/nodemailer.provider';

@Module({
  imports: [
    PrismaModule,
    CommonModule,
    ConfigModule.forRoot({ isGlobal: true }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        redis: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'email',
    }),
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        transport: {
          host: configService.get('MAIL_HOST'),
          port: parseInt(configService.get('MAIL_PORT', '587'), 10),
          auth: {
            user: configService.get('MAIL_USER'),
            pass: configService.get('MAIL_PASSWORD'),
          },
        },
        defaults: {
          from: configService.get('MAIL_FROM'),
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [NotificationServiceController],
  providers: [
    NotificationServiceService,
    EmailService,
    EmailProcessor,
    TemplateService,
    OrdersListener,
    PDFService,
    AdminAlertListener,
    {
      provide: EmailProvider,
      useClass: NodemailerProvider,
    },
  ],
  exports: [EmailService],
})
export class NotificationServiceModule {}
