/**
 * P0-005: Frontend Performance Monitoring
 * Tracks Web Vitals and sends metrics to monitoring service
 */

export interface WebVitals {
  name: string;
  value: number;
  id: string;
  delta: number;
  rating: 'good' | 'needs-improvement' | 'poor';
}

/**
 * Performance budgets (P0-005)
 */
export const PERFORMANCE_BUDGETS = {
  FCP: 1800, // First Contentful Paint: < 1.8s
  LCP: 2500, // Largest Contentful Paint: < 2.5s
  FID: 100,  // First Input Delay: < 100ms
  CLS: 0.1,  // Cumulative Layout Shift: < 0.1
  TTFB: 600, // Time to First Byte: < 600ms
} as const;

/**
 * Send performance metrics to backend or analytics service
 */
function sendToAnalytics(metric: WebVitals) {
  // In production, send to APM service (e.g., Sentry, Datadog, New Relic)
  if (import.meta.env.PROD) {
    // Example: Send to backend endpoint
    fetch('/api/metrics/web-vitals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: metric.name,
        value: metric.value,
        id: metric.id,
        delta: metric.delta,
        rating: metric.rating,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      }),
    }).catch((error) => {
      console.warn('Failed to send performance metric:', error);
    });
  } else {
    // In development, log to console
    console.log(`[Performance] ${metric.name}: ${metric.value.toFixed(2)}ms (${metric.rating})`);
  }
}

/**
 * Check if metric exceeds performance budget
 */
function checkPerformanceBudget(metric: WebVitals): boolean {
  const budget = PERFORMANCE_BUDGETS[metric.name as keyof typeof PERFORMANCE_BUDGETS];
  if (!budget) return true;

  const exceedsBudget = metric.value > budget;
  if (exceedsBudget) {
    console.warn(
      `[Performance Budget Exceeded] ${metric.name}: ${metric.value.toFixed(2)}ms exceeds budget of ${budget}ms`
    );
  }
  return !exceedsBudget;
}

/**
 * Get rating for a metric value
 */
function getRating(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const budget = PERFORMANCE_BUDGETS[name as keyof typeof PERFORMANCE_BUDGETS];
  if (!budget) return 'good';

  // Good: within budget
  // Needs improvement: 1-2x budget
  // Poor: >2x budget
  if (value <= budget) return 'good';
  if (value <= budget * 2) return 'needs-improvement';
  return 'poor';
}

/**
 * Report Web Vital metric
 */
export function reportWebVital(metric: { name: string; value: number; id: string; delta: number }) {
  const rating = getRating(metric.name, metric.value);
  const webVital: WebVitals = {
    ...metric,
    rating,
  };

  checkPerformanceBudget(webVital);
  sendToAnalytics(webVital);
}

/**
 * Initialize Web Vitals tracking
 */
export function initWebVitals() {
  if (typeof window === 'undefined') return;

  // Use web-vitals library if available, otherwise use manual tracking
  import('web-vitals')
    .then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
      onCLS(reportWebVital);
      onFID(reportWebVital);
      onFCP(reportWebVital);
      onLCP(reportWebVital);
      onTTFB(reportWebVital);
    })
    .catch((error) => {
      console.warn('Failed to load web-vitals library:', error);
      // Fallback: Manual tracking can be implemented here
    });
}

/**
 * Get current performance metrics summary
 */
export function getPerformanceSummary() {
  if (typeof window === 'undefined' || !('performance' in window)) {
    return null;
  }

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  if (!navigation) return null;

  return {
    dns: navigation.domainLookupEnd - navigation.domainLookupStart,
    tcp: navigation.connectEnd - navigation.connectStart,
    request: navigation.responseStart - navigation.requestStart,
    response: navigation.responseEnd - navigation.responseStart,
    dom: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
    load: navigation.loadEventEnd - navigation.loadEventStart,
    total: navigation.loadEventEnd - navigation.fetchStart,
  };
}

