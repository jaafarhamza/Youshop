import { Controller, Post, Body } from '@nestjs/common';
import { EmailService } from './email/email.service';

@Controller('notifications')
export class NotificationServiceController {
  constructor(private readonly emailService: EmailService) {}

  @Post('test-email')
  async testEmail(@Body('to') to: string) {
    return this.emailService.sendEmail(
      to,
      'Test Email - Youshop',
      'order-confirmation',
      {
        orderId: 'TEST-12345',
        customerName: 'Test User',
        currency: 'USD',
        items: [
          { name: 'Awesome Product', quantity: 2, price: 50, currency: 'USD' },
          { name: 'Great Essential', quantity: 1, price: 30, currency: 'USD' },
        ],
        subtotal: 130,
        tax: 15,
        total: 145,
      },
    );
  }
}
