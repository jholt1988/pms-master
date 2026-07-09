// Story 21: Reporting and Data Export System
// GET /reports/:type, POST /reports/generate, GET /reports/download/:id
// Dependencies: 1-20 | Estimate: Medium

import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsService } from './analytics.service';

@Controller('reporting')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class ReportingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly analyticsService: AnalyticsService,
  ) {}

  @Get('rent-roll')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getRentRoll(@Query('propertyId') propertyId?: string) {
    const where: any = propertyId ? { propertyId } : {};

    const units = await this.prisma.unit.findMany({
      where,
      include: { property: true, lease: { include: { tenant: true } } } as any,
    });

    const data = units.map(unit => {
      const lease = (unit as any).lease;
      return {
        property: (unit as any).property?.name,
        unit: unit.name,
        unitNumber: unit.unitNumber,
        bedrooms: unit.bedrooms,
        bathrooms: unit.bathrooms,
        sqft: unit.squareFeet,
        tenant: lease?.tenant?.username || 'Vacant',
        leaseEnd: lease?.endDate,
        monthlyRent: lease?.rentAmount || 0,
        status: unit.status,
      };
    });

    return { type: 'rent-roll', data, generatedAt: new Date().toISOString() };
  }

  @Get('delinquency-report')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getDelinquencyReport(@Query('days') days?: string) {
    const daysNum = parseInt(days || '30', 10);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - daysNum);

    const overdue = await this.prisma.payment.findMany({
      where: {
        status: { not: 'COMPLETED' },
        paymentDate: { lt: cutoff },
      },
      include: {
        lease: { include: { tenant: true, unit: { include: { property: true } } } },
      },
      orderBy: { paymentDate: 'asc' },
    });

    const summary = {
      totalOverdue: overdue.length,
      totalAmount: overdue.reduce((sum, p) => sum + p.amount, 0),
      byDays: {
        '1-30': overdue.filter(p => {
          const days = Math.floor((Date.now() - new Date(p.paymentDate).getTime()) / (1000 * 60 * 60 * 24));
          return days <= 30;
        }).length,
        '31-60': overdue.filter(p => {
          const days = Math.floor((Date.now() - new Date(p.paymentDate).getTime()) / (1000 * 60 * 60 * 24));
          return days > 30 && days <= 60;
        }).length,
        '60+': overdue.filter(p => {
          const days = Math.floor((Date.now() - new Date(p.paymentDate).getTime()) / (1000 * 60 * 60 * 24));
          return days > 60;
        }).length,
      },
    };

    return { type: 'delinquency', summary, data: overdue, generatedAt: new Date().toISOString() };
  }

  @Get('maintenance-summary')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getMaintenanceSummary(@Query('propertyId') propertyId?: string) {
    const where: any = propertyId ? { propertyId } : {};

    const requests = await this.prisma.maintenanceRequest.findMany({ where });

    const byStatus = {
      submitted: requests.filter(r => r.status === 'PENDING').length,
      inProgress: requests.filter(r => r.status === 'IN_PROGRESS').length,
      completed: requests.filter(r => r.status === 'COMPLETED').length,
      cancelled: requests.filter(r => r.status === 'COMPLETED').length,
    };

    const byPriority = {
      urgent: requests.filter(r => r.priority === 'EMERGENCY').length,
      high: requests.filter(r => r.priority === 'HIGH').length,
      medium: requests.filter(r => r.priority === 'MEDIUM').length,
      low: requests.filter(r => r.priority === 'LOW').length,
    };

    const avgResolutionDays = 0; // Calculate from completed requests

    return { type: 'maintenance-summary', byStatus, byPriority, avgResolutionDays, generatedAt: new Date().toISOString() };
  }

  @Get('occupancy-report')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getOccupancyReport(@Query('propertyId') propertyId?: string) {
    const where: any = propertyId ? { propertyId } : {};

    const units = await this.prisma.unit.findMany({ where, include: { property: true } });

    const occupied = units.filter(u => u.status === 'LEASED' || u.status === 'OCCUPIED').length;
    const vacant = units.filter(u => u.status === 'VACANT').length;
    const total = units.length;

    const byProperty = await this.prisma.property.findMany({
      where,
      include: { units: true },
    }).then(props => props.map(p => ({
      property: p.name,
      total: p.units.length,
      occupied: p.units.filter(u => u.status === 'LEASED' || u.status === 'OCCUPIED').length,
      vacant: p.units.filter(u => u.status === 'VACANT').length,
      occupancyRate: p.units.length > 0 ? Math.round((p.units.filter(u => u.status === 'LEASED' || u.status === 'OCCUPIED').length / p.units.length) * 100) : 0,
    })));

    return {
      type: 'occupancy',
      summary: { total, occupied, vacant, occupancyRate: total > 0 ? Math.round((occupied / total) * 100) : 0 },
      byProperty,
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('delinquency-analytics')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getDelinquencyAnalytics(@Query('days') days?: string) {
    return this.getDelinquencyReport(days);
  }

  @Get('profit-loss')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getProfitLoss(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    return this.getFinancialSummary(startDate, endDate, propertyId);
  }

  @Get('vacancy-rate')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getVacancyRate(@Query('propertyId') propertyId?: string) {
    const occupancy = await this.getOccupancyReport(propertyId);
    return {
      ...occupancy,
      type: 'vacancy-rate',
      vacancyRate: 100 - occupancy.summary.occupancyRate,
    };
  }

  @Get('maintenance-analytics')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getMaintenanceAnalytics(@Query('propertyId') propertyId?: string) {
    return this.getMaintenanceSummary(propertyId);
  }

  @Get('manual-payments-summary')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getManualPaymentsSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    const payments = await this.prisma.payment.findMany({
      where: { paymentDate: { gte: start, lte: end } },
    });
    return {
      type: 'manual-payments-summary',
      count: payments.length,
      total: payments.reduce((sum, payment) => sum + payment.amount, 0),
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('manual-charges-summary')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async getManualChargesSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    const charges = await this.prisma.manualCharge.findMany({
      where: { chargeDate: { gte: start, lte: end } },
    });
    return {
      type: 'manual-charges-summary',
      count: charges.length,
      totalCents: charges.reduce((sum, charge) => sum + charge.amountCents, 0),
      generatedAt: new Date().toISOString(),
    };
  }

  @Get('payment-history')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getPaymentHistory(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();
    return this.prisma.payment.findMany({
      where: {
        paymentDate: { gte: start, lte: end },
        ...(propertyId ? { lease: { unit: { propertyId } } } : {}),
      },
      include: { lease: { include: { tenant: true, unit: { include: { property: true } } } } },
      orderBy: { paymentDate: 'desc' },
    });
  }

  @Get('analytics/heatmap')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getReportHeatmap(@OrgId() orgId?: string) {
    return this.analyticsService.getPortfolioHealthHeatmap(orgId);
  }

  @Get('accounting-sync-status')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getAccountingSyncStatus(@OrgId() orgId?: string) {
    // Reports the org's accounting (QuickBooks) connection state. Mirrors
    // QuickBooksMinimalService.getConnectionStatus without cross-module coupling.
    const connection = orgId
      ? await this.prisma.quickBooksConnection.findFirst({
          where: { organizationId: orgId, isActive: true },
        })
      : null;

    if (!connection) {
      return { connected: false };
    }

    return {
      connected: true,
      companyName: connection.companyId,
      lastSync: connection.updatedAt,
      expiresAt: connection.tokenExpiresAt,
    };
  }

  @Get('analytics/opex-anomalies')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getOpexAnomalies(@OrgId() orgId?: string) {
    return this.analyticsService.getOpexAnomalies(orgId);
  }

  @Get('analytics/capex')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getCapexAnalytics(
    @Query('propertyId') propertyId: string,
    @Query('upgradeCost') upgradeCost?: string,
    @Query('rentBump') rentBump?: string,
    @OrgId() orgId?: string,
  ) {
    if (!propertyId) return { propertyId: null, simulatedTrials: 0, generatedAt: new Date().toISOString() };
    return this.analyticsService.simulateCapitalExpenditure({
      propertyId,
      orgId,
      upgradeCost: Number(upgradeCost ?? 0),
      expectedRentIncreaseAmount: Number(rentBump ?? 0),
    });
  }

  @Get('financial-summary')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async getFinancialSummary(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('propertyId') propertyId?: string,
  ) {
    const start = startDate ? new Date(startDate) : new Date(new Date().setDate(1));
    const end = endDate ? new Date(endDate) : new Date();

    const where: any = { paymentDate: { gte: start, lte: end } };
    if (propertyId) where.lease = { unit: { propertyId } };

    const payments = await this.prisma.payment.findMany({ where });
    const collected = payments.filter(p => p.status === 'COMPLETED').reduce((sum, p) => sum + p.amount, 0);
    const pending = payments.filter(p => p.status !== 'COMPLETED').reduce((sum, p) => sum + p.amount, 0);

    const charges = await this.prisma.manualCharge.findMany({
      where: { chargeDate: { gte: start, lte: end } },
    });
    const totalCharges = charges.reduce((sum, c) => sum + c.amountCents, 0) / 100;

    return {
      type: 'financial-summary',
      period: { start: start.toISOString(), end: end.toISOString() },
      payments: { collected, pending, total: collected + pending },
      charges: { total: totalCharges },
      netRevenue: collected - totalCharges,
      generatedAt: new Date().toISOString(),
    };
  }
}
