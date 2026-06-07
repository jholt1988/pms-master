import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class TokenBlacklistService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(TokenBlacklistService.name);
  private redis: Redis | null = null;
  private disabled = false;
  private readonly PREFIX = 'token:blacklist:';

  constructor(private readonly configService: ConfigService) {}

  async onModuleInit() {
    if (process.env.NODE_ENV === 'test' || process.env.DISABLE_REDIS === 'true') {
      this.disabled = true;
      return;
    }
    const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://redis:6379');
    this.redis = new Redis(redisUrl, { connectTimeout: 3000 });
    this.redis.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
  }

  async onModuleDestroy() {
    await this.redis?.quit();
  }

  async blacklist(jti: string, expiresInSeconds: number): Promise<void> {
    if (this.disabled || !this.redis) return;
    await this.redis.set(`${this.PREFIX}${jti}`, '1', 'EX', expiresInSeconds);
  }

  async isBlacklisted(jti: string): Promise<boolean> {
    if (this.disabled || !this.redis) return false;
    const result = await this.redis.get(`${this.PREFIX}${jti}`);
    return result !== null;
  }
}
