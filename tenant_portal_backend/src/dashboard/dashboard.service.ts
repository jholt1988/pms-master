import { Injectable, Logger } from '@nestjs/common';
// import axios from 'axios';  // removed unused import
import { PrismaService } from '../prisma/prisma.service';
import { LeadApplicationStatus, MaintenancePriority, Status } from '@prisma/client';
import { AuditLogService } from '../shared/audit-log.service';
import { AppCacheService } from '../cache/cache.service';
import { toCents } from '../utils/money';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(
    private prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
    private readonly cacheService: AppCacheService,
  ) {}

  async getActionIntents(orgId?: string) {
    try {
      // Phase 2: Fetch actionable intents from the database instead of mock/workflow mock.
      const actionIntents = await (this.prisma as any).actionIntent.findMany({
        where: {
          ...(orgId ? { organizationId: orgId } : {}),
          status: 'PENDING',
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });

      if (actionIntents.length > 0) {
        return {
          intents: actionIntents.map((i: any) => ({
            id: i.id,
            type: i.type,
            description: i.description,
            status: i.status,
            priority: i.priority,
            createdAt: i.createdAt,
            raw: i.metadata,
          })),
          source: 'database'
        };
      }
    } catch(err) {
      this.logger.warn('Failed to fetch action intents from db, falling back to mock');
    }

    return {
      intents: [
        {
          id: 'mock-1',
          type: 'RISK_MITIGATION',
          description: 'HVAC unit #3 at 123 Main St showing signs of failure.',
          status: 'PENDING',
          priority: 'HIGH',
          createdAt: new Date().toISOString(),
        }
      ],
      source: 'mock',
    };
  }

  async resolveActionIntent(id: string, action: string, orgId?: string) {
    // Phase 2: Handle resolution
    const intent = await (this.prisma as any).actionIntent.findUnique({
      where: { id }
    });

    if (!intent) throw new Error('Action Intent not found');
    if (orgId && intent.organizationId && intent.organizationId !== orgId) throw new Error('Unauthorized');

    let newStatus = action.toUpperCase();
    if (!['RESOLVED', 'DISMISSED', 'EXECUTED'].includes(newStatus)) {
      newStatus = 'RESOLVED';
    }

    // In a real system, "EXECUTED" might trigger actual background logic
    // For QB anomalies, if FORCE_SYNC, we could drop the entry back onto the bull queue
    
    // Phase 3: AI Document Logic
    if (intent.type === 'AI_ABSTRACTION_REVIEW' && newStatus === 'RESOLVED') {
      try {
        const metadata = intent.metadata as any;
        const leaseId = metadata?.leaseId;
        const extractedFields = metadata?.extractedFields;
        if (leaseId && extractedFields) {
          // Commit to ledger
          await this.prisma.lease.update({
            where: { id: leaseId },
            data: {
              // rentAmount removed
              // Dual-write integer cents (guarded: skip when the extracted value isn't a finite number).
              rentAmountCents: Number.isFinite(Number(extractedFields.monthlyRent))
                ? toCents(Number(extractedFields.monthlyRent))
                : undefined,
              startDate: new Date(extractedFields.startDate),
              endDate: new Date(extractedFields.endDate),
              // We could store the rest as JSON or map to actual schema
            }
          });
          this.logger.log(`Lease ${leaseId} automatically updated from AI abstracted Document`);
        }
      } catch (err) {
        this.logger.error(`Failed to commit AI abstraction to ledger: ${err}`);
      }
    }

    // Phase 4: Dynamic Yield Optimization Logic
    if (intent.type === 'RENEWAL_PRICING_GENERATED' && newStatus === 'RESOLVED') {
      try {
        const metadata = intent.metadata as any;
        const leaseId = metadata?.leaseId;
        const recommendedRent = metadata?.recommendedRent;
        if (leaseId && recommendedRent) {
          // Commit to ledger - set the lease to RENEWAL_PENDING and update the rent amount/offer
          await this.prisma.lease.update({
            where: { id: leaseId },
            data: {
              status: 'RENEWAL_PENDING',
              // rentAmount removed // Updating the rent directly to represent the accepted offer for demo
              // Dual-write integer cents (guarded: skip when recommendedRent isn't a finite number).
              rentAmountCents: Number.isFinite(Number(recommendedRent))
                ? toCents(Number(recommendedRent))
                : undefined,
            }
          });
          this.logger.log(`Lease ${leaseId} dynamically adjusted to Yield Price of ${recommendedRent}`);
        }
      } catch (err) {
        this.logger.error(`Failed to commit Yield pricing to ledger: ${err}`);
      }
    }
    
    await (this.prisma as any).actionIntent.update({
      where: { id },
      data: {
        status: newStatus,
        resolvedAt: new Date()
      }
    });

    return { success: true, status: newStatus };
  }

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
        const reason = 'No address data to geocode';
        failed.push({ id: property.id, name: property.name, reason });
        await this.logGeocodeAudit({
          propertyId: property.id,
          organizationId: orgId,
          status: 'FAILED',
          reason,
        });
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
          const reason = `Geocode HTTP ${response.status}`;
          failed.push({ id: property.id, name: property.name, reason });
          await this.logGeocodeAudit({
            propertyId: property.id,
            organizationId: orgId,
            query,
            status: 'FAILED',
            reason,
          });
          await this.delay(1100);
          continue;
        }

        const body = (await response.json()) as Array<{ lat: string; lon: string }>;
        const top = body?.[0];

        if (!top?.lat || !top?.lon) {
          const reason = 'No geocode match';
          failed.push({ id: property.id, name: property.name, reason });
          await this.logGeocodeAudit({
            propertyId: property.id,
            organizationId: orgId,
            query,
            status: 'FAILED',
            reason,
          });
          await this.delay(1100);
          continue;
        }

        const latitude = Number(top.lat);
        const longitude = Number(top.lon);

        if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
          const reason = 'Invalid coordinates from geocoder';
          failed.push({ id: property.id, name: property.name, reason });
          await this.logGeocodeAudit({
            propertyId: property.id,
            organizationId: orgId,
            query,
            status: 'FAILED',
            reason,
          });
          await this.delay(1100);
          continue;
        }

        await this.prisma.property.update({
          where: { id: property.id },
          data: { latitude, longitude },
        });
        await this.logGeocodeAudit({
          propertyId: property.id,
          organizationId: orgId,
          query,
          status: 'UPDATED',
          latitude,
          longitude,
        });
        updatedCount += 1;
      } catch (error) {
        const reason = 'Request failed';
        this.logger.warn(`Geocode failed for property ${property.id}: ${error instanceof Error ? error.message : String(error)}`);
        failed.push({ id: property.id, name: property.name, reason });
        await this.logGeocodeAudit({
          propertyId: property.id,
          organizationId: orgId,
          query,
          status: 'FAILED',
          reason,
        });
      }

      await this.delay(1100);
    }

    return {
      attempted: candidates.length,
      updated: updatedCount,
      failed,
    };
  }

  async getRecentGeocodeAudit(orgId?: string) {
    const rows = await this.prisma.$queryRawUnsafe<Array<{
      id: number;
      propertyId: string;
      organizationId: string | null;
      query: string | null;
      status: string;
      reason: string | null;
      latitude: number | null;
      longitude: number | null;
      createdAt: Date;
      propertyName: string | null;
    }>>(
      `SELECT a."id", a."propertyId", a."organizationId", a."query", a."status", a."reason", a."latitude", a."longitude", a."createdAt", p."name" as "propertyName"
       FROM "PropertyGeocodeAudit" a
       LEFT JOIN "Property" p ON p."id" = a."propertyId"
       ${orgId ? 'WHERE a."organizationId" = $1' : ''}
       ORDER BY a."createdAt" DESC
       LIMIT 50`,
      ...(orgId ? [orgId] : []),
    );

    return rows;
  }

  private async logGeocodeAudit(params: {
    propertyId: string;
    organizationId?: string;
    query?: string;
    status: 'UPDATED' | 'FAILED';
    reason?: string;
    latitude?: number;
    longitude?: number;
  }) {
    await this.prisma.$executeRawUnsafe(
      `INSERT INTO "PropertyGeocodeAudit" ("propertyId", "organizationId", "query", "status", "reason", "latitude", "longitude")
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      params.propertyId,
      params.organizationId ?? null,
      params.query ?? null,
      params.status,
      params.reason ?? null,
      params.latitude ?? null,
      params.longitude ?? null,
    );
  }

  private delay(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async getPropertyManagerDashboardMetrics(orgId?: string) {
    const cacheKey = `dashboard:pm:${orgId || 'global'}`;
    return this.cacheService.getOrSet(cacheKey, 30, () =>
      this._computeDashboardMetrics(orgId),
    );
  }

  private async _computeDashboardMetrics(orgId?: string) {
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
  this.prisma.unit.count({ where: { lease: { some: {} }, ...(orgUnitWhere ?? {}) } }),
  this.prisma.user.count({
    where: {
      role: 'TENANT',
      ...(orgId ? { lease: { some: { unit: { property: { organizationId: orgId } } } } } : {}),
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
    _sum: { amountCents: true },
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
    const outstanding = (pendingInvoices._sum.amountCents || 0) / 100 || 0;

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

  async getOperationalCalendar(orgId?: string, options?: { days?: number; actorId?: string }) {
    const days = Math.min(Math.max(options?.days ?? 30, 1), 120);
    const start = new Date();
    const end = new Date();
    end.setDate(end.getDate() + days);

    const [scheduledEvents, inspections, expiringLeases, overdueInvoices] = await Promise.all([
      this.prisma.scheduleEvent.findMany({
        where: {
          date: { gte: start, lte: end },
          ...(orgId ? { property: { organizationId: orgId } } : {}),
        },
        include: {
          property: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true } },
          tenant: { select: { id: true, email: true } },
        },
        orderBy: { date: 'asc' },
        take: 200,
      }),
      this.prisma.unitInspection.findMany({
        where: {
          scheduledDate: { gte: start, lte: end },
          ...(orgId ? { property: { organizationId: orgId } } : {}),
        },
        include: {
          property: { select: { id: true, name: true } },
          unit: { select: { id: true, name: true } },
          tenant: { select: { id: true, email: true } },
        },
        orderBy: { scheduledDate: 'asc' },
        take: 100,
      }),
      this.prisma.lease.findMany({
        where: {
          endDate: { gte: start, lte: end },
          status: { in: ['ACTIVE', 'RENEWAL_PENDING', 'NOTICE_GIVEN'] },
          ...(orgId ? { unit: { property: { organizationId: orgId } } } : {}),
        },
        include: {
          tenant: { select: { id: true, email: true } },
          unit: { include: { property: { select: { id: true, name: true } } } },
        },
        orderBy: { endDate: 'asc' },
        take: 100,
      }),
      this.prisma.invoice.findMany({
        where: {
          dueDate: { lt: start },
          status: { not: 'PAID' },
          ...(orgId ? { lease: { unit: { property: { organizationId: orgId } } } } : {}),
        },
        include: {
          lease: {
            include: {
              tenant: { select: { id: true, email: true } },
              unit: { include: { property: { select: { id: true, name: true } } } },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 100,
      }),
    ]);

    const events = [
      ...scheduledEvents.map((event) => ({
        id: `schedule-${event.id}`,
        source: 'schedule',
        type: event.type,
        title: event.title,
        date: event.date,
        priority: event.priority,
        propertyId: event.propertyId,
        propertyName: event.property?.name ?? null,
        unitId: event.unitId,
        unitName: event.unit?.name ?? null,
        tenantId: event.tenantId,
        tenantName: event.tenant?.email ?? null,
        status: event.status ?? 'SCHEDULED',
      })),
      ...inspections.map((inspection) => ({
        id: `inspection-${inspection.id}`,
        source: 'inspection',
        type: 'INSPECTION',
        title: `${inspection.type} Inspection`,
        date: inspection.scheduledDate,
        priority: inspection.type === 'MOVE_OUT' ? 'HIGH' : 'MEDIUM',
        propertyId: inspection.propertyId,
        propertyName: inspection.property?.name ?? null,
        unitId: inspection.unitId,
        unitName: inspection.unit?.name ?? null,
        tenantId: inspection.tenantId,
        tenantName: inspection.tenant?.email ?? null,
        status: inspection.status,
      })),
      ...expiringLeases.map((lease) => ({
        id: `lease-expiration-${lease.id}`,
        source: 'lease',
        type: 'LEASE_EXPIRATION',
        title: `Lease Expiration`,
        date: lease.endDate,
        priority: lease.status === 'NOTICE_GIVEN' ? 'HIGH' : 'MEDIUM',
        propertyId: lease.unit?.propertyId ?? null,
        propertyName: lease.unit?.property?.name ?? null,
        unitId: lease.unitId,
        unitName: lease.unit?.name ?? null,
        tenantId: lease.tenantId,
        tenantName: lease.tenant?.email ?? null,
        status: lease.status,
      })),
      ...overdueInvoices.map((invoice) => ({
        id: `invoice-${invoice.id}`,
        source: 'payment',
        type: 'PAYMENT_DUE',
        title: `Overdue Invoice`,
        date: invoice.dueDate,
        priority: 'HIGH',
        propertyId: invoice.lease?.unit?.propertyId ?? null,
        propertyName: invoice.lease?.unit?.property?.name ?? null,
        unitId: invoice.lease?.unitId ?? null,
        unitName: invoice.lease?.unit?.name ?? null,
        tenantId: invoice.lease?.tenantId ?? null,
        tenantName: invoice.lease?.tenant?.email ?? null,
        status: invoice.status,
      })),
    ]
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 250);

    await this.recordAudit({
      orgId,
      actorId: options?.actorId,
      action: 'OPERATIONAL_CALENDAR_VIEWED',
      entityType: 'DashboardCalendar',
      entityId: orgId ?? 'global',
      metadata: {
        days,
        eventCount: events.length,
      },
    });

    return {
      generatedAt: new Date().toISOString(),
      days,
      eventCount: events.length,
      events,
    };
  }

  async getTenantDashboard(userId: string) {
    const [leases, maintenanceRequests, recentInspections, notifications, upcomingEvents] = await Promise.all([
      this.prisma.lease.findMany({
        where: { tenantId: userId },
        include: {
          unit: {
            include: {
              property: { select: { id: true, name: true, address: true, city: true, state: true } },
            },
          },
          payments: {
            orderBy: { paymentDate: 'desc' },
            take: 10,
            select: { id: true, amountCents: true, paymentDate: true, status: true },
          },
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
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
      this.prisma.scheduleEvent.findMany({
        where: {
          tenantId: userId,
          date: { gte: new Date() },
        },
        orderBy: { date: 'asc' },
        take: 5,
      }),
    ]);

    const activeLease = leases.find((lease) => lease.status === 'ACTIVE') ?? leases[0];
    const upcomingBalance = leases.reduce((sum, lease) => sum + Number((lease as any).currentBalance ?? 0), 0);

    return {
      leases,
      summary: {
        activeLeaseId: activeLease?.id ?? null,
        currentBalance: upcomingBalance,
        openMaintenanceCount: maintenanceRequests.filter((request) => request.status !== 'COMPLETED').length,
        upcomingEventCount: upcomingEvents.length,
      },
      maintenanceRequests,
      recentInspections,
      recentNotifications: notifications,
      upcomingEvents,
    };
  }

  private async recordAudit(event: {
    orgId?: string;
    actorId?: string;
    action: string;
    entityType: string;
    entityId?: string | number;
    metadata?: Record<string, unknown>;
  }) {
    try {
      await this.auditLogService.record({
        orgId: event.orgId,
        actorId: event.actorId ?? null,
        module: 'DASHBOARD',
        action: event.action,
        entityType: event.entityType,
        entityId: event.entityId,
        result: 'SUCCESS',
        metadata: event.metadata,
      });
    } catch (error) {
      this.logger.warn(`Failed to write dashboard audit event ${event.action}: ${String(error)}`);
    }
  }
}
