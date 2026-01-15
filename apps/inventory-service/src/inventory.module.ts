import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { InventoryService } from './inventory.service';
import { InventoryController } from './inventory.controller';
import { PrismaModule, LoggerModule } from 'y/common';
import { JwtStrategy } from 'apps/auth-service/src/strategies/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    LoggerModule,
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
  providers: [InventoryService, JwtStrategy],
  controllers: [InventoryController],
  exports: [InventoryService],
})
export class InventoryModule {}
