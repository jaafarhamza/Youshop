import { NestFactory } from '@nestjs/core';
import { PaymentModule } from './payment.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('PaymentService');
  const app = await NestFactory.create(PaymentModule);
  const port = Number(process.env.PAYMENT_PORT || process.env.PORT) || 3005;
  await app.listen(port);
  logger.log(`Payment Service is running on: http://localhost:${port}`);
}
bootstrap().catch((err) => {
  console.error('Failed to start Payment Service:', err);
});
