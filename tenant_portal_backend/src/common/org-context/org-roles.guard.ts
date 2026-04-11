import { CanActivate, ExecutionContext, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { OrgRole } from '@prisma/client';
import { ORG_ROLES_KEY } from './org-roles.decorator';
import { ApiException } from '../errors';
import { ErrorCode } from '../errors/error-codes.enum';

@Injectable()
export class OrgRolesGuard implements CanActivate {
  private readonly logger = new Logger(OrgRolesGuard.name);

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredOrgRoles = this.reflector.getAllAndOverride<OrgRole[]>(ORG_ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredOrgRoles || requiredOrgRoles.length === 0) {
      return true;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (user?.role === 'ADMIN') {
      return true;
    }

    const org = req.org as { orgId: string; orgRole: OrgRole } | undefined;
    if (!org) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'Organization context is required for this endpoint',
      );
    }

    if (!requiredOrgRoles.includes(org.orgRole)) {
      this.logger.debug(
        `OrgRoles denied: required=${requiredOrgRoles.join(',')} actual=${org.orgRole}`,
      );
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        `Insufficient organization permissions. Required: ${requiredOrgRoles.join(' or ')}`,
      );
    }

    return true;
  }
}
