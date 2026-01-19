import { NestFactory } from '@nestjs/core';
import { AuthModule } from './auth.module';

async function bootstrap() {
  const app = await NestFactory.create(AuthModule);
  await app.listen(Number(process.env.AUTH_PORT || process.env.PORT) || 3001);
}
bootstrap().catch((err) => {
  console.error('Failed to start Auth Service:', err);
});
