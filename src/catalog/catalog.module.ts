import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { PrismaModule } from '../common/prisma/prisma.module';
import { LoggerModule } from '../common/logger/logger.module';
import { AuthModule } from '../auth/auth.module';
import { CacheModule } from '../common/cache/cache.module';

@Module({
  imports: [PrismaModule, LoggerModule, AuthModule, CacheModule],
  providers: [CatalogService],
  controllers: [CatalogController],
})
export class CatalogModule {}
