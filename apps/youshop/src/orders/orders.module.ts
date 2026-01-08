import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { LoggerModule } from '../common/logger/logger.module';
import { InventoryModule } from '../inventory/inventory.module';

@Module({
  imports: [PrismaModule, LoggerModule, InventoryModule],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
