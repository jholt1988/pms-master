# Performance Monitoring Guide

**P0-005: Performance Monitoring Implementation**

This document describes the performance monitoring infrastructure implemented to address operational blindness.

**Last Updated:** January 2025

---

## Sentry Integration

### Current Configuration ✅

Sentry is already configured for error tracking and performance monitoring:

**File:** `tenant_portal_backend/src/sentry.config.ts`

**Features:**
- ✅ Error tracking enabled
- ✅ Performance monitoring (traces) enabled
- ✅ Profiling integration enabled
- ✅ Environment-based sampling rates
- ✅ Sensitive data filtering (passwords removed)
- ✅ Breadcrumb filtering (health checks excluded)

**Configuration:**
- **DSN:** Set via `SENTRY_DSN` environment variable
- **Environment:** Auto-detected from `NODE_ENV`
- **Traces Sample Rate:** 10% in production, 100% in development
- **Profiles Sample Rate:** 10% in production, 100% in development

### Integration Status

**Current:** Sentry is configured but may not be initialized in `index.ts`

**To Enable:**
1. Add `SENTRY_DSN` to environment variables
2. Ensure `initializeSentry()` is called in `index.ts`
3. Verify Sentry dashboard shows data

### Next Steps for Full APM Integration

1. **Choose APM Service:**
   - **Option 1:** Sentry Performance (already configured)
   - **Option 2:** New Relic
   - **Option 3:** Datadog

2. **For Sentry (Recommended - Already Configured):**
   - Add `SENTRY_DSN` to production environment
   - Verify initialization in `index.ts`
   - Set up Sentry dashboard
   - Configure alerts

3. **For New Relic:**
   - Install `newrelic` package
   - Add `NEW_RELIC_LICENSE_KEY` to environment
   - Initialize in `index.ts`

4. **For Datadog:**
   - Install `dd-trace` package
   - Add `DD_API_KEY` to environment
   - Initialize in `index.ts`

---

**Last Updated:** January 2025  
**Status:** 75% Complete

---

## Overview

Performance monitoring has been implemented across both backend and frontend to track key metrics, identify bottlenecks, and ensure optimal user experience.

---

## Backend Performance Monitoring

### Performance Middleware

**Location:** `tenant_portal_backend/src/monitoring/performance.middleware.ts`

**Features:**
- Tracks request count, response times, error rates
- Endpoint-level statistics
- Slow request logging (>1 second)
- CPU and memory usage tracking

**Metrics Collected:**
- Request duration (P50, P95, P99)
- Request rate per endpoint
- Error rate per endpoint
- CPU usage
- Memory usage

**Configuration:**
- Automatically applied to all routes
- Logs metrics every 100 requests
- Configurable thresholds

### Database Query Monitoring

**Location:** `tenant_portal_backend/src/monitoring/query-monitor.ts`

**Features:**
- Slow query tracking (>100ms threshold)
- N+1 query pattern detection
- Connection pool metrics
- Query statistics by model

**Endpoints:**
- `GET /api/monitoring/performance/database/slow-queries`
- `GET /api/monitoring/performance/database/n-plus-one`
- `GET /api/monitoring/performance/database/connection-pool`

**Usage:**
```typescript
// Enable query logging in PrismaService
// Set environment variable: ENABLE_QUERY_LOGGING=true
```

### Performance Controller

**Location:** `tenant_portal_backend/src/monitoring/performance.controller.ts`

**Endpoints:**
- `GET /api/monitoring/performance/metrics` - General performance metrics
- `GET /api/monitoring/performance/database/slow-queries` - Slow query statistics
- `GET /api/monitoring/performance/database/n-plus-one` - N+1 pattern detection
- `GET /api/monitoring/performance/database/connection-pool` - Connection pool metrics

**Access:**
- Requires authentication
- Admin or Property Manager role required

---

## Frontend Performance Monitoring

### Web Vitals Tracking

**Location:** `tenant_portal_app/src/services/performance-monitor.ts`

**Metrics Tracked:**
- **FCP (First Contentful Paint):** < 1.8s target
- **LCP (Largest Contentful Paint):** < 2.5s target
- **FID (First Input Delay):** < 100ms target
- **CLS (Cumulative Layout Shift):** < 0.1 target
- **TTFB (Time to First Byte):** < 600ms target

**Performance Budgets:**
```typescript
export const PERFORMANCE_BUDGETS = {
  FCP: 1800,  // 1.8 seconds
  LCP: 2500,  // 2.5 seconds
  FID: 100,   // 100 milliseconds
  CLS: 0.1,   // 0.1 (unitless)
  TTFB: 600,  // 600 milliseconds
};
```

**Integration:**
- Automatically initialized in `main.tsx`
- Sends metrics to backend endpoint
- Logs to console in development

---

## Performance Metrics

### Backend Metrics

#### Request Metrics
- **Response Time:** P50, P95, P99 percentiles
- **Request Rate:** Requests per second per endpoint
- **Error Rate:** Percentage of failed requests
- **Throughput:** Requests processed per second

#### System Metrics
- **CPU Usage:** Percentage of CPU utilization
- **Memory Usage:** Current memory consumption
- **Database Connections:** Active connection pool size

#### Database Metrics
- **Slow Queries:** Queries taking >100ms
- **Query Count:** Total queries per model
- **N+1 Patterns:** Potential N+1 query issues

### Frontend Metrics

#### Web Vitals
- **FCP:** Time to first contentful paint
- **LCP:** Time to largest contentful paint
- **FID:** Delay before first user interaction
- **CLS:** Visual stability score
- **TTFB:** Time to first byte from server

#### Navigation Timing
- DNS lookup time
- TCP connection time
- Request/response time
- DOM processing time
- Page load time

---

## Accessing Metrics

### Backend Metrics

**Via API:**
```bash
# Get general metrics
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/monitoring/performance/metrics

# Get slow queries
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/monitoring/performance/database/slow-queries

# Get N+1 patterns
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/monitoring/performance/database/n-plus-one
```

**Via Logs:**
- Performance metrics logged every 100 requests
- Slow queries logged immediately
- Check application logs for detailed metrics

### Frontend Metrics

**In Browser Console:**
- Development: Metrics logged to console
- Production: Metrics sent to backend

**Via Performance API:**
```javascript
import { getPerformanceSummary } from './services/performance-monitor';

const summary = getPerformanceSummary();
console.log(summary);
```

---

## Performance Budgets

### Backend Performance Budgets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| API Response Time (P95) | < 500ms (reads) | > 1s |
| API Response Time (P95) | < 1s (writes) | > 2s |
| Database Query Time | < 100ms | > 500ms |
| Error Rate | < 1% | > 5% |

### Frontend Performance Budgets

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| FCP | < 1.8s | > 3s |
| LCP | < 2.5s | > 4s |
| FID | < 100ms | > 300ms |
| CLS | < 0.1 | > 0.25 |
| TTFB | < 600ms | > 1s |

---

## Integration with APM Services

### Current Status
- ✅ Basic performance monitoring implemented
- ✅ Metrics collection active
- ⚠️ APM service integration pending

### Recommended APM Services
1. **Sentry Performance** (already integrated for errors)
2. **New Relic** (comprehensive APM)
3. **Datadog** (full-stack monitoring)
4. **Prometheus + Grafana** (open-source)

### Integration Steps

#### Sentry Performance
```typescript
// Already configured in sentry.config.ts
// Enable performance monitoring:
Sentry.init({
  tracesSampleRate: 1.0, // 100% of transactions
});
```

#### New Relic
```bash
npm install newrelic
```

```typescript
// Add to index.ts
require('newrelic');
```

#### Datadog
```bash
npm install dd-trace
```

```typescript
// Add to index.ts
const tracer = require('dd-trace').init();
```

---

## Alerts and Notifications

### Current Implementation
- Performance metrics logged to console
- Slow queries logged with warnings
- Exceeded budgets logged with warnings

### Recommended Alerts
- [ ] Set up alerts for P95 response time > 1s
- [ ] Alert on error rate > 5%
- [ ] Alert on slow queries > 500ms
- [ ] Alert on frontend LCP > 4s
- [ ] Alert on database connection pool exhaustion

---

## Performance Optimization Tips

### Backend
1. **Database Optimization**
   - Use indexes on frequently queried fields
   - Avoid N+1 queries with Prisma `include`
   - Use connection pooling
   - Monitor slow queries

2. **API Optimization**
   - Implement caching where appropriate
   - Use pagination for large datasets
   - Optimize database queries
   - Consider rate limiting

### Frontend
1. **Bundle Optimization**
   - Code splitting
   - Tree shaking
   - Lazy loading
   - Image optimization

2. **Rendering Optimization**
   - Virtual scrolling for large lists
   - Memoization for expensive components
   - Debounce/throttle user inputs
   - Optimize re-renders

---

## Troubleshooting

### High Response Times
1. Check database query performance
2. Review slow query logs
3. Check for N+1 patterns
4. Review API endpoint logic

### High Memory Usage
1. Check for memory leaks
2. Review connection pool size
3. Check for large data processing
4. Monitor garbage collection

### Frontend Performance Issues
1. Check Web Vitals metrics
2. Review bundle size
3. Check for render blocking resources
4. Review component performance

---

## Next Steps

1. **Integrate APM Service**
   - Choose and configure APM tool
   - Set up dashboards
   - Configure alerts

2. **Set Up Alerts**
   - Configure alert thresholds
   - Set up notification channels
   - Test alert system

3. **Performance Dashboards**
   - Create performance dashboards
   - Set up real-time monitoring
   - Document dashboard access

4. **Enable Query Logging**
   - Set `ENABLE_QUERY_LOGGING=true` in production
   - Monitor query performance
   - Optimize slow queries

---

**Progress:** 75% Complete  
**Target:** Full APM integration with dashboards and alerts

