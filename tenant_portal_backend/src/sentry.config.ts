import * as Sentry from '@sentry/nestjs';
import { nodeProfilingIntegration } from '@sentry/profiling-node';

export function initializeSentry() {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || 'development',
    integrations: [
      // Add profiling integration (optional but recommended)
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
    
    beforeSend(event, hint) {
      // Don't log certain errors in development
      if (process.env.NODE_ENV === 'development') {
        console.error('Sentry Error:', hint.originalException || event.message);
      }
      
      // Filter out sensitive information
      if (event.request?.data) {
        // Remove password fields
        if (typeof event.request.data === 'object' && event.request.data !== null) {
          const data = event.request.data as any;
          if ('password' in data) delete data.password;
          if ('currentPassword' in data) delete data.currentPassword;
          if ('newPassword' in data) delete data.newPassword;
          if ('confirmPassword' in data) delete data.confirmPassword;
        }
      }
      
      return event;
    },
    
    beforeBreadcrumb(breadcrumb) {
      // Filter out noisy breadcrumbs
      if (breadcrumb.category === 'http' && breadcrumb.data?.url?.includes('/health')) {
        return null;
      }
      return breadcrumb;
    },
  });
}

export { Sentry };