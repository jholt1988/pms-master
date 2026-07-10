import { OrgRole, Role } from '@prisma/client';
import { OrgContextGuard } from './org-context.guard';

/**
 * Unit tests for OrgContextGuard, now registered as a global APP_GUARD.
 * Verifies the exemption paths (skip / public / no-user / tenant) short-circuit
 * without a DB lookup, and that single-org membership attaches req.org while
 * multi-org membership is rejected.
 */
type ReflectorFlags = { skip?: boolean; isPublic?: boolean };

function makeReflector(flags: ReflectorFlags = {}): any {
  return {
    getAllAndOverride: jest.fn((key: string) => {
      if (key === 'skipOrgContext') return flags.skip ?? false;
      if (key === 'isPublic') return flags.isPublic ?? false;
      return undefined;
    }),
  };
}

function makeContext(user?: unknown): any {
  const req: any = { user };
  return {
    __req: req,
    switchToHttp: () => ({ getRequest: () => req }),
    getHandler: () => ({}),
    getClass: () => ({}),
  };
}

describe('OrgContextGuard', () => {
  let prisma: any;

  beforeEach(() => {
    prisma = { userOrganization: { findMany: jest.fn() } };
  });

  it('short-circuits for @SkipOrgContext routes without a DB lookup', async () => {
    const guard = new OrgContextGuard(prisma, makeReflector({ skip: true }));
    await expect(
      guard.canActivate(makeContext({ userId: 'u1', role: Role.ADMIN })),
    ).resolves.toBe(true);
    expect(prisma.userOrganization.findMany).not.toHaveBeenCalled();
  });

  it('short-circuits for @Public routes without a DB lookup', async () => {
    const guard = new OrgContextGuard(prisma, makeReflector({ isPublic: true }));
    await expect(
      guard.canActivate(makeContext({ userId: 'u1', role: Role.ADMIN })),
    ).resolves.toBe(true);
    expect(prisma.userOrganization.findMany).not.toHaveBeenCalled();
  });

  it('allows unauthenticated requests (no user on request)', async () => {
    const guard = new OrgContextGuard(prisma, makeReflector());
    await expect(guard.canActivate(makeContext(undefined))).resolves.toBe(true);
    expect(prisma.userOrganization.findMany).not.toHaveBeenCalled();
  });

  it('allows TENANT users through without org context', async () => {
    const guard = new OrgContextGuard(prisma, makeReflector());
    await expect(
      guard.canActivate(makeContext({ userId: 'u1', role: Role.TENANT })),
    ).resolves.toBe(true);
    expect(prisma.userOrganization.findMany).not.toHaveBeenCalled();
  });

  it('attaches req.org for a single-organization non-tenant user', async () => {
    prisma.userOrganization.findMany.mockResolvedValue([
      { organizationId: 'org-1', role: OrgRole.ADMIN },
    ]);
    const guard = new OrgContextGuard(prisma, makeReflector());
    const ctx = makeContext({ userId: 'u1', role: Role.PROPERTY_MANAGER });

    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(ctx.__req.org).toEqual({ orgId: 'org-1', orgRole: OrgRole.ADMIN });
  });

  it('rejects a non-tenant user that belongs to more than one organization', async () => {
    prisma.userOrganization.findMany.mockResolvedValue([
      { organizationId: 'org-1', role: OrgRole.ADMIN },
      { organizationId: 'org-2', role: OrgRole.MEMBER },
    ]);
    const guard = new OrgContextGuard(prisma, makeReflector());

    await expect(
      guard.canActivate(makeContext({ userId: 'u1', role: Role.ADMIN })),
    ).rejects.toBeDefined();
  });

  it('allows a non-tenant with no memberships in all environments, attaching no org', async () => {
    prisma.userOrganization.findMany.mockResolvedValue([]);
    const guard = new OrgContextGuard(prisma, makeReflector());

    // 0-org is permissive even in production; enforcement is left to @OrgId().
    const prev = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';
      const ctx = makeContext({ userId: 'u1', role: Role.ADMIN });
      await expect(guard.canActivate(ctx)).resolves.toBe(true);
      expect(ctx.__req.org).toBeUndefined();
    } finally {
      process.env.NODE_ENV = prev;
    }
  });
});
