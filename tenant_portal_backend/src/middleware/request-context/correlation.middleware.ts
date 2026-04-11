import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { requestContextStorage, createRequestContext } from './index';

const REQUEST_ID_HEADER = 'x-request-id';

@Injectable()
export class CorrelationMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    const incomingId = req.headers[REQUEST_ID_HEADER] as string | undefined;
    const ctx = createRequestContext({
      requestId: incomingId || undefined,
      method: req.method,
      path: req.path,
    });

    res.setHeader(REQUEST_ID_HEADER, ctx.requestId);

    requestContextStorage.run(ctx, () => next());
  }
}
