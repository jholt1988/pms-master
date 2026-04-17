import { Injectable, Logger } from '@nestjs/common';
import { HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import * as amqp from 'amqp-connection-manager';

@Injectable()
export class PrismaHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(PrismaHealthIndicator.name);

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { [key]: { status: 'up' } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown database error';
      return { [key]: { status: 'down', error: errorMessage } };
    }
  }
}

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RedisHealthIndicator.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    let client: Redis | undefined;
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL', 'redis://redis:6379');
      client = new Redis(redisUrl, { connectTimeout: 3000, lazyConnect: true });
      await client.connect();
      const pong = await client.ping();
      await client.quit();
      if (pong === 'PONG') {
        return { [key]: { status: 'up' } };
      }
      return { [key]: { status: 'down', error: `Unexpected ping response: ${pong}` } };
    } catch (error) {
      client?.disconnect();
      const errorMessage = error instanceof Error ? error.message : 'Unknown Redis error';
      this.logger.warn(`Redis health check failed: ${errorMessage}`);
      return { [key]: { status: 'down', error: errorMessage } };
    }
  }
}

@Injectable()
export class RabbitMQHealthIndicator extends HealthIndicator {
  private readonly logger = new Logger(RabbitMQHealthIndicator.name);

  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    try {
      const url = this.configService.get<string>('RABBITMQ_URL', 'amqp://localhost');
      const connection = amqp.connect([url]);

      const connected = await new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 5000);
        connection.on('connect', () => {
          clearTimeout(timeout);
          resolve(true);
        });
        connection.on('connectFailed', () => {
          clearTimeout(timeout);
          resolve(false);
        });
      });

      await connection.close();

      if (connected) {
        return { [key]: { status: 'up' } };
      }
      return { [key]: { status: 'down', error: 'Connection timeout' } };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown RabbitMQ error';
      this.logger.warn(`RabbitMQ health check failed: ${errorMessage}`);
      return { [key]: { status: 'down', error: errorMessage } };
    }
  }
}