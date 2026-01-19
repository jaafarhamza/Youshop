import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NotificationServiceModule } from './notification-service.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(NotificationServiceModule);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  const port =
    Number(process.env.NOTIFICATION_PORT || process.env.PORT) || 3006;
  await app.listen(port);
  logger.log(`Notification Service is running on: http://localhost:${port}`);
}

bootstrap().catch((err) => {
  console.error('Failed to start Notification Service:', err);
});
