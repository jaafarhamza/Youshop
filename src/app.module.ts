import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { InventoryModule } from './inventory/inventory.module';
import { OrdersModule } from './orders/orders.module';

@Module({
  imports: [AuthModule, CatalogModule, InventoryModule, OrdersModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
