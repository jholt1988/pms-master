// Story 14: Portfolio Analytics and Reporting Dashboard
// GET /analytics/portfolio, GET /analytics/property/:id, GET /analytics/kpis
// Dependencies: 1, 2, 3, 4, 5, 6, 7, 8 | Estimate: Large

import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class PortfolioAnalyticsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('portfolio')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getPortfolioAnalytics() {
    // Property metrics
    const [
      totalProperties,
      totalUnits,
      vacantUnits,
      occupiedUnits,
      maintenanceOpen,
      delinquencies,
    ] = await Promise.all([
      this.prisma.property.count(),
      this.prisma.unit.count(),
      this.prisma.unit.count({ where: { status: 'VACANT' } }),
      this.prisma.unit.count({ where: { status: { in: ['LEASED', 'OCCUPIED'] } } }),
      this.prisma.maintenanceRequest.count({ where: { status: { in: ['SUBMITTED', 'IN_PROGRESS'] } } }),
      this.prisma.payment.count({ where: { status: { not: 'PAID' }, paymentDate: { lt: new Date() } } }),
    ]);

    // Revenue metrics
    const thisMonth = new Date();
    thisMonth.setDate(1);
    thisMonth.setHours(0, 0, 0, 0);

    const revenueCollected = await this.prisma.payment.aggregate({
      where: {
        status: 'PAID',
        paymentDate: { gte: thisMonth },
      },
      _sum: { amount: true },
    });

    const revenueDue = await this.prisma.payment.aggregate({
      where: {
        paymentDate: { gte: thisMonth },
      },
      _sum: { amount: true },
    });

    // Occupancy rate
    const occupancyRate = totalUnits > 0 ? (occupiedUnits / totalUnits) * 100 : 0;

    // Collection rate
    const collectionRate = revenueDue._sum.amount
      ? ((revenueCollected._sum.amount || 0) / revenueDue._sum.amount) * 100
      : 100;

    return {
      properties: {
        total: totalUnits,
        occupied: occupiedUnits,
        vacant: vacantUnits,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
      },
      revenue: {
        collected: revenueCollected._sum.amount || 0,
        due: revenueDue._sum.amount || 0,
        pending: delinquencies,
        collectionRate: Math.round(collectionRate * 10) / 10,
      },
      operations: {
        maintenanceOpen,
        delinquencies,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('property/:id')
  async getPropertyAnalytics(@Param('id') id: string) {
    const propertyId = parseInt(id, 10);

    const [property, units, leases, payments, maintenance] = await Promise.all([
      this.prisma.property.findUnique({ where: { id: propertyId } }),
      this.prisma.unit.findMany({ where: { propertyId } }),
      this.prisma.lease.findMany({
        where: { unit: { propertyId }, status: 'ACTIVE' },
        include: { tenant: true },
      }),
      this.prisma.payment.findMany({
        where: {
          lease: { unit: { propertyId } },
        },
        orderBy: { paymentDate: 'desc' },
        take: 30,
      }),
      this.prisma.maintenanceRequest.findMany({
        where: { propertyId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
    ]);

    const occupiedCount = units.filter(u => u.status === 'LEASED' || u.status === 'OCCUPIED').length;
    const revenueCollected = payments
      .filter(p => p.status === 'PAID')
      .reduce((sum, p) => sum + p.amount, 0);
    const revenueDue = payments.reduce((sum, p) => sum + p.amount, 0);

    return {
      property: {
        id: property?.id,
        name: property?.name,
        address: property?.address,
        unitCount: units.length,
        occupiedCount,
        occupancyRate: units.length > 0 ? Math.round((occupiedCount / units.length) * 100 * 10) / 10 : 0,
      },
      tenants: leases.map(l => ({
        id: l.id,
        tenantName: l.tenant?.fullName,
        unitNumber: l.unit?.unitNumber,
        rentAmount: l.monthlyRent,
      })),
      revenue: {
        collected: revenueCollected,
        due: revenueDue,
        collectionRate: revenueDue > 0 ? Math.round((revenueCollected / revenueDue) * 100 * 10) / 10 : 100,
      },
      recentPayments: payments.slice(0, 10).map(p => ({
        id: p.id,
        amount: p.amount,
        status: p.status,
        date: p.paymentDate,
      })),
      recentMaintenance: maintenance.map(m => ({
        id: m.id,
        title: m.title,
        status: m.status,
        priority: m.priority,
      })),
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('kpis')
  async getKPIs() {
    const now = new Date();
    const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalUnits,
      occupiedUnits,
      activeLeases,
      pendingApplications,
      openMaintenance,
      overduePayments,
    ] = await Promise.all([
      this.prisma.unit.count(),
      this.prisma.unit.count({ where: { status: { in: ['LEASED', 'OCCUPIED'] } } }),
      this.prisma.lease.count({ where: { status: 'ACTIVE' } }),
      this.prisma.rentalApplication.count({ where: { status: 'PENDING_REVIEW' } }),
      this.prisma.maintenanceRequest.count({ where: { status: { in: ['SUBMITTED', 'IN_PROGRESS'] } } }),
      this.prisma.payment.count({
        where: {
          status: { not: 'PAID' },
          paymentDate: { lt: last30Days },
        },
      }),
    ]);

    const totalRevenue = await this.prisma.payment.aggregate({
      where: { status: 'PAID', paymentDate: { gte: last30Days } },
      _sum: { amount: true },
    });

    return {
      occupancyRate: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100 * 10) / 10 : 0,
      activeLeases,
      pendingApplications,
      openMaintenance,
      overduePayments,
      revenue30Days: totalRevenue._sum.amount || 0,
      generatedAt: now.toISOString(),
    };
  }

  @Get('trends')
  async getTrends(@Query('days') days: string = '30') {
    const daysNum = parseInt(days, 10) || 30;
    const startDate = new Date(new Date().getTime() - daysNum * 24 * 60 * 60 * 1000);

    // Payment trends
    const paymentsByDate = await this.prisma.payment.findMany({
      where: {
        status: 'PAID',
        paymentDate: { gte: startDate },
      },
      select: {
        paymentDate: true,
        amount: true,
      },
    });

    // Group by date
    const paymentMap = new Map<string, number>();
    for (const p of paymentsByDate) {
      const dateKey = p.paymentDate.toISOString().split('T')[0];
      paymentMap.set(dateKey, (paymentMap.get(dateKey) || 0) + p.amount);
    }

    const trendData = Array.from(paymentMap.entries())
      .map(([date, amount]) => ({ date, revenue: amount }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return {
      period: `${daysNum} days`,
      data: trendData,
      total: trendData.reduce((sum, d) => sum + d.revenue, 0),
    };
  }
}