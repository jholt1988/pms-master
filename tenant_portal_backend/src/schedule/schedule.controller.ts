import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { Role } from '@prisma/client';
import { ScheduleService } from './schedule.service';
import { CreateScheduleEventDto } from './dto/create-schedule-event.dto';

@Controller('schedule')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class ScheduleController {
  constructor(private readonly scheduleService: ScheduleService) {}

  @Get()
  @Roles(Role.PROPERTY_MANAGER)
  async getAllEvents() {
    return this.scheduleService.getAllEvents();
  }

  @Get('summary')
  @Roles(Role.PROPERTY_MANAGER)
  async getSummary() {
    return this.scheduleService.getSummary();
  }

  @Get('daily')
  @Roles(Role.PROPERTY_MANAGER)
  async getDailyEvents(@Query('date') date: string) {
    return this.scheduleService.getDailyEvents(date);
  }

  @Get('weekly')
  @Roles(Role.PROPERTY_MANAGER)
  async getWeeklyEvents(@Query('startDate') startDate: string) {
    return this.scheduleService.getWeeklyEvents(startDate);
  }

  @Get('monthly')
  @Roles(Role.PROPERTY_MANAGER)
  async getMonthlyEvents(@Query('month') month: string, @Query('year') year: string) {
    return this.scheduleService.getMonthlyEvents(parseInt(month), parseInt(year));
  }

  @Get('expirations')
  @Roles(Role.PROPERTY_MANAGER)
  async getLeaseExpirations() {
    return this.scheduleService.getLeaseExpirations();
  }

  @Get('today')
  @Roles(Role.PROPERTY_MANAGER)
  async getTodayEvents() {
    return this.scheduleService.getTodayEvents();
  }

  @Get('this-week')
  @Roles(Role.PROPERTY_MANAGER)
  async getThisWeekEvents() {
    return this.scheduleService.getThisWeekEvents();
  }

  @Get('this-month')
  @Roles(Role.PROPERTY_MANAGER)
  async getThisMonthEvents() {
    return this.scheduleService.getThisMonthEvents();
  }

  @Post()
  @Roles(Role.PROPERTY_MANAGER)
  async createEvent(@Body() createEventDto: CreateScheduleEventDto) {
    return this.scheduleService.createEvent(createEventDto);
  }
}
