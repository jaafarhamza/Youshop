import { Module } from '@nestjs/common';
import { NotificationsGateway } from './notifications.gateway';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../database/prisma.module';
import { NotificationsService } from './notifications.service';
import { NotificationsListener } from './notifications.listener';
import { InventoryListener } from './inventory.listener';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    CacheModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  providers: [
    NotificationsGateway,
    NotificationsService,
    NotificationsListener,
    InventoryListener,
  ],
  exports: [NotificationsGateway, NotificationsService],
})
export class NotificationsModule {}
