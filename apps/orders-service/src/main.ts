import { NestFactory } from '@nestjs/core';
import { OrdersModule } from './orders.module';

async function bootstrap() {
  const app = await NestFactory.create(OrdersModule);
  await app.listen(Number(process.env.ORDERS_PORT || process.env.PORT) || 3004);
}
bootstrap().catch((err) => {
  console.error('Failed to start Orders Service:', err);
});
