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
import { Role } from '@prisma/client';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user: {
    sub: number;
    username: string;
    role: Role;
  };
}

@Controller('users')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Roles(Role.PROPERTY_MANAGER)
  async listUsers(@Query() query: ListUsersDto) {
    const users = await this.usersService.findAll(query.skip, query.take, query.role);
    const total = await this.usersService.count(query.role);
    return {
      data: users,
      total,
      skip: query.skip || 0,
      take: query.take || 10,
    };
  }

  @Get(':id')
  @Roles(Role.PROPERTY_MANAGER)
  async getUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.usersService.findById(id);
    if (!user) {
      throw new BadRequestException('User not found');
    }
    // Remove password from response
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  @Post()
  @Roles(Role.PROPERTY_MANAGER)
  async createUser(@Body() createUserDto: CreateUserDto, @Req() req: AuthenticatedRequest) {
    return this.usersService.create(createUserDto, req.user.role);
  }

  @Put(':id')
  @Roles(Role.PROPERTY_MANAGER)
  async updateUser(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.update(id, updateUserDto, req.user.sub, req.user.role);
  }

  @Delete(':id')
  @Roles(Role.PROPERTY_MANAGER)
  async deleteUser(@Param('id', ParseIntPipe) id: number, @Req() req: AuthenticatedRequest) {
    await this.usersService.delete(id, req.user.sub);
    return { success: true };
  }
}

