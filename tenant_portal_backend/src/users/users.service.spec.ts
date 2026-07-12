import { ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';

jest.mock('bcrypt');

/**
 * Focused security tests for the role-elevation guard in UsersService.create().
 *
 * Regression coverage for the unauthenticated privilege-escalation issue where a
 * public caller (register passes `requestingUserRole = undefined`) could create a
 * PROPERTY_MANAGER/ADMIN account. The guard now default-denies elevation when no
 * elevated requesting role is present.
 */
describe('UsersService.create — role elevation guard', () => {
  let service: UsersService;
  let prisma: any;
  let mil: any;

  beforeEach(() => {
    (bcrypt.hash as jest.Mock).mockResolvedValue('hashed-password');

    prisma = {
      user: {
        create: jest.fn(({ data }: any) => Promise.resolve({ id: 'user-1', ...data })),
      },
      userOrganization: { create: jest.fn().mockResolvedValue({}) },
    };
    mil = { milTenantTenantIdCryptoStatusGet: jest.fn().mockResolvedValue(undefined) };

    service = new UsersService(prisma, mil);
  });

  const baseData = {
    username: 'someone@example.com',
    password: 'StrongPass@123',
    email: 'someone@example.com',
  };

  it('denies an elevated role when no requesting role is supplied (default-deny)', async () => {
    await expect(
      service.create({ ...baseData, role: Role.ADMIN } as any, undefined),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('denies an elevated role when the requester is not elevated', async () => {
    await expect(
      service.create({ ...baseData, role: Role.PROPERTY_MANAGER } as any, Role.TENANT),
    ).rejects.toBeInstanceOf(ForbiddenException);
    expect(prisma.user.create).not.toHaveBeenCalled();
  });

  it('allows an elevated role when the requester is elevated', async () => {
    const user = await service.create(
      { ...baseData, role: Role.ADMIN } as any,
      Role.ADMIN,
    );
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(user.role).toBe(Role.ADMIN);
  });

  it('allows a TENANT to be created without any requesting role', async () => {
    const user = await service.create(
      { ...baseData, role: Role.TENANT } as any,
      undefined,
    );
    expect(prisma.user.create).toHaveBeenCalledTimes(1);
    expect(user.role).toBe(Role.TENANT);
  });

  it('defaults a missing role to TENANT', async () => {
    const user = await service.create({ ...baseData } as any, undefined);
    expect(user.role).toBe(Role.TENANT);
  });
});
