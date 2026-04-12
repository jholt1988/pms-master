
import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AppRole, ROLES_KEY } from './roles.decorator';
import { normalizeAppRole } from './app-role';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AppRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    const normalizedRole = user?.role ? normalizeAppRole(String(user.role)) : undefined;
    if (normalizedRole === 'ADMIN') {
      return true;
    } else if (!normalizedRole) {
      this.debug('deny:no-role', requiredRoles, user);
      return false;
    }

    // Admins are allowed to bypass role checks
    

    const allowed = requiredRoles.includes(normalizedRole);
    if (!allowed) {
      this.debug('deny:wrong-role', requiredRoles, { ...user, role: normalizedRole });
    }
    return allowed;
  }

  // Dev-only debug to help diagnose 403s without spamming prod logs
  private debug(reason: string, requiredRoles: AppRole[], user: any) {
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    this.logger.debug(
      `${reason} required=${requiredRoles?.join(',') ?? 'none'} actual=${user?.role ?? 'missing'}`,
    );
  }
}
