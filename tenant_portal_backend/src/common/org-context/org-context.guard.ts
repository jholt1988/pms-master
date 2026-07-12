import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiException } from '../errors';
import { ErrorCode } from '../errors/error-codes.enum';
import { OrgRole, Role } from '@prisma/client';
import { IS_PUBLIC_KEY } from '../../auth/public.decorator';
import { SKIP_ORG_CONTEXT_KEY } from './skip-org-context.decorator';

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
  constructor(
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Registered globally (APP_GUARD). Exempt routes/controllers that opt out
    // via @SkipOrgContext(), and @Public() routes (which have no authenticated
    // user anyway). Both checks read handler-level then class-level metadata.
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_ORG_CONTEXT_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (skip) {
      return true;
    }

    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

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
      // Permissive by design: a user with no organization is allowed through
      // WITHOUT an org context (req.org stays unset), in every environment.
      // Endpoints that require an organization enforce it via the @OrgId() param
      // decorator (which throws when req.org is missing); endpoints that don't
      // (onboarding, org creation, accept-invite) keep working. This keeps the
      // global guard from 403-ing legitimate 0-org flows in production.
      return true;
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
