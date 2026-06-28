import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { ApiException } from '../errors';
import { ErrorCode } from '../errors/error-codes.enum';

/**
 * Resolves the caller's organization id from request context (set by
 * OrgContextGuard). Throws 403 when no org context is present.
 *
 * IMPORTANT: OrgContextGuard intentionally lets TENANT users through WITHOUT
 * setting req.org (tenants are scoped by their own user/lease, not by an org
 * membership). Therefore @OrgId() must NOT be used on endpoints that TENANT
 * roles are allowed to call — it will throw 403 for every tenant request even
 * though the handler declares `orgId?` as optional. For those mixed-role
 * endpoints use @OptionalOrgId() instead, which yields undefined for tenants.
 */
export const OrgId = createParamDecorator((_: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<Request>();
  const orgId = (req as any).org?.orgId as string | undefined;
  if (!orgId) {
    throw ApiException.forbidden(
      ErrorCode.AUTH_FORBIDDEN,
      'Organization context is required for this endpoint',
    );
  }
  return orgId;
});

/**
 * Like @OrgId() but returns `undefined` instead of throwing when no org context
 * is present. Use on endpoints accessible to TENANT users (whom OrgContextGuard
 * lets through without an org) alongside staff roles: staff get their org id for
 * scoping; tenants get undefined and are scoped by the service via userId/role.
 */
export const OptionalOrgId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined => {
    const req = ctx.switchToHttp().getRequest<Request>();
    return (req as any).org?.orgId as string | undefined;
  },
);
