import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios from 'axios';

interface ServiceHealth {
  name: string;
  status: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  responseTime?: number; // milliseconds
  lastChecked: Date;
  error?: string;
}

interface SystemHealth {
  overall: 'HEALTHY' | 'DEGRADED' | 'DOWN';
  services: ServiceHealth[];
  timestamp: Date;
}

interface CapacityMetrics {
  databaseConnections: number;
  databaseSize: number; // MB
  apiRequestRate: number; // requests per minute
  estimatedDaysUntilCapacity: number;
}

@Injectable()
export class HealthMonitorService {
  private readonly logger = new Logger(HealthMonitorService.name);
  private readonly monitoringEnabled: boolean;
  private readonly mlServiceUrl: string;
  private healthHistory: ServiceHealth[] = [];

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.monitoringEnabled =
      this.configService.get<string>('MONITORING_ENABLED', 'true') === 'true';
    this.mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://localhost:8000');
  }

  /**
   * Check health of all services
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async checkAllServices(): Promise<SystemHealth> {
    if (!this.monitoringEnabled) {
      return {
        overall: 'HEALTHY',
        services: [],
        timestamp: new Date(),
      };
    }

    const services: ServiceHealth[] = [];

    // Check database
    const dbHealth = await this.checkDatabase();
    services.push(dbHealth);

    // Check ML service
    const mlHealth = await this.checkMLService();
    services.push(mlHealth);

    // Check Redis (if configured)
    const redisHealth = await this.checkRedis();
    if (redisHealth) {
      services.push(redisHealth);
    }

    // Determine overall health
    const overall = this.determineOverallHealth(services);

    // Store health history
    this.healthHistory.push(...services);
    if (this.healthHistory.length > 100) {
      this.healthHistory = this.healthHistory.slice(-100);
    }

    // Log and alert if needed
    if (overall !== 'HEALTHY') {
      this.logger.warn(`System health degraded: ${overall}`, services);
    }

    return {
      overall,
      services,
      timestamp: new Date(),
    };
  }

  /**
   * Check database health
   */
  private async checkDatabase(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      // Simple query to check database connectivity
      await this.prisma.$queryRaw`SELECT 1`;

      const responseTime = Date.now() - startTime;

      return {
        name: 'database',
        status: responseTime > 1000 ? 'DEGRADED' : 'HEALTHY',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'database',
        status: 'DOWN',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check ML service health
   */
  private async checkMLService(): Promise<ServiceHealth> {
    const startTime = Date.now();

    try {
      const response = await axios.get(`${this.mlServiceUrl}/health`, {
        timeout: 5000,
      });

      const responseTime = Date.now() - startTime;

      return {
        name: 'ml-service',
        status: response.status === 200 ? 'HEALTHY' : 'DEGRADED',
        responseTime,
        lastChecked: new Date(),
      };
    } catch (error) {
      return {
        name: 'ml-service',
        status: 'DOWN',
        lastChecked: new Date(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Check Redis health (if configured)
   */
  private async checkRedis(): Promise<ServiceHealth | null> {
    // Redis health check would go here
    // For now, return null if not configured
    return null;
  }

  /**
   * Determine overall system health
   */
  private determineOverallHealth(services: ServiceHealth[]): 'HEALTHY' | 'DEGRADED' | 'DOWN' {
    const downServices = services.filter((s) => s.status === 'DOWN');
    const degradedServices = services.filter((s) => s.status === 'DEGRADED');

    if (downServices.length > 0) {
      return 'DOWN';
    }

    if (degradedServices.length > 0) {
      return 'DEGRADED';
    }

    return 'HEALTHY';
  }

  /**
   * Predict capacity exhaustion
   */
  async predictCapacityExhaustion(): Promise<CapacityMetrics> {
    try {
      // Get database size
      const dbSizeResult = await this.prisma.$queryRaw<Array<{ size: number }>>`
        SELECT pg_database_size(current_database()) / 1024 / 1024 as size
      `;
      const databaseSize = dbSizeResult[0]?.size || 0;

      // Get active database connections
      const connectionsResult = await this.prisma.$queryRaw<Array<{ count: number }>>`
        SELECT count(*) as count FROM pg_stat_activity WHERE datname = current_database()
      `;
      const databaseConnections = connectionsResult[0]?.count || 0;

      // Estimate API request rate (this would come from actual metrics)
      const apiRequestRate = 100; // requests per minute (placeholder)

      // Calculate estimated days until capacity
      // This is a simplified calculation
      const maxDatabaseSize = 10000; // 10 GB (example)
      const growthRate = 100; // MB per day (example)
      const estimatedDaysUntilCapacity =
        growthRate > 0 ? (maxDatabaseSize - databaseSize) / growthRate : 999;

      return {
        databaseConnections,
        databaseSize,
        apiRequestRate,
        estimatedDaysUntilCapacity: Math.max(0, estimatedDaysUntilCapacity),
      };
    } catch (error) {
      this.logger.error('Error predicting capacity exhaustion', error);
      return {
        databaseConnections: 0,
        databaseSize: 0,
        apiRequestRate: 0,
        estimatedDaysUntilCapacity: 999,
      };
    }
  }

  /**
   * Get health summary
   */
  async getHealthSummary(): Promise<{
    current: SystemHealth;
    capacity: CapacityMetrics;
    recentIssues: ServiceHealth[];
  }> {
    const current = await this.checkAllServices();
    const capacity = await this.predictCapacityExhaustion();

    // Get recent issues (services that were down or degraded)
    const recentIssues = this.healthHistory.filter(
      (h) => h.status === 'DOWN' || h.status === 'DEGRADED',
    ).slice(-10);

    return {
      current,
      capacity,
      recentIssues,
    };
  }

  /**
   * Attempt automated recovery for failed services
   */
  async attemptRecovery(serviceName: string): Promise<boolean> {
    this.logger.log(`Attempting recovery for service: ${serviceName}`);

    // In a real implementation, this would:
    // 1. Restart the service (if possible)
    // 2. Clear caches
    // 3. Restart database connections
    // 4. Notify administrators

    // For now, just log
    this.logger.warn(`Recovery attempted for ${serviceName} (manual intervention may be required)`);

    return false;
  }
}

