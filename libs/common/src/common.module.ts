import { Module } from '@nestjs/common';
import { CommonService } from './common.service';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule.forRoot({ global: true })],
  providers: [CommonService],
  exports: [CommonService],
})
export class CommonModule {}
