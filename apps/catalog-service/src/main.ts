import { NestFactory } from '@nestjs/core';
import { CatalogModule } from './catalog.module';

async function bootstrap() {
  const app = await NestFactory.create(CatalogModule);
  await app.listen(
    Number(process.env.CATALOG_PORT || process.env.PORT) || 3002,
  );
}
bootstrap().catch((err) => {
  console.error('Failed to start Catalog Service:', err);
});
