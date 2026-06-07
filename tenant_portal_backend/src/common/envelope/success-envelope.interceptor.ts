import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, map } from 'rxjs';
import { apiOk } from '../api-envelope';
import { MIGRATED_ENVELOPE_KEY } from './envelope.decorator';

@Injectable()
export class SuccessEnvelopeInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const useEnvelope = this.reflector.getAllAndOverride<boolean>(MIGRATED_ENVELOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!useEnvelope) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    const requestId = request.headers?.['x-request-id'];

    return next.handle().pipe(
      map((value) => {
        if (value && typeof value === 'object' && 'data' in value && 'meta' in value && 'errors' in value) {
          return value;
        }

        return apiOk(value, {
          requestId: Array.isArray(requestId) ? requestId[0] : requestId,
        });
      }),
    );
  }
}
