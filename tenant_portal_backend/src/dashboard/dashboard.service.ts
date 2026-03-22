import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadApplicationStatus, MaintenancePriority, Status } from '@prisma/client';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private prisma: PrismaService) {}

  async getPropertyLocations(orgId?: string) {
    const properties = await this.prisma.property.findMany({
      where: orgId ? { organizationId: orgId } : undefined,
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        latitude: true,
        longitude: true,
        _count: {
          select: {
            units: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const mapped = properties
      .filter((property) => property.latitude !== null && property.longitude !== null)
      .map((property) => ({
        id: property.id,
        name: property.name,
        address: property.address,
        city: property.city,
        state: property.state,
        latitude: property.latitude,
        longitude: property.longitude,
        unitCount: property._count.units,
      }));

    const missing = properties
      .filter((property) => property.latitude === null || property.longitude === null)
      .map((property) => ({
        id: property.id,
        name: property.name,
        address: property.address,
        city: property.city,
        state: property.state,
        unitCount: property._count.units,
      }));

    return {
      totalProperties: properties.length,
      mappedProperties: mapped.length,
      missingCoordinates: properties.length - mapped.length,
      properties: mapped,
      missingProperties: missing,
    };
  }

  async geocodeMissingPropertyLocations(orgId?: string, propertyIds?: string[]) {
    const scopedPropertyIds = propertyIds?.filter(Boolean) ?? [];

    const candidates = await this.prisma.property.findMany({
      where: {
        ...(orgId ? { organizationId: orgId } : {}),
        ...(scopedPropertyIds.length ? { id: { in: scopedPropertyIds } } : {}),
        OR: [{ latitude: null }, { longitude: null }],
      },
      select: {
        id: true,
        name: true,
        address: true,
        city: true,
        state: true,
        zipCode: true,
        country: true,
      },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });

    let updatedCount = 0;
    const failed: Array<{ id: string; name: string; reason: string }> = [];

    for (const property of candidates) {
      const query = [property.address, property.city, property.state, property.zipCode, property.country]
        .filter(Boolean)
        .join(', ')
        .trim();

      if (!query) {
        failed.push({ id: property.id, name: property.name, reason: 'No address data to geocode' });
        continue;
      }

      try {
        const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`;
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'PMS-Dashboard-Geocoder/1.0',
            Accept: 'application/json',
          },
        });

        if (!response.ok) {
          failed.push({ id: property.id, name: property.name, reason: `Geocode HTTP ${response.status}` });
          await this.delay(1100);
          continue;
        }

        const body = (await response.json()) as Array<{ lat: string; lon: string }>;
        const top = body?.[0];

        if (!top?.lat || !top?.lon) {
          failed.push({ id: property.id, name: property.name, reason: 'No geocode match' });
          await this.delay(1100);
          continue;
        }

        const latitude = Number(top.lat);
        const longitude = Number(top.lon);

        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
          failed.push({ id: property.id, name: property.name, reason: 'Invalid coordinates from geocoder' });
          await this.delay(1100);
          continue;
        }

        await this.prisma.property.update({
          where: { id: property.id },
          data: { latitude, longitude },
        });
        updatedCount += 1;
      } catch (error) {
        this.logger.warn(`Geocode failed for property ${property.id}: ${error instanceof Error ? error.message : String(error)}`);
        failed.push({ id: property.id, name: property.name, reason: 'Request failed' });
      }

      await this.delay(1100);
    }

    return {
      attempted: candidates.length,
      updated: updatedCount,
      failed,
    };
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getPropertyManagerDashboardMetrics(orgId?: string) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const orgPropertyWhere = orgId ? { organizationId: orgId } : undefined;
    const orgUnitWhere = orgId ? { property: { organizationId: orgId } } : undefined;
    const orgLeaseWhere = orgId ? { unit: { property: { organizationId: orgId } } } : undefined;
    const orgPaymentWhere = orgId ? { lease: { unit: { property: { organizationId: orgId } } } } : undefined;
    const orgMaintenanceWhere = orgId ? { property: { organizationId: orgId } } : undefined;
    const orgLeadAppWhere = orgId ? { property: { organizationId: orgId } } : undefined;

const [
  totalProperties,
  totalUnits,
  occupiedUnits,
  totalTenants,
  maintenanceRequests,
  applications,
  paymentsThisMonth,
  pendingInvoices,
  recentMaintenance,
  recentApplications,
  recentPayments,
  recentLeaks,
] = await Promise.all([
  this.prisma.property.count({ where: orgPropertyWhere }),
  this.prisma.unit.count({ where: orgUnitWhere }),
  this.prisma.unit.count({ where: { lease: { isNot: null }, ...(orgUnitWhere ?? {}) } }),
  this.prisma.user.count({
    where: {
      role: 'TENANT',
      ...(orgId ? { lease: { is: { unit: { property: { organizationId: orgId } } } } } : {}),
    },
  }),
  this.prisma.maintenanceRequest.count({ where: orgMaintenanceWhere }),
  this.prisma.leadApplication.count({ where: orgLeadAppWhere }),
  this.prisma.payment.count({
    where: {
      paymentDate: {
        gte: startOfMonth,
        lte: now,
      },
      ...(orgPaymentWhere ?? {}),
    },
  }),
  this.prisma.invoice.aggregate({
    _sum: { amount: true },
    where: {
      status: 'PENDING',
      dueDate: { lt: now },
      ...(orgLeaseWhere ? { lease: orgLeaseWhere } : {}),
    },
  }),
  this.prisma.maintenanceRequest.findMany({
    where: orgMaintenanceWhere ?? undefined,
    orderBy: { createdAt: 'desc' },
    take: 3,
  }),
  this.prisma.leadApplication.findMany({
    where: orgLeadAppWhere ?? undefined,
    orderBy: { submittedAt: 'desc' },
    take: 3,
    include: {
      lead: true,
    },
  }),
  this.prisma.payment.findMany({
    where: orgPaymentWhere ?? undefined,
    orderBy: { paymentDate: 'desc' },
    take: 3,
  }),
  this.prisma.lease.findMany({
    where: orgLeaseWhere ?? undefined,
    orderBy: { updatedAt: 'desc' },
    take: 2,
  }),
]);

    const monthlyRevenue = paymentsThisMonth
      ? paymentsThisMonth * 1 // placeholder: could sum actual amounts
      : 0;

    const collectedThisMonth = monthlyRevenue;
    const outstanding = pendingInvoices._sum.amount || 0;

    const pendingStatuses = [
      LeadApplicationStatus.SUBMITTED,
      LeadApplicationStatus.PENDING,
    ];
    const approvedStatuses = [
      LeadApplicationStatus.APPROVED,
      LeadApplicationStatus.CONDITIONALLY_APPROVED,
    ];
    const rejectedStatuses = [
      LeadApplicationStatus.DENIED,
      LeadApplicationStatus.REJECTED,
    ];

    const [pendingApplications, approvedApplications, rejectedApplications, legalAcceptedApplications, legalMissingApplications] = await Promise.all([
      this.prisma.leadApplication.count({
        where: { status: { in: pendingStatuses }, ...(orgLeadAppWhere ?? {}) },
      }),
      this.prisma.leadApplication.count({
        where: { status: { in: approvedStatuses }, ...(orgLeadAppWhere ?? {}) },
      }),
      this.prisma.leadApplication.count({
        where: { status: { in: rejectedStatuses }, ...(orgLeadAppWhere ?? {}) },
      }),
      this.prisma.leadApplication.count({
        where: {
          ...(orgLeadAppWhere ?? {}),
          termsAcceptedAt: { not: null },
          privacyAcceptedAt: { not: null },
        },
      }),
      this.prisma.leadApplication.count({
        where: {
          ...(orgLeadAppWhere ?? {}),
          OR: [{ termsAcceptedAt: null }, { privacyAcceptedAt: null }],
        },
      }),
    ]);

    const recentActivity = [
      ...recentMaintenance.map((request) => ({
        id: request.id,
        type: 'maintenance',
        title: request.title,
        date: request.createdAt.toISOString(),
        priority: request.priority === MaintenancePriority.EMERGENCY ? 'high' : 'medium',
      })),
      ...recentApplications.map((app) => ({
        id: app.id,
        type: 'application',
        title: `Application: ${app.lead?.name ?? app.id}`,
        date: app.submittedAt.toISOString(),
        priority: 'medium',
      })),
      ...recentPayments.map((payment) => ({
        id: payment.id,
        type: 'payment',
        title: `Payment: ${payment.userId}`,
        date: payment.paymentDate.toISOString(),
        priority: 'low',
      })),
      ...recentLeaks.map((lease) => ({
        id: lease.id,
        type: 'lease',
        title: `Lease: ${lease.id}`,
        date: lease.updatedAt.toISOString(),
        priority: 'medium',
      })),
    ].slice(0, 5);

    return {
      occupancy: {
        total: totalUnits,
        occupied: occupiedUnits,
        vacant: totalUnits - occupiedUnits,
        percentage: totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0,
      },
      financials: {
        monthlyRevenue,
        collectedThisMonth,
        outstanding,
      },
      maintenance: {
        total: maintenanceRequests,
        pending: await this.prisma.maintenanceRequest.count({
          where: {
            status: Status.PENDING,
            ...(orgMaintenanceWhere ?? {}),
          },
        }),
        inProgress: await this.prisma.maintenanceRequest.count({
          where: {
            status: Status.IN_PROGRESS,
            ...(orgMaintenanceWhere ?? {}),
          },
        }),
        overdue: await this.prisma.maintenanceRequest.count({
          where: {
            createdAt: { lt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) },
            ...(orgMaintenanceWhere ?? {}),
          },
        }),
      },
      applications: {
        total: applications,
        pending: pendingApplications,
        approved: approvedApplications,
        rejected: rejectedApplications,
        legalAccepted: legalAcceptedApplications,
        legalMissing: legalMissingApplications,
      },
      recentActivity,
    };
  }

  async getTenantDashboard(userId: string) {
    const [leases, maintenanceRequests, recentInspections] = await Promise.all([
      this.prisma.lease.findMany({
        where: { tenantId: userId },
        include: {
          unit: {
            include: {
              property: true,
            },
          },
          payments: true,
        },
      }),
      this.prisma.maintenanceRequest.findMany({
        where: { authorId: userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.unitInspection.findMany({
        where: { tenantId: userId },
        orderBy: { scheduledDate: 'desc' },
        take: 3,
      }),
    ]);

    return {
      leases,
      maintenanceRequests,
      recentInspections,
    };
  }
}
