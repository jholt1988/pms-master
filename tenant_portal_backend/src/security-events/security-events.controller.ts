import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role, SecurityEventType } from '@prisma/client';
import { SecurityEventsService } from './security-events.service';

@Controller('security-events')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(Role.PROPERTY_MANAGER)
export class SecurityEventsController {
  constructor(private readonly securityEventsService: SecurityEventsService) {}

  @Get()
  async list(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('userId') userId?: string,
    @Query('username') username?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.securityEventsService.listEvents({
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
      userId: userId ? Number(userId) : undefined,
      username: username ?? undefined,
      type:
        type && Object.values(SecurityEventType).includes(type as SecurityEventType)
          ? (type as SecurityEventType)
          : undefined,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
    });
  }
}
