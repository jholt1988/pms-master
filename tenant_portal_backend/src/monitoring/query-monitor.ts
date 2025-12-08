import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * P0-005: Database Query Performance Monitor
 * Tracks slow queries, N+1 patterns, and database performance
 */
@Injectable()
export class QueryMonitorService implements OnModuleInit {
  private readonly logger = new Logger(QueryMonitorService.name);
  private slowQueries: Array<{
    query: string;
    duration: number;
    timestamp: Date;
    model?: string;
  }> = [];
  private readonly SLOW_QUERY_THRESHOLD = 100; // 100ms

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Enable Prisma query logging
    this.setupQueryLogging();
    this.logger.log('Database query monitoring enabled');
  }

  /**
   * Setup Prisma query logging with performance tracking
   * Note: Prisma 6.x uses log configuration in PrismaClient constructor
   * Query events are enabled via log: [{ emit: 'event', level: 'query' }] in PrismaClient
   */
  private setupQueryLogging() {
    // Subscribe to Prisma query events if enabled
    try {
      this.prisma.$on('query' as any, (event: any) => {
        const duration = event.duration || 0;
        const query = event.query || 'Unknown query';
        
        // Log slow queries
        if (duration > this.SLOW_QUERY_THRESHOLD) {
          this.logSlowQuery({
            query,
            duration,
            timestamp: new Date(),
            model: this.extractModelFromQuery(query),
          });
        }
      });
      
      this.logger.log('Query event monitoring enabled');
    } catch (error) {
      // Query events may not be enabled in PrismaService
      this.logger.warn('Query event monitoring not available. Enable in PrismaService with: log: [{ emit: "event", level: "query" }]');
    }
  }

  /**
   * Extract model name from Prisma query
   */
  private extractModelFromQuery(query?: string): string | undefined {
    if (!query) return undefined;
    
    // Try to extract model from query (e.g., "SELECT * FROM "User"")
    const match = query.match(/FROM\s+"?(\w+)"?/i) || query.match(/\.(\w+)\./);
    return match ? match[1] : undefined;
  }

  /**
   * Log slow query
   */
  private logSlowQuery(queryInfo: {
    query: string;
    duration: number;
    timestamp: Date;
    model?: string;
  }) {
    this.slowQueries.push(queryInfo);

    // Keep only last 100 slow queries
    if (this.slowQueries.length > 100) {
      this.slowQueries.shift();
    }

    this.logger.warn(`Slow query detected: ${queryInfo.query} took ${queryInfo.duration}ms`, {
      query: queryInfo.query,
      duration: queryInfo.duration,
      model: queryInfo.model,
    });
  }

  /**
   * Get slow query statistics
   */
  getSlowQueryStats() {
    const stats = {
      total: this.slowQueries.length,
      byModel: {} as Record<string, { count: number; avgDuration: number; maxDuration: number }>,
      recent: this.slowQueries.slice(-10),
    };

    // Group by model
    this.slowQueries.forEach((query) => {
      const model = query.model || 'unknown';
      if (!stats.byModel[model]) {
        stats.byModel[model] = { count: 0, avgDuration: 0, maxDuration: 0 };
      }
      stats.byModel[model].count++;
      stats.byModel[model].maxDuration = Math.max(
        stats.byModel[model].maxDuration,
        query.duration
      );
    });

    // Calculate averages
    Object.keys(stats.byModel).forEach((model) => {
      const modelQueries = this.slowQueries.filter((q) => (q.model || 'unknown') === model);
      const totalDuration = modelQueries.reduce((sum, q) => sum + q.duration, 0);
      stats.byModel[model].avgDuration = totalDuration / modelQueries.length;
    });

    return stats;
  }

  /**
   * Detect potential N+1 query patterns
   * This is a simplified check - in production, use a tool like Prisma Data Proxy or query analysis
   */
  detectNPlusOnePatterns() {
    // Group queries by timestamp to find patterns
    const queryGroups = new Map<number, string[]>();
    
    this.slowQueries.forEach((query) => {
      const timeWindow = Math.floor(query.timestamp.getTime() / 1000); // Group by second
      if (!queryGroups.has(timeWindow)) {
        queryGroups.set(timeWindow, []);
      }
      queryGroups.get(timeWindow)!.push(query.query);
    });

    // Find time windows with many similar queries (potential N+1)
    const potentialNPlusOne: Array<{ timeWindow: number; queries: string[] }> = [];
    queryGroups.forEach((queries, timeWindow) => {
      if (queries.length > 10) {
        // More than 10 queries in 1 second might indicate N+1
        const uniqueQueries = new Set(queries);
        if (uniqueQueries.size < queries.length / 2) {
          // Many duplicate queries
          potentialNPlusOne.push({ timeWindow, queries: Array.from(uniqueQueries) });
        }
      }
    });

    return potentialNPlusOne;
  }

  /**
   * Get database connection pool metrics
   */
  async getConnectionPoolMetrics() {
    try {
      // Prisma doesn't expose connection pool metrics directly
      // In production, query PostgreSQL system tables or use monitoring tools
      const result = await this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT count(*) as count 
        FROM pg_stat_activity 
        WHERE datname = current_database()
      `;

      return {
        activeConnections: Number(result[0]?.count || 0),
        note: 'For detailed pool metrics, use PostgreSQL monitoring or APM tools',
      };
    } catch (error) {
      this.logger.warn('Failed to get connection pool metrics', {
        error: error instanceof Error ? error.message : String(error),
      });
      return {
        activeConnections: 0,
        error: 'Unable to retrieve metrics',
      };
    }
  }

  /**
   * Reset slow query log
   */
  resetSlowQueryLog() {
    this.slowQueries = [];
    this.logger.log('Slow query log reset');
  }
}

