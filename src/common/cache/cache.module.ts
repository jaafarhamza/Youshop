import { Module } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { Keyv } from 'keyv';
import KeyvRedis from '@keyv/redis';

@Module({
  imports: [
    NestCacheModule.registerAsync({
      useFactory: () => {
        const redisHost = process.env.REDIS_HOST || 'localhost';
        const redisPort = process.env.REDIS_PORT || '6379';
        const redisUrl = `redis://${redisHost}:${redisPort}`;

        const cacheTtlSeconds = parseInt(process.env.CACHE_TTL || '300', 10);
        const cacheTtlMs = cacheTtlSeconds * 1000;

        return {
          isGlobal: true,
          ttl: cacheTtlMs,
          stores: [
            new Keyv({
              store: new KeyvRedis(redisUrl),
              namespace: 'youshop',
            }),
          ],
        };
      },
    }),
  ],
  exports: [NestCacheModule],
})
export class CacheModule {}
