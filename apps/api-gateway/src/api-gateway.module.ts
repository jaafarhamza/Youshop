import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ApiGatewayController } from './api-gateway.controller';
import { ApiGatewayService } from './api-gateway.service';
import { AuthModule } from '../../auth-service/src/auth.module';
import { CatalogModule } from '../../catalog-service/src/catalog.module';
import { InventoryModule } from '../../inventory-service/src/inventory.module';
import { OrdersModule } from '../../orders-service/src/orders.module';
import { PaymentModule } from '../../payment-service/src/payment.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    AuthModule,
    CatalogModule,
    InventoryModule,
    OrdersModule,
    PaymentModule,
  ],
  controllers: [ApiGatewayController],
  providers: [ApiGatewayService],
})
export class ApiGatewayModule {}
