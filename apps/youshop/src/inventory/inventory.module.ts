import { Module } from '@nestjs/common';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { LoggerModule } from '../common/logger/logger.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [PrismaModule, LoggerModule, AuthModule],
  providers: [InventoryService],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
