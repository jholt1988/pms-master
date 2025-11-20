import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService, HttpHealthIndicator, MemoryHealthIndicator } from '@nestjs/terminus';
import { PrismaHealthIndicator } from './prisma-health.indicator';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private http: HttpHealthIndicator,
    private prismaHealth: PrismaHealthIndicator,
    private memory: MemoryHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  check() {
    return this.health.check([
      // Database connectivity
      () => this.prismaHealth.isHealthy('database'),
      
      // Memory usage (alert if using > 300MB)
      () => this.memory.checkHeap('memory_heap', 300 * 1024 * 1024),
      () => this.memory.checkRSS('memory_rss', 300 * 1024 * 1024),
      
      // ML Service connectivity (if URL is configured)
      () => {
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8000';
        return this.http.pingCheck('ml_service', `${mlServiceUrl}/health`);
      },
    ]);
  }

  @Get('/readiness')
  @HealthCheck()
  readiness() {
    return this.health.check([
      // Only essential services for readiness
      () => this.prismaHealth.isHealthy('database'),
    ]);
  }

  @Get('/liveness')
  @HealthCheck()
  liveness() {
    return this.health.check([
      // Basic liveness check
      () => this.memory.checkHeap('memory_heap', 500 * 1024 * 1024), // 500MB limit
    ]);
  }
}