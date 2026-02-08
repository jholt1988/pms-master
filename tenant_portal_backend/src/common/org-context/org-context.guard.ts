import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiException } from '../errors';
import { ErrorCode } from '../errors/error-codes.enum';
import { OrgRole, Role } from '@prisma/client';

/**
 * Single-org mode:
 * - Non-tenant users must belong to exactly one Organization via UserOrganization.
 * - Attaches req.org = { orgId, orgRole }.
 *
 * Tenants are allowed through without org context because tenant authorization
 * is primarily lease-scoped.
 */
@Injectable()
export class OrgContextGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    const user = (req as any).user as { userId: string; role: Role } | undefined;
    if (!user) {
      return true;
    }

    if (user.role === Role.TENANT) {
      return true;
    }

    const memberships = await this.prisma.userOrganization.findMany({
      where: { userId: user.userId },
      select: { organizationId: true, role: true },
      take: 2,
      orderBy: { organizationId: 'asc' },
    });

    if (memberships.length === 0) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'User is not a member of any organization',
        { userId: user.userId },
      );
    }

    if (memberships.length > 1) {
      throw ApiException.forbidden(
        ErrorCode.AUTH_FORBIDDEN,
        'Multiple organizations are not supported yet for this account',
        { userId: user.userId, organizationIds: memberships.map((m) => m.organizationId) },
      );
    }

    const membership = memberships[0];
    (req as any).org = {
      orgId: membership.organizationId,
      orgRole: membership.role ?? OrgRole.MEMBER,
    };

    return true;
  }
}
