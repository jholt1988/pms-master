import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { PrometheusService } from './prometheus.service';
import { getRequestContext } from '../middleware/request-context';

@Injectable()
export class HttpMetricsInterceptor implements NestInterceptor {
  constructor(private readonly prometheus: PrometheusService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    if (context.getType() !== 'http') return next.handle();

    const req = context.switchToHttp().getRequest();
    const route = req.route?.path || req.path || 'unknown';
    const method = req.method;

    this.prometheus.activeConnections.inc();
    const endTimer = this.prometheus.httpRequestDuration.startTimer({ method, route });

    return next.handle().pipe(
      tap({
        next: () => {
          const res = context.switchToHttp().getResponse();
          const statusCode = String(res.statusCode);
          endTimer({ status_code: statusCode });
          this.prometheus.httpRequestTotal.inc({ method, route, status_code: statusCode });
          if (res.statusCode >= 400) {
            this.prometheus.httpErrorTotal.inc({ method, route, status_code: statusCode });
          }
          this.prometheus.activeConnections.dec();

          const ctx = getRequestContext();
          if (ctx) {
            ctx.userId = req.user?.id;
            ctx.orgId = req.user?.organizationId;
          }
        },
        error: (err) => {
          const statusCode = String(err.status || err.getStatus?.() || 500);
          endTimer({ status_code: statusCode });
          this.prometheus.httpRequestTotal.inc({ method, route, status_code: statusCode });
          this.prometheus.httpErrorTotal.inc({ method, route, status_code: statusCode });
          this.prometheus.activeConnections.dec();
        },
      }),
    );
  }
}
