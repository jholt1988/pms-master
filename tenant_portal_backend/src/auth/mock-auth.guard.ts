// src/auth/mock-auth.guard.ts
import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { normalizeAppRole } from './app-role';

@Injectable()
export class MockAuthGuard implements CanActivate {
  private readonly logger = new Logger(MockAuthGuard.name);

  canActivate(context: ExecutionContext): boolean {
    // SECURITY PRECAUTION: Never allow this to run in production
    if (process.env.NODE_ENV === 'production') {
      this.logger.error('CRITICAL: MockAuthGuard executed in production environment!');
      return false; 
    }

    const request = context.switchToHttp().getRequest();

    // Read mock headers sent by Next.js, or use defaults
    const mockUserId = request.headers['x-mock-user-id'] || 'dev-admin-uuid-001';
    const rawRole = request.headers['x-mock-role'] || 'ADMIN';
    const mockRole = normalizeAppRole(String(rawRole));

    // Inject the fake user object
    request.user = {
      id: mockUserId,
      role: mockRole,
    };

    return true; // Grant access
  }
}
