import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { normalizeEmail } from '../utils/normalizeEmail';
import { normalizePhone } from '../utils/normalizePhone';

@Injectable()
export class UsersService {
  private readonly saltRounds = 10;

  constructor(private prisma: PrismaService) {}
  private readonly elevatedRoles: Role[] = [Role.PROPERTY_MANAGER, Role.ADMIN];

  async findOne(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async create(
    data: Prisma.XOR<Prisma.UserCreateInput, Prisma.UserUncheckedCreateInput>,
    requestingUserRole?: Role,
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

    return this.prisma.user.create({ data });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async findAll(skip?: number, take?: number, role?: Role): Promise<Omit<User, 'password'>[]> {
    const users = await this.prisma.user.findMany({
      where: role ? { role } : undefined,
      skip,
      take,
      orderBy: { id: 'asc' },
    });
    // Remove passwords from results
    return users.map(({ password, ...user }) => user);
  }

  async count(role?: Role): Promise<number> {
    return this.prisma.user.count({
      where: role ? { role } : undefined,
    });
  }

  async update(
    id: string,
    data: Prisma.UserUpdateInput,
    requestingUserId?: string,
    requestingUserRole?: Role,
  ): Promise<User> {
    // Prevent self-promotion (users cannot change their own role)
    if (data.role !== undefined && requestingUserId === id) {
      throw new ForbiddenException('Users cannot change their own role');
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

  async delete(id: string, requestingUserId?: string): Promise<void> {
    // Prevent self-deletion
    if (requestingUserId === id) {
      throw new ForbiddenException('Users cannot delete their own account');
    }
    await this.prisma.user.delete({ where: { id } });
  }
}
