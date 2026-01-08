import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule, LoggerModule } from 'y/common';
import { InventoryModule } from 'apps/inventory-service/src/inventory.module';

@Module({
  imports: [PrismaModule, LoggerModule, InventoryModule],
  providers: [OrdersService],
  controllers: [OrdersController],
})
export class OrdersModule {}
