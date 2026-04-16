import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Auth Guard that switches based on environment:
 * - Production: Require valid JWT token  
 * - Development: Accept JWT or fall back to mock headers for easy testing
 */
@Injectable()
export class DevModeAuthGuard implements CanActivate {
  private readonly logger = new Logger(DevModeAuthGuard.name);
  private readonly jwtAuthGuard = new (AuthGuard as any)('jwt');

  constructor() {
    this.jwtAuthGuard = new (AuthGuard('jwt'))();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> {
    const isProduction = process.env.NODE_ENV === 'production';
    const request = context.switchToHttp().getRequest();

    // In production, always require JWT
    if (isProduction) {
      return this.jwtAuthGuard.canActivate(context);
    }

    // In development, check for JWT first
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      return this.jwtAuthGuard.canActivate(context);
    }

    // Fall back to mock headers in dev only
    const mockUserId = request.headers['x-mock-user-id'] || 'dev-admin-uuid-001';
    const mockRole = request.headers['x-mock-role'] || 'ADMIN';

    request.user = {
      id: mockUserId,
      role: mockRole,
    };

    this.logger.warn(`Mock auth used for ${request.method} ${request.url}. Set JWT for real auth.`);
    return true;
  }
}