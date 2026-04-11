import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HttpModule } from '@nestjs/axios';
import { HealthController } from './health.controller';
import { PrismaHealthIndicator, RedisHealthIndicator, RabbitMQHealthIndicator } from './prisma-health.indicator';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    TerminusModule.forRoot({
      gracefulShutdownTimeoutMs: 5000,
      errorLogStyle: 'pretty',
    }),
    HttpModule,
    PrismaModule,
  ],
  controllers: [HealthController],
  providers: [PrismaHealthIndicator, RedisHealthIndicator, RabbitMQHealthIndicator],
})
export class HealthModule {}