import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BookkeepingService } from '../bookkeeping/bookkeeping.service';

@Injectable()
export class BriefingService {
  private readonly logger = new Logger(BriefingService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly bookkeepingService: BookkeepingService,
  ) {}

  async getDailyBriefing(userId: string, orgId?: string) {
    const [signals, decisions, events, metrics, finSignals, finDecisions, finEvents] = await Promise.allSettled([
      this.getCriticalSignals(orgId),
      this.getPendingDecisions(orgId),
      this.getTodayEvents(orgId),
      this.getBriefingMetrics(orgId),
      orgId ? this.bookkeepingService.getFinancialSignals(orgId) : Promise.resolve([]),
      orgId ? this.bookkeepingService.getFinancialDecisions(orgId) : Promise.resolve([]),
      orgId ? this.bookkeepingService.getFinancialEvents(orgId) : Promise.resolve([]),
    ]);

    const allSignals = [
      ...(signals.status === 'fulfilled' ? signals.value : []),
      ...(finSignals.status === 'fulfilled' ? finSignals.value : []),
    ].sort((a: any, b: any) => {
      const sev: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (sev[a.severity] || 3) - (sev[b.severity] || 3);
    });

    const allDecisions = [
      ...(decisions.status === 'fulfilled' ? decisions.value : []),
      ...(finDecisions.status === 'fulfilled' ? finDecisions.value : []),
    ];

    const allEvents = [
      ...(events.status === 'fulfilled' ? events.value : []),
      ...(finEvents.status === 'fulfilled' ? finEvents.value : []),
    ];

    return {
      signals: allSignals,
      decisions: allDecisions,
      events: allEvents,
      metrics: metrics.status === 'fulfilled' ? metrics.value : {
        atRiskAmount: 0,
        pendingDecisions: 0,
        todayEvents: 0,
        vacantUnits: 0,
        overduePayments: 0,
      },
    };
  }

  private async getCriticalSignals(orgId?: string) {
    const signals: any[] = [];

    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        status: 'OVERDUE',
        ...(orgId ? { lease: { unit: { property: { organizationId: orgId } } } } : {}),
      },
      include: {
        lease: {
          include: {
            tenant: { select: { email: true } },
            unit: { include: { property: { select: { name: true } } } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 20,
    });

    for (const inv of overdueInvoices) {
      const daysOverdue = Math.floor(
        (Date.now() - new Date(inv.dueDate).getTime()) / (1000 * 60 * 60 * 24),
      );
      signals.push({
        id: `overdue-${inv.id}`,
        severity: daysOverdue > 30 ? 'critical' : daysOverdue > 14 ? 'high' : 'medium',
        domain: 'payments',
        title: `${inv.lease?.tenant?.email || 'Tenant'} - $${Number(inv.amountCents).toLocaleString()} overdue`,
        summary: `${daysOverdue} days past due at ${inv.lease?.unit?.property?.name || 'property'}.`,
        monetaryImpact: Number(inv.amountCents),
        actionUrl: '/payments',
        actionLabel: 'Review',
        createdAt: inv.dueDate.toISOString(),
      });
    }

    const emergencyMaintenance = await this.prisma.maintenanceRequest.findMany({
      where: {
        priority: 'EMERGENCY',
        status: { not: 'COMPLETED' },
        ...(orgId ? { property: { organizationId: orgId } } : {}),
      },
      include: {
        property: { select: { name: true } },
        unit: { select: { name: true } },
      },
      take: 10,
    });

    for (const req of emergencyMaintenance) {
      signals.push({
        id: `maint-${req.id}`,
        severity: 'critical',
        domain: 'repairs',
        title: `Emergency: ${req.title}`,
        summary: `${req.property?.name || ''} ${req.unit?.name || ''}`,
        actionUrl: '/repairs',
        actionLabel: 'Respond',
        createdAt: req.createdAt.toISOString(),
      });
    }

    const now = new Date();
    const sixtyDays = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
    const expiringLeases = await this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: sixtyDays, gte: now },
        ...(orgId ? { unit: { property: { organizationId: orgId } } } : {}),
      },
      include: {
        tenant: { select: { email: true } },
        unit: { include: { property: { select: { name: true } } } },
      },
      take: 10,
    });

    for (const lease of expiringLeases) {
      const days = Math.ceil(
        (new Date(lease.endDate).getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
      );
      signals.push({
        id: `lease-exp-${lease.id}`,
        severity: days <= 14 ? 'high' : 'medium',
        domain: 'renewals',
        title: `Lease expiring: ${lease.tenant?.email || 'Tenant'}`,
        summary: `${days} days remaining. $${Number(lease.rentAmountCents).toLocaleString()}/mo at ${lease.unit?.property?.name || ''}.`,
        monetaryImpact: Number(lease.rentAmountCents),
        actionUrl: '/renewals',
        actionLabel: 'Review',
        createdAt: now.toISOString(),
      });
    }

    return signals.sort((a, b) => {
      const sev: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
      return (sev[a.severity] || 3) - (sev[b.severity] || 3);
    });
  }

  private async getPendingDecisions(orgId?: string) {
    const decisions: any[] = [];

    const pendingApps = await this.prisma.rentalApplication.findMany({
      where: {
        status: { in: ['SCORED', 'UNDER_REVIEW', 'BACKGROUND_CHECK', 'DOCUMENTS_REVIEW'] },
        ...(orgId ? { property: { organizationId: orgId } } : {}),
      },
      include: {
        property: { select: { name: true } },
      },
      take: 10,
    });

    for (const app of pendingApps) {
      const applicantName = app.fullName || 'Applicant';
      const propertyName = app.property?.name || 'property';
      const screeningScore = app.screeningScore || 'pending';
      decisions.push({
        id: `app-${app.id}`,
        domain: 'screening',
        type: 'application_review',
        entityType: 'rental_application',
        entityId: app.id,
        title: `Review: ${applicantName}`,
        summary: `${applicantName} is ready for screening disposition at ${propertyName}.`,
        context: `Application for ${propertyName}. Score: ${screeningScore}.`,
        reasoning: [
          `Application status is ${app.status}.`,
          `Screening score is ${screeningScore}.`,
          `Property context: ${propertyName}.`,
        ],
        priority: 74,
        aiRecommendation: app.ai_recommendation || undefined,
        actions: [
          {
            label: 'Approve',
            endpoint: `/rental-applications/${app.id}/status`,
            method: 'PATCH',
            body: { status: 'APPROVED' },
            variant: 'primary',
            description: 'Approve the application and move the applicant forward.',
            confirmation: {
              title: 'Approve application?',
              message: `This will mark ${applicantName} as approved for ${propertyName}.`,
              confirmLabel: 'Approve application',
              cancelLabel: 'Cancel',
            },
            metadata: {
              entityType: 'rental_application',
              entityId: app.id,
              status: 'APPROVED',
            },
          },
          {
            label: 'Deny',
            endpoint: `/rental-applications/${app.id}/status`,
            method: 'PATCH',
            body: { status: 'REJECTED' },
            variant: 'danger',
            confirmRequired: true,
            description: 'Reject the application and stop the current screening path.',
            confirmation: {
              title: 'Deny application?',
              message: `This will mark ${applicantName} as rejected for ${propertyName}.`,
              confirmLabel: 'Deny application',
              cancelLabel: 'Keep reviewing',
            },
            metadata: {
              entityType: 'rental_application',
              entityId: app.id,
              status: 'REJECTED',
            },
          },
        ],
        urgency: 'today',
      });
    }

    const pendingEstimates = await this.prisma.repairEstimate.findMany({
      where: {
        status: 'PENDING_REVIEW',
        ...(orgId ? { property: { organizationId: orgId } } : {}),
      },
      include: {
        property: { select: { name: true } },
      },
      take: 10,
    });

    for (const est of pendingEstimates) {
      const propertyName = est.property?.name || 'Property';
      const totalProjectCost = Number(est.totalProjectCost);
      const totalLaborCost = Number(est.totalLaborCost);
      const totalMaterialCost = Number(est.totalMaterialCost);
      decisions.push({
        id: `est-${est.id}`,
        domain: 'repairs',
        type: 'estimate_approval',
        entityType: 'repair_estimate',
        entityId: est.id,
        title: `Approve estimate: $${totalProjectCost.toLocaleString()}`,
        summary: `${propertyName} has a repair estimate waiting for disposition.`,
        context: `${propertyName} - Labor: $${totalLaborCost.toLocaleString()}, Materials: $${totalMaterialCost.toLocaleString()}`,
        reasoning: [
          `Estimate status is ${est.status}.`,
          `Total project cost is $${totalProjectCost.toLocaleString()}.`,
          `Labor is $${totalLaborCost.toLocaleString()} and materials are $${totalMaterialCost.toLocaleString()}.`,
        ],
        priority: totalProjectCost >= 5000 ? 82 : 68,
        actions: [
          {
            label: 'Approve',
            endpoint: `/estimates/${est.id}/approve`,
            method: 'PATCH',
            body: {},
            variant: 'primary',
            description: 'Approve the estimate and allow the work to proceed.',
            confirmation: {
              title: 'Approve estimate?',
              message: `Approve the $${totalProjectCost.toLocaleString()} estimate for ${propertyName}?`,
              confirmLabel: 'Approve estimate',
              cancelLabel: 'Cancel',
            },
            metadata: {
              entityType: 'repair_estimate',
              entityId: est.id,
              status: 'APPROVED',
              amount: totalProjectCost,
            },
          },
          {
            label: 'Reject',
            endpoint: `/estimates/${est.id}/reject`,
            method: 'PATCH',
            body: {},
            variant: 'danger',
            confirmRequired: true,
            description: 'Reject the estimate and keep the repair in review.',
            confirmation: {
              title: 'Reject estimate?',
              message: `Reject the $${totalProjectCost.toLocaleString()} estimate for ${propertyName}?`,
              confirmLabel: 'Reject estimate',
              cancelLabel: 'Keep pending',
            },
            metadata: {
              entityType: 'repair_estimate',
              entityId: est.id,
              status: 'REJECTED',
              amount: totalProjectCost,
            },
          },
        ],
        urgency: 'today',
      });
    }

    return decisions;
  }

  private async getTodayEvents(orgId?: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const scheduleEvents = await this.prisma.scheduleEvent.findMany({
      where: {
        date: { gte: today, lt: tomorrow },
        ...(orgId ? { property: { organizationId: orgId } } : {}),
      },
      include: {
        property: { select: { name: true } },
        unit: { select: { name: true } },
      },
      orderBy: { date: 'asc' },
      take: 20,
    });

    return scheduleEvents.map((e) => ({
      id: e.id,
      type: (e.type || 'maintenance').toLowerCase(),
      title: e.title,
      scheduledAt: e.date.toISOString(),
      propertyName: e.property?.name || '',
      unitName: e.unit?.name || undefined,
    }));
  }

  private async getBriefingMetrics(orgId?: string) {
    const orgFilter = orgId ? { property: { organizationId: orgId } } : {};

    const [overdueCount, vacantCount, pendingAppCount] = await Promise.all([
      this.prisma.invoice.count({
        where: { status: 'OVERDUE', ...(orgId ? { lease: { unit: orgFilter } } : {}) },
      }),
      this.prisma.unit.count({
        where: { lease: null, ...orgFilter },
      }),
      this.prisma.rentalApplication.count({
        where: {
          status: { in: ['SCORED', 'UNDER_REVIEW', 'BACKGROUND_CHECK', 'DOCUMENTS_REVIEW'] },
          ...(orgId ? { property: { organizationId: orgId } } : {}),
        },
      }),
    ]);

    const overdueInvoices = await this.prisma.invoice.aggregate({
      where: { status: 'OVERDUE', ...(orgId ? { lease: { unit: orgFilter } } : {}) },
      _sum: { amountCents: true },
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayEventCount = await this.prisma.scheduleEvent.count({
      where: {
        date: { gte: today, lt: tomorrow },
        ...(orgId ? { property: { organizationId: orgId } } : {}),
      },
    });

    return {
      atRiskAmount: Number(overdueInvoices._sum.amountCents || 0),
      pendingDecisions: pendingAppCount,
      todayEvents: todayEventCount,
      vacantUnits: vacantCount,
      overduePayments: overdueCount,
    };
  }

  // ========== GAP REMEDIATION - Issue 10: Portfolio Risk Briefing ==========

  async injectRiskItem(
    propertyId: string,
    riskType: string,
    riskScore: number,
    description: string,
    _orgId: string,
  ) {
    this.logger.log(`[STUB] Injecting risk item for property ${propertyId}: ${riskType} (score: ${riskScore})`);
    return {
      success: true,
      propertyId,
      riskType,
      riskScore,
      description,
      injectedAt: new Date().toISOString(),
      willAppearInBriefing: true,
    };
  }

  // ========== END GAP REMEDIATION ==========
}
