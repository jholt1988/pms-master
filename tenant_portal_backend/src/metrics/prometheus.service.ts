import { Injectable, OnModuleInit } from '@nestjs/common';
import * as client from 'prom-client';

@Injectable()
export class PrometheusService implements OnModuleInit {
  private readonly register = new client.Registry();

  readonly httpRequestDuration: client.Histogram;
  readonly httpRequestTotal: client.Counter;
  readonly httpErrorTotal: client.Counter;
  readonly activeConnections: client.Gauge;
  readonly dbQueryDuration: client.Histogram;
  readonly cacheHitTotal: client.Counter;
  readonly cacheMissTotal: client.Counter;
  readonly aiServiceDuration: client.Histogram;
  readonly aiServiceErrors: client.Counter;
  readonly jobDuration: client.Histogram;
  readonly jobErrors: client.Counter;
  readonly serviceHealth: client.Gauge;
  readonly eventBusPublished: client.Counter;
  readonly eventBusProcessed: client.Counter;
  readonly eventBusErrors: client.Counter;

  constructor() {
    this.register.setDefaultLabels({ app: 'pms-backend' });

    this.httpRequestDuration = new client.Histogram({
      name: 'http_request_duration_seconds',
      help: 'Duration of HTTP requests in seconds',
      labelNames: ['method', 'route', 'status_code'],
      buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.register],
    });

    this.httpRequestTotal = new client.Counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.httpErrorTotal = new client.Counter({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors (4xx and 5xx)',
      labelNames: ['method', 'route', 'status_code'],
      registers: [this.register],
    });

    this.activeConnections = new client.Gauge({
      name: 'http_active_connections',
      help: 'Number of active HTTP connections',
      registers: [this.register],
    });

    this.dbQueryDuration = new client.Histogram({
      name: 'db_query_duration_seconds',
      help: 'Duration of database queries in seconds',
      labelNames: ['model', 'operation'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
      registers: [this.register],
    });

    this.cacheHitTotal = new client.Counter({
      name: 'cache_hits_total',
      help: 'Total cache hits',
      labelNames: ['cache_name'],
      registers: [this.register],
    });

    this.cacheMissTotal = new client.Counter({
      name: 'cache_misses_total',
      help: 'Total cache misses',
      labelNames: ['cache_name'],
      registers: [this.register],
    });

    this.aiServiceDuration = new client.Histogram({
      name: 'ai_service_duration_seconds',
      help: 'Duration of AI service calls in seconds',
      labelNames: ['service', 'operation'],
      buckets: [0.1, 0.5, 1, 2.5, 5, 10, 30],
      registers: [this.register],
    });

    this.aiServiceErrors = new client.Counter({
      name: 'ai_service_errors_total',
      help: 'Total AI service errors',
      labelNames: ['service', 'operation'],
      registers: [this.register],
    });

    this.jobDuration = new client.Histogram({
      name: 'background_job_duration_seconds',
      help: 'Duration of background jobs in seconds',
      labelNames: ['job_name'],
      buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 300],
      registers: [this.register],
    });

    this.jobErrors = new client.Counter({
      name: 'background_job_errors_total',
      help: 'Total background job errors',
      labelNames: ['job_name'],
      registers: [this.register],
    });

    this.serviceHealth = new client.Gauge({
      name: 'service_health_status',
      help: 'Health status of dependent services (1=up, 0=down)',
      labelNames: ['service'],
      registers: [this.register],
    });

    this.eventBusPublished = new client.Counter({
      name: 'event_bus_published_total',
      help: 'Total events published to the event bus',
      labelNames: ['event_name'],
      registers: [this.register],
    });

    this.eventBusProcessed = new client.Counter({
      name: 'event_bus_processed_total',
      help: 'Total events successfully processed',
      labelNames: ['event_name'],
      registers: [this.register],
    });

    this.eventBusErrors = new client.Counter({
      name: 'event_bus_errors_total',
      help: 'Total event processing errors',
      labelNames: ['event_name'],
      registers: [this.register],
    });
  }

  onModuleInit() {
    client.collectDefaultMetrics({ register: this.register });
  }

  async getMetrics(): Promise<string> {
    return this.register.metrics();
  }

  getContentType(): string {
    return this.register.contentType;
  }
}
