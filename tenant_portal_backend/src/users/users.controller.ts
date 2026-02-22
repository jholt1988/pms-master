import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  ParseIntPipe,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersDto } from './dto/list-users.dto';
import { Roles } from '../auth/roles.decorator';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { Role } from '@prisma/client';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    sub: string;
    username: string;
    role: Role;
  };
}

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.PROPERTY_MANAGER, Role.ADMIN)
  async listUsers(@Query() query: ListUsersDto, @OrgId() orgId?: string) {
    const users = await this.usersService.findAll(query.skip, query.take, query.role, orgId);
    const total = await this.usersService.count(query.role, orgId);
    return {
      data: users,
      total,
      skip: query.skip || 0,
      take: query.take || 10,
    };
  }

  @Get(':id')
  @Roles(Role.PROPERTY_MANAGER, Role.ADMIN)
  async getUser(@Param('id') id: string, @OrgId() orgId?: string) {
    const user = await this.usersService.findById(id, orgId);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Post()
  @Roles(Role.PROPERTY_MANAGER, Role.ADMIN)
  async createUser(@Body() createUserDto: CreateUserDto, @Req() req: AuthenticatedRequest, @OrgId() orgId?: string) {
    return this.usersService.create(createUserDto, req.user.role, orgId);
  }

  @Put(':id')
  @Roles(Role.PROPERTY_MANAGER, Role.ADMIN)
  async updateUser(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
    @OrgId() orgId?: string,
  ) {
    return this.usersService.update(id, updateUserDto, req.user.sub, req.user.role, orgId);
  }

  @Delete(':id')
  @Roles(Role.PROPERTY_MANAGER, Role.ADMIN)
  async deleteUser(@Param('id') id: string, @Req() req: AuthenticatedRequest, @OrgId() orgId?: string) {
    await this.usersService.delete(id, req.user.sub, orgId);
    return { success: true };
  }
}
