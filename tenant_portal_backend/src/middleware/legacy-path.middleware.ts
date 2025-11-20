import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';

@Injectable()
export class LegacyPathMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction) {
    if (process.env.NODE_ENV !== 'test') {
      return next();
    }

    const legacyRoutes = ['/leasing', '/esignature'];
    for (const route of legacyRoutes) {
      if (req.url.startsWith(route)) {
        req.url = `/api${req.url}`;
        break;
      }
    }

    return next();
  }
}
