# AI Services Monitoring & Observability Guide

This guide explains the monitoring, logging, and alerting infrastructure for AI services.

## Overview

The AI monitoring system provides:
- **Structured Logging** - Detailed logs for all AI service calls
- **Metrics Tracking** - Performance and cost metrics
- **Alerting** - Automated alerts when thresholds are exceeded

## Components

### 1. AIMetricsService

Tracks performance metrics for all AI services:

```typescript
// Record a metric
metricsService.recordMetric({
  service: 'AIMaintenanceService',
  method: 'assignPriorityWithAI',
  responseTime: 250,
  success: true,
  cached: false,
  cost: 0.001,
});

// Get service metrics
const metrics = metricsService.getServiceMetrics('AIMaintenanceService', 60); // Last 60 minutes
console.log(metrics.errorRate); // Error rate percentage
console.log(metrics.averageResponseTime); // Average response time in ms
console.log(metrics.totalCost); // Total cost in USD
```

**Tracked Metrics:**
- Total calls
- Successful/failed calls
- Average response time
- Cache hit rate
- Total cost
- Fallback usage rate
- Error rate

### 2. AIAlertingService

Automatically monitors AI services and sends alerts when thresholds are exceeded.

**Alert Thresholds:**
- Error rate > 5%
- Response time > 2000ms
- Fallback usage > 20%
- Daily cost > $50

**Alert Frequency:**
- Checks every 15 minutes
- Cooldown period: 1 hour (prevents alert spam)

### 3. Structured Logging

All AI services use structured logging with Winston:

```typescript
this.logger.log('AI service call completed', {
  service: 'AIMaintenanceService',
  method: 'assignPriorityWithAI',
  responseTime: 250,
  success: true,
  cached: false,
  cost: 0.001,
});
```

**Log Levels:**
- `log` - Successful operations
- `warn` - Failures, fallbacks
- `error` - Critical errors

## Integration

### Adding Metrics to AI Services

1. **Inject AIMetricsService** (optional - metrics work without it):

```typescript
constructor(
  private readonly prisma: PrismaService,
  private readonly configService: ConfigService,
  private readonly metricsService?: AIMetricsService, // Optional
) {}
```

2. **Record metrics after AI calls**:

```typescript
async myAIMethod() {
  const startTime = Date.now();
  try {
    const result = await this.openai.chat.completions.create(...);
    const responseTime = Date.now() - startTime;
    
    // Record metric
    if (this.metricsService) {
      this.metricsService.recordMetric({
        service: 'MyAIService',
        method: 'myAIMethod',
        responseTime,
        success: true,
        cached: false,
        cost: this.metricsService.estimateOpenAICost('gpt-4o-mini', inputTokens, outputTokens),
      });
    }
    
    // Structured logging
    this.logger.log('AI service call completed', {
      service: 'MyAIService',
      method: 'myAIMethod',
      responseTime,
      success: true,
    });
    
    return result;
  } catch (error) {
    const responseTime = Date.now() - startTime;
    
    // Record failure metric
    if (this.metricsService) {
      this.metricsService.recordMetric({
        service: 'MyAIService',
        method: 'myAIMethod',
        responseTime,
        success: false,
        errorType: error.constructor.name,
      });
    }
    
    // Log error
    this.logger.warn('AI service call failed', {
      service: 'MyAIService',
      method: 'myAIMethod',
      responseTime,
      success: false,
      error: error.message,
    });
    
    throw error;
  }
}
```

### Using the Helper Function

For convenience, use the `trackAICall` helper:

```typescript
import { trackAICall } from '../monitoring/ai-metrics-helper';

async myAIMethod() {
  return trackAICall(
    this.metricsService,
    this.logger,
    'MyAIService',
    'myAIMethod',
    async () => {
      return await this.openai.chat.completions.create(...);
    },
    {
      model: 'gpt-4o-mini',
      estimateTokens: (result) => ({ input: 100, output: 10 }),
    },
  );
}
```

## Monitoring Dashboard

### Viewing Metrics

Access metrics programmatically:

```typescript
// Get overall health
const health = metricsService.getOverallHealth(60); // Last 60 minutes
console.log(health.healthy); // boolean
console.log(health.errorRate); // percentage
console.log(health.alerts); // array of alert messages

// Get service-specific metrics
const metrics = metricsService.getServiceMetrics('AIMaintenanceService', 60);
console.log(metrics.totalCalls);
console.log(metrics.errorRate);
console.log(metrics.averageResponseTime);
console.log(metrics.totalCost);

// Get all service metrics
const allMetrics = metricsService.getAllServiceMetrics(60);
```

### Log Files

Logs are written to:
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only
- `logs/exceptions.log` - Uncaught exceptions
- `logs/rejections.log` - Unhandled promise rejections

### Structured Log Format

All AI service logs include:
```json
{
  "timestamp": "2025-01-15T10:30:00.000Z",
  "level": "info",
  "message": "AI service call completed",
  "context": "AIMaintenanceService",
  "service": "AIMaintenanceService",
  "method": "assignPriorityWithAI",
  "responseTime": 250,
  "success": true,
  "cached": false,
  "cost": 0.001
}
```

## Alerting

### Alert Types

1. **Overall Health Alerts**
   - Sent when overall AI service health degrades
   - Includes error rate, response time, fallback usage

2. **Service-Specific Alerts**
   - Sent when individual service exceeds thresholds
   - Includes service name and specific metrics

3. **Cost Alerts**
   - Sent when daily cost exceeds threshold
   - Includes cost breakdown by service

### Alert Recipients

Alerts are sent to all users with `PROPERTY_MANAGER` role via:
- In-app notifications
- Email (for high-priority alerts)

### Alert Cooldown

Alerts have a 1-hour cooldown to prevent spam. The same alert won't be sent multiple times within an hour.

## Cost Estimation

The metrics service estimates OpenAI API costs based on:
- Model used (gpt-4o-mini, gpt-4, etc.)
- Input tokens
- Output tokens

Current pricing (approximate):
- `gpt-4o-mini`: $0.15 per 1M input tokens, $0.60 per 1M output tokens
- `gpt-4`: $30 per 1M input tokens, $60 per 1M output tokens

## Best Practices

1. **Always log AI calls** - Use structured logging for all AI operations
2. **Track metrics** - Record metrics for performance monitoring
3. **Handle errors gracefully** - Log errors and use fallbacks
4. **Monitor costs** - Keep an eye on daily cost metrics
5. **Review alerts** - Investigate alerts promptly

## Troubleshooting

### High Error Rate

If error rate > 5%:
1. Check OpenAI API status
2. Verify API key is valid
3. Check network connectivity
4. Review error logs for patterns

### Slow Response Times

If response time > 2000ms:
1. Check OpenAI API latency
2. Review prompt complexity
3. Consider caching frequent requests
4. Check system resources

### High Fallback Usage

If fallback usage > 20%:
1. Verify OpenAI API key is set
2. Check if AI_ENABLED is true
3. Review service-specific flags
4. Check API quota/limits

### High Costs

If daily cost > $50:
1. Review token usage
2. Consider using gpt-4o-mini instead of gpt-4
3. Implement caching
4. Reduce max_tokens where possible

## Related Documentation

- [AI Configuration Guide](./ai-configuration.md)
- [AI Services Integration Plan](./ai-services-integration-plan.md)

