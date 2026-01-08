import { Module } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { PrismaModule, LoggerModule, CacheModule } from 'y/common';

@Module({
  imports: [PrismaModule, LoggerModule, CacheModule],
  providers: [CatalogService],
  controllers: [CatalogController],
})
export class CatalogModule {}
