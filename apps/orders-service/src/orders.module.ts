import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { PrismaModule, LoggerModule } from 'y/common';
import { InventoryModule } from 'apps/inventory-service/src/inventory.module';
import { JwtStrategy } from 'apps/auth-service/src/strategies/jwt.strategy';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { OrdersListener } from './orders.listener';

@Module({
  imports: [
    PrismaModule,
    LoggerModule,
    EventEmitterModule.forRoot(),
    InventoryModule,
    PassportModule,
    ConfigModule.forRoot({ isGlobal: true }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  providers: [OrdersService, JwtStrategy, OrdersListener],
  controllers: [OrdersController],
})
export class OrdersModule {}
