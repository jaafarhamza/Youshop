import { NestFactory } from '@nestjs/core';
import { InventoryModule } from './inventory.module';

async function bootstrap() {
  const app = await NestFactory.create(InventoryModule);
  await app.listen(
    Number(process.env.INVENTORY_PORT || process.env.PORT) || 3003,
  );
}
bootstrap().catch((err) => {
  console.error('Failed to start Inventory Service:', err);
});
