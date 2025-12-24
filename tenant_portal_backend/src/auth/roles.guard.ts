
import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);

  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles) {
      return true;
    }
    const { user } = context.switchToHttp().getRequest();
    if (user.role === Role.ADMIN) {
      return true;
    }
   else if (!user?.role) {
      this.debug('deny:no-role', requiredRoles, user);
      return false;
    }

    // Admins are allowed to bypass role checks
    

    const allowed = requiredRoles.includes(user.role);
    if (!allowed) {
      this.debug('deny:wrong-role', requiredRoles, user);
    }
    return allowed;
  }

  // Dev-only debug to help diagnose 403s without spamming prod logs
  private debug(reason: string, requiredRoles: Role[], user: any) {
    if (process.env.NODE_ENV === 'production') {
      return;
    }
    this.logger.debug(
      `${reason} required=${requiredRoles?.join(',') ?? 'none'} actual=${user?.role ?? 'missing'}`,
    );
  }
}
