import { Controller, Get } from '@nestjs/common';
import { CustomLoggerService } from '../logger/logger.service';

@Controller('health')
export class HealthController {
  constructor(private readonly logger: CustomLoggerService) {}

  @Get()
  check() {
    this.logger.debug('Health check called', 'HealthController');
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
