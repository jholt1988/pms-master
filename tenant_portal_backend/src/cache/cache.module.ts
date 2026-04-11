import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppCacheService } from './cache.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService): any => {
        const redisUrl = config.get<string>('REDIS_URL');
        if (redisUrl) {
          return {
            store: 'ioredis',
            host: new URL(redisUrl).hostname,
            port: parseInt(new URL(redisUrl).port || '6379', 10),
            ttl: 60,
          };
        }
        return { ttl: 60 };
      },
    }),
  ],
  providers: [AppCacheService],
  exports: [NestCacheModule, AppCacheService],
})
export class AppCacheModule {}
