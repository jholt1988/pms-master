import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { normalizeEmail } from '../utils/normalizeEmail';
import { normalizePhone } from '../utils/normalizePhone';
import { DefaultApi as MilApiClient } from '../../../packages/mil-client';

@Injectable()
export class UsersService {
  private readonly saltRounds = 10;
  private readonly logger = new Logger(UsersService.name);

  constructor(
    private prisma: PrismaService,
    private readonly milApiClient: MilApiClient,
  ) {}
  private readonly elevatedRoles: Role[] = [Role.PROPERTY_MANAGER, Role.ADMIN];

  async findOne(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async create(
    data: Prisma.XOR<Prisma.UserCreateInput, Prisma.UserUncheckedCreateInput>,
    requestingUserRole?: Role,
    orgId?: string,
  ): Promise<User> {
    if (typeof data.email === 'string' || data.email === null) {
      data.email = normalizeEmail(data.email);
    }

    if (typeof data.phoneNumber === 'string' || data.phoneNumber === null) {
      data.phoneNumber = normalizePhone(data.phoneNumber);
    }

    // Hash password if provided
    if (data.password) {
      data.password = await bcrypt.hash(data.password, this.saltRounds);
    }

    // Role validation: elevated roles require elevated creator
    if (this.elevatedRoles.includes(data.role as Role)) {
      if (requestingUserRole && !this.elevatedRoles.includes(requestingUserRole)) {
        throw new ForbiddenException('Only property managers or admins can create privileged accounts');
      }
    } else {
      // Default to TENANT if not specified
      data.role = data.role || Role.TENANT;
    }

    const user = await this.prisma.user.create({ data });

    if (orgId) {
      await this.prisma.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: orgId,
          role: data.role as Role,
        },
      });
    }

    // ---- MIL Integration ----
    try {
        await this.milApiClient.milTenantTenantIdCryptoStatusGet(user.id);
        this.logger.log(`Provisioned tenant crypto keys in MIL for new user: ${user.id}`);
    } catch(error) {
        this.logger.error(`Failed to provision MIL crypto keys for new user ${user.id}`, error);
        // Do not fail the creation if MIL is down, just log the error.
    }
    // -------------------------

    return user;
  }

  async findById(id: string, orgId?: string): Promise<User | null> {
    if (orgId) {
      const membership = await this.prisma.userOrganization.findFirst({
        where: { userId: id, organizationId: orgId },
        select: { id: true },
      });
      if (!membership) {
        return null;
      }
    }
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll(skip?: number, take?: number, role?: Role, orgId?: string): Promise<Omit<User, 'password'>[]> {
    const userIds = orgId
      ? await this.prisma.userOrganization.findMany({
          where: { organizationId: orgId },
          select: { userId: true },
        })
      : [];

    const users = await this.prisma.user.findMany({
      where: {
        ...(role ? { role } : {}),
        ...(orgId ? { id: { in: userIds.map((u) => u.userId) } } : {}),
      },
      skip,
      take,
      orderBy: { id: 'asc' },
    });
    // Remove passwords from results
    return users.map(({ password, ...user }) => user);
  }

  async count(role?: Role, orgId?: string): Promise<number> {
    const userIds = orgId
      ? await this.prisma.userOrganization.findMany({
          where: { organizationId: orgId },
          select: { userId: true },
        })
      : [];

    return this.prisma.user.count({
      where: {
        ...(role ? { role } : {}),
        ...(orgId ? { id: { in: userIds.map((u) => u.userId) } } : {}),
      },
    });
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
    requestingUserId?: string,
    requestingUserRole?: Role,
    orgId?: string,
  ): Promise<User> {
    // Prevent self-promotion (users cannot change their own role)
    if (data.role !== undefined && requestingUserId === id) {
      throw new ForbiddenException('Users cannot change their own role');
    }

    if (orgId) {
      const membership = await this.prisma.userOrganization.findFirst({
        where: { userId: id, organizationId: orgId },
        select: { id: true },
      });
      if (!membership) {
        throw new ForbiddenException('User not in organization');
      }
    }

    // Role validation: elevated roles require elevated updater
    if (data.role && this.elevatedRoles.includes(data.role as Role)) {
      if (requestingUserRole && !this.elevatedRoles.includes(requestingUserRole)) {
        throw new ForbiddenException('Only property managers or admins can assign privileged roles');
      }
    }

    // Hash password if provided
    if (typeof data.password === 'string') {
      data.password = await bcrypt.hash(data.password, this.saltRounds);
    }

    // Prisma update inputs can be either a raw scalar/null OR an operation object like `{ set: ... }`.
    // Normalize both forms so strict TS compilation stays happy.
    {
      const email = data.email;
      if (typeof email === 'string' || email === null) {
        data.email = normalizeEmail(email as string);
      } else if (typeof email === 'object' && email && 'set' in email) {
        const op = email as { set?: string | null };
        data.email = { ...(email as any), set: normalizeEmail(op.set) };
      }
    }

    {
      const phoneNumber = data.phoneNumber;
      if (typeof phoneNumber === 'string' || phoneNumber === null) {
        data.phoneNumber = normalizePhone(phoneNumber as string);
      } else if (typeof phoneNumber === 'object' && phoneNumber && 'set' in phoneNumber) {
        const op = phoneNumber as { set?: string | null };
        data.phoneNumber = { ...(phoneNumber as any), set: normalizePhone(op.set) };
      }
    }

    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: string, requestingUserId?: string, orgId?: string): Promise<void> {
    // Prevent self-deletion
    if (requestingUserId === id) {
      throw new ForbiddenException('Users cannot delete their own account');
    }

    if (orgId) {
      const membership = await this.prisma.userOrganization.findFirst({
        where: { userId: id, organizationId: orgId },
        select: { id: true },
      });
      if (!membership) {
        throw new ForbiddenException('User not in organization');
      }
    }
    
    // ---- MIL Integration ----
    try {
        await this.milApiClient.milTenantTenantIdCryptoDeletePost(id);
        this.logger.log(`Triggered crypto-delete in MIL for deleted user: ${id}`);
    } catch(error) {
        this.logger.error(`Failed to trigger crypto-delete in MIL for user ${id}`, error);
        // Do not fail the deletion if MIL is down, just log the error.
        // A background job could retry this later.
    }
    // -------------------------

    await this.prisma.user.delete({ where: { id } });
  }
}
