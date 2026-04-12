/**
 * DevMockAuthMiddleware
 *
 * Development-only middleware that converts X-Mock-User-Id / X-Mock-Role
 * headers (sent by keyring-os admin in dev) into a signed JWT so that the
 * standard AuthGuard('jwt') accepts the request without modification.
 *
 * NEVER active in production — guarded by NODE_ENV check.
 */
import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';
import { normalizeAppRole } from '../auth/app-role';

function base64url(input: string | Buffer): string {
  const buf = typeof input === 'string' ? Buffer.from(input) : input;
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

function signJwt(payload: Record<string, unknown>, secret: string): string {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const sig = base64url(
    createHmac('sha256', secret)
      .update(`${header}.${body}`)
      .digest(),
  );
  return `${header}.${body}.${sig}`;
}

@Injectable()
export class DevMockAuthMiddleware implements NestMiddleware {
  private readonly logger = new Logger(DevMockAuthMiddleware.name);
  private readonly isEnabled: boolean;

  constructor(private readonly configService: ConfigService) {
    const env = (configService.get<string>('NODE_ENV') ?? 'development').toLowerCase();
    this.isEnabled = env !== 'production';
    if (this.isEnabled) {
      this.logger.warn(
        'DevMockAuthMiddleware active — X-Mock-User-Id/X-Mock-Role headers accepted. Disable in production.',
      );
    }
  }

  use(req: Request, _res: Response, next: NextFunction) {
    if (!this.isEnabled) return next();

    const mockUserId = req.headers['x-mock-user-id'] as string | undefined;
    const mockRole = req.headers['x-mock-role'] as string | undefined;

    // Only inject if mock headers are present AND no real Authorization header exists
    if (mockUserId && mockRole && !req.headers['authorization']) {
      const normalizedRole = normalizeAppRole(mockRole);
      const secret = this.configService.get<string>('JWT_SECRET') ?? 'dev-jwt-secret-change-me';
      const now = Math.floor(Date.now() / 1000);

      const token = signJwt(
        {
          sub: mockUserId,
          username: 'dev-mock-user',
          role: normalizedRole,
          iat: now,
          exp: now + 3600,
        },
        secret,
      );

      req.headers['authorization'] = `Bearer ${token}`;
      this.logger.debug(`Mock auth injected for userId=${mockUserId} role=${normalizedRole}`);
    }

    next();
  }
}
