import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { CustomLoggerService } from '../logger/logger.service';

@Injectable()
export class EventLoggerListener {
  constructor(private readonly logger: CustomLoggerService) {}

  @OnEvent('**')
  handleAllEvents(payload: unknown, event: string) {
    this.logger.log(
      `[Event] ${event} - Payload: ${JSON.stringify(payload)}`,
      'EventLogger',
    );
  }
}
