import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { EventLoggerListener } from './events/event-logger.listener';
import { LoggerModule } from './logger/logger.module';

@Module({
  imports: [
    LoggerModule,
    EventEmitterModule.forRoot({
      global: true,
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
      verboseMemoryLeak: true,
    }),
  ],
  providers: [CommonService, EventLoggerListener],
  exports: [CommonService, EventEmitterModule],
})
export class CommonModule {}
