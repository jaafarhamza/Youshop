import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { CustomLoggerService } from './common/logger/logger.service';
import { LoggerService, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });

  const logger = app.get<LoggerService>(WINSTON_MODULE_NEST_PROVIDER);
  app.useLogger(logger);

  const customLogger = app.get<CustomLoggerService>(CustomLoggerService);
  app.useGlobalFilters(new AllExceptionsFilter(customLogger));

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const apiPrefix = process.env.API_PREFIX ?? 'api/v1';
  app.setGlobalPrefix(apiPrefix);

  // Swagger/OpenAPI Configuration
  const config = new DocumentBuilder()
    .setTitle('Youshop API')
    .setDescription(
      'E-commerce backend API with authentication, product catalog, inventory management, and order processing',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'User registration and login endpoints')
    .addTag('Products', 'Product catalog management')
    .addTag('Inventory', 'Stock and inventory management')
    .addTag('Orders', 'Order creation and management')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(
    `Application is running on: http://localhost:${port}/${apiPrefix}`,
    'Bootstrap',
  );
  logger.log(
    `Swagger documentation available at: http://localhost:${port}/api/docs`,
    'Bootstrap',
  );

  // PM2 ready signal
  if (process.send) {
    process.send('ready');
  }
}
void bootstrap();
