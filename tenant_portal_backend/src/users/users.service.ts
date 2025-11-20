import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Role, User } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  private readonly saltRounds = 10;

  constructor(private prisma: PrismaService) {}

  async findOne(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { username } });
  }

  async create(
    data: Prisma.XOR<Prisma.UserCreateInput, Prisma.UserUncheckedCreateInput>,
    requestingUserRole?: Role,
  ): Promise<User> {
    // Hash password if provided
    if (data.password) {
      data.password = await bcrypt.hash(data.password, this.saltRounds);
    }

    // Role validation: Only PROPERTY_MANAGER can create PROPERTY_MANAGER accounts
    if (data.role === Role.PROPERTY_MANAGER) {
      if (requestingUserRole !== Role.PROPERTY_MANAGER) {
        throw new ForbiddenException('Only property managers can create property manager accounts');
      }
    } else {
      // Default to TENANT if not specified
      data.role = data.role || Role.TENANT;
    }

    return this.prisma.user.create({ data });
  }

  async findById(id: number): Promise<User | null> {
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
    id: number,
    data: Prisma.UserUpdateInput,
    requestingUserId?: number,
    requestingUserRole?: Role,
  ): Promise<User> {
    // Prevent self-promotion (users cannot change their own role)
    if (data.role !== undefined && requestingUserId === id) {
      throw new ForbiddenException('Users cannot change their own role');
    }

    // Role validation: Only PROPERTY_MANAGER can assign PROPERTY_MANAGER role
    if (data.role === Role.PROPERTY_MANAGER && requestingUserRole !== Role.PROPERTY_MANAGER) {
      throw new ForbiddenException('Only property managers can assign property manager role');
    }

    // Hash password if provided
    if (typeof data.password === 'string') {
      data.password = await bcrypt.hash(data.password, this.saltRounds);
    }

    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: number, requestingUserId?: number): Promise<void> {
    // Prevent self-deletion
    if (requestingUserId === id) {
      throw new ForbiddenException('Users cannot delete their own account');
    }
    await this.prisma.user.delete({ where: { id } });
  }
}
