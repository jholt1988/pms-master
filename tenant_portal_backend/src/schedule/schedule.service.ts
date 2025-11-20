import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleEventDto } from './dto/create-schedule-event.dto';

@Injectable()
export class ScheduleService {
  constructor(private prisma: PrismaService) {}

  async createEvent(dto: CreateScheduleEventDto) {
    const event = await this.prisma.scheduleEvent.create({
      data: {
        type: dto.type,
        title: dto.title,
        date: new Date(dto.date),
        priority: dto.priority,
        description: dto.description,
        propertyId: dto.propertyId,
        unitId: dto.unitId,
        tenantId: dto.tenantId,
      },
    });
    return event;
  }

  async getAllEvents() {
    const events = await this.prisma.scheduleEvent.findMany({
      orderBy: { date: 'asc' },
      include: {
        property: { select: { name: true } },
        unit: { select: { name: true } },
        tenant: { select: { username: true } },
      },
    });

    return events.map(event => ({
      id: event.id,
      type: event.type,
      title: event.title,
      date: event.date,
      priority: event.priority,
      propertyName: event.property?.name,
      unitName: event.unit?.name,
      tenantName: event.tenant?.username,
      status: event.status,
    }));
  }

  async getSummary() {
    const now = new Date();
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const [totalEvents, tours, urgentEvents, highPriorityEvents, mediumPriorityEvents] = await Promise.all([
      this.prisma.scheduleEvent.count({ where: { date: { gte: now } } }),
      this.prisma.scheduleEvent.count({ where: { type: 'TOUR', date: { gte: now } } }),
      this.prisma.scheduleEvent.count({ where: { priority: 'URGENT', date: { gte: now } } }),
      this.prisma.scheduleEvent.count({ where: { priority: 'HIGH', date: { gte: now } } }),
      this.prisma.scheduleEvent.count({ where: { priority: 'MEDIUM', date: { gte: now } } }),
    ]);

    return {
      totalEvents,
      upcomingTours: tours,
      urgentCount: urgentEvents,
      highPriorityCount: highPriorityEvents,
      mediumPriorityCount: mediumPriorityEvents,
    };
  }

  async getDailyEvents(dateStr: string) {
    const date = new Date(dateStr);
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const events = await this.prisma.scheduleEvent.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      orderBy: { date: 'asc' },
      include: {
        property: { select: { name: true } },
        unit: { select: { name: true } },
        tenant: { select: { username: true } },
      },
    });

    return this.formatEvents(events);
  }

  async getWeeklyEvents(startDateStr: string) {
    const startDate = new Date(startDateStr);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const events = await this.prisma.scheduleEvent.findMany({
      where: {
        date: {
          gte: startDate,
          lt: endDate,
        },
      },
      orderBy: { date: 'asc' },
      include: {
        property: { select: { name: true } },
        unit: { select: { name: true } },
        tenant: { select: { username: true } },
      },
    });

    return this.formatEvents(events);
  }

  async getMonthlyEvents(month: number, year: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const events = await this.prisma.scheduleEvent.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: { date: 'asc' },
      include: {
        property: { select: { name: true } },
        unit: { select: { name: true } },
        tenant: { select: { username: true } },
      },
    });

    return this.formatEvents(events);
  }

  async getLeaseExpirations() {
    const now = new Date();
    const threeMonthsLater = new Date();
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);

    const expiringLeases = await this.prisma.lease.findMany({
      where: {
        endDate: {
          gte: now,
          lte: threeMonthsLater,
        },
        status: 'ACTIVE',
      },
      include: {
        tenant: { select: { username: true } },
        unit: {
          include: {
            property: { select: { name: true } },
          },
        },
      },
    });

    return expiringLeases.map(lease => ({
      id: lease.id,
      type: 'LEASE_EXPIRATION',
      title: `Lease Expiration - ${lease.unit.property.name}`,
      date: lease.endDate,
      priority: 'HIGH',
      propertyName: lease.unit.property.name,
      unitName: lease.unit.name,
      tenantName: lease.tenant.username,
    }));
  }

  async getTodayEvents() {
    const today = new Date();
    return this.getDailyEvents(today.toISOString().split('T')[0]);
  }

  async getThisWeekEvents() {
    const today = new Date();
    return this.getWeeklyEvents(today.toISOString().split('T')[0]);
  }

  async getThisMonthEvents() {
    const today = new Date();
    return this.getMonthlyEvents(today.getMonth() + 1, today.getFullYear());
  }

  private formatEvents(events: any[]) {
    return events.map(event => ({
      id: event.id,
      type: event.type,
      title: event.title,
      date: event.date,
      time: event.date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      priority: event.priority,
      propertyName: event.property?.name,
      unitName: event.unit?.name,
      tenantName: event.tenant?.username,
      status: event.status,
    }));
  }
}
