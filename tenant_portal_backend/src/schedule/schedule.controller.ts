import { Controller, Get, Post, Body, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ScheduleService } from './schedule.service';
import { CreateScheduleEventDto } from './dto/create-schedule-event.dto';

@Controller('schedule')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  @Roles(Role.PROPERTY_MANAGER)
  async getAllEvents(@OrgId() orgId?: string) {
    return this.scheduleService.getAllEvents(orgId);
  }

  @Get('summary')
  @Roles(Role.PROPERTY_MANAGER)
  async getSummary(@OrgId() orgId?: string) {
    return this.scheduleService.getSummary(orgId);
  }

  @Get('daily')
  @Roles(Role.PROPERTY_MANAGER)
  async getDailyEvents(@Query('date') date: string, @OrgId() orgId?: string) {
    return this.scheduleService.getDailyEvents(date, orgId);
  }

  @Get('weekly')
  @Roles(Role.PROPERTY_MANAGER)
  async getWeeklyEvents(@Query('startDate') startDate: string, @OrgId() orgId?: string) {
    return this.scheduleService.getWeeklyEvents(startDate, orgId);
  }

  @Get('monthly')
  @Roles(Role.PROPERTY_MANAGER)
  async getMonthlyEvents(@Query('month') month: string, @Query('year') year: string, @OrgId() orgId?: string) {
    return this.scheduleService.getMonthlyEvents(parseInt(month), parseInt(year), orgId);
  }

  @Get('expirations')
  @Roles(Role.PROPERTY_MANAGER)
  async getLeaseExpirations(@OrgId() orgId?: string) {
    return this.scheduleService.getLeaseExpirations(orgId);
  }

  @Get('today')
  @Roles(Role.PROPERTY_MANAGER)
  async getTodayEvents(@OrgId() orgId?: string) {
    return this.scheduleService.getTodayEvents(orgId);
  }

  @Get('this-week')
  @Roles(Role.PROPERTY_MANAGER)
  async getThisWeekEvents(@OrgId() orgId?: string) {
    return this.scheduleService.getThisWeekEvents(orgId);
  }

  @Get('this-month')
  @Roles(Role.PROPERTY_MANAGER)
  async getThisMonthEvents(@OrgId() orgId?: string) {
    return this.scheduleService.getThisMonthEvents(orgId);
  }

  @Post()
  @Roles(Role.PROPERTY_MANAGER)
  async createEvent(@Body() createEventDto: CreateScheduleEventDto, @Request() req: any, @OrgId() orgId?: string) {
    return this.scheduleService.createEvent(createEventDto, orgId, req.user?.id ?? req.user?.userId);
  }
}
