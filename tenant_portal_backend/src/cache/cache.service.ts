import { Injectable, Inject, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';

@Injectable()
export class AppCacheService {
  private readonly logger = new Logger(AppCacheService.name);

  constructor(@Inject(CACHE_MANAGER) private readonly cache: Cache) {}

  async getOrSet<T>(key: string, ttlSeconds: number, factory: () => Promise<T>): Promise<T> {
    try {
      const cached = await this.cache.get<T>(key);
      if (cached !== undefined && cached !== null) {
        return cached;
      }
    } catch (e) {
      this.logger.warn(`Cache read failed for key=${key}: ${e}`);
    }

    const value = await factory();

    try {
      await this.cache.set(key, value, ttlSeconds * 1000);
    } catch (e) {
      this.logger.warn(`Cache write failed for key=${key}: ${e}`);
    }

    return value;
  }

  async invalidate(key: string): Promise<void> {
    try {
      await this.cache.del(key);
    } catch (e) {
      this.logger.warn(`Cache invalidation failed for key=${key}: ${e}`);
    }
  }

  async invalidatePattern(prefix: string): Promise<void> {
    try {
      const store = (this.cache as any).store;
      if (store?.keys) {
        const keys: string[] = await store.keys(`${prefix}*`);
        for (const key of keys) {
          await this.cache.del(key);
        }
      }
    } catch (e) {
      this.logger.warn(`Cache pattern invalidation failed for prefix=${prefix}: ${e}`);
    }
  }
}
