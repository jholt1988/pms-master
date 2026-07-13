import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaseStatus, SyndicationChannel } from '@prisma/client';
import { AuditLogService } from '../shared/audit-log.service';

@Injectable()
export class ReportingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getRentRoll(filters?: { propertyId?: string; status?: LeaseStatus; orgId?: string }) {
    const propertyId = filters?.propertyId;
    const orgId = filters?.orgId;
    const leases = await this.prisma.lease.findMany({
      where: {
        ...(propertyId && { unit: { propertyId } }),
        ...(orgId && { unit: { property: { organizationId: orgId } } }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        tenant: {
          select: {
            id: true,
            email: true,
          },
        },
        unit: {
          include: {
            property: {
              select: {
                id: true,
                name: true,
                address: true,
              },
            },
          },
        },
        invoices: {
          where: {
            status: 'UNPAID',
          },
        },
      },
      orderBy: {
        unit: {
          property: {
            name: 'asc',
          },
        },
      },
    });

    return leases.map((lease) => ({
      property: lease.unit.property.name,
      unit: lease.unit.name,
      tenant: lease.tenant.email,
      rentAmountCents: lease.rentAmountCents,
      status: lease.status,
      currentBalanceCents: lease.currentBalanceCents,
      unpaidInvoices: lease.invoices.length,
      totalUnpaid: lease.invoices.reduce((sum, inv) => sum + inv.amountCents, 0),
      startDate: lease.startDate,
      endDate: lease.endDate,
    }));
  }

  async getProfitAndLoss(filters?: { propertyId?: string; startDate?: Date; endDate?: Date; orgId?: string }) {
    const startDate = filters?.startDate || new Date(new Date().getFullYear(), 0, 1);
    const endDate = filters?.endDate || new Date();
    const propertyId = filters?.propertyId;
    const orgId = filters?.orgId;

    // Get income (rent payments)
    const payments = await this.prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
        ...(propertyId && {
          lease: {
            unit: {
              propertyId,
            },
          },
        }),
        ...(orgId && {
          lease: {
            unit: {
              property: { organizationId: orgId },
            },
          },
        }),
      },
      include: {
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
    });

    // Get expenses
    const expenses = await this.prisma.expense.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate,
        },
        ...(propertyId && { propertyId }),
        ...(orgId && { property: { organizationId: orgId } }),
      },
      include: {
        property: true,
      },
    });

    const incomeByProperty: Record<string, { name: string; income: number; expenses: number }> = {};

    // Calculate income
    payments.forEach((payment) => {
      const propertyId = payment.lease?.unit?.property?.id;
      if (!propertyId) return;
      if (!incomeByProperty[propertyId]) {
        incomeByProperty[propertyId] = {
          name: payment.lease?.unit?.property?.name || '',
          income: 0,
          expenses: 0,
        };
      }
      incomeByProperty[propertyId].income += payment.amountCents;
    });

    // Calculate expenses
    expenses.forEach((expense) => {
      const propertyId = expense.propertyId;
      if (!incomeByProperty[propertyId]) {
        incomeByProperty[propertyId] = {
          name: expense.property.name,
          income: 0,
          expenses: 0,
        };
      }
      incomeByProperty[propertyId].expenses += expense.amountCents;
    });

    return Object.values(incomeByProperty).map((property) => ({
      property: property.name,
      income: property.income,
      expenses: property.expenses,
      netIncome: property.income - property.expenses,
      margin: property.income > 0 ? ((property.income - property.expenses) / property.income) * 100 : 0,
    }));
  }

  async getMaintenanceResolutionAnalytics(filters?: { propertyId?: string; startDate?: Date; endDate?: Date; orgId?: string }) {
    const startDate = filters?.startDate || new Date(new Date().getFullYear(), 0, 1);
    const endDate = filters?.endDate || new Date();
    const propertyId = filters?.propertyId;
    const orgId = filters?.orgId;

    const requests = await this.prisma.maintenanceRequest.findMany({
      where: {
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
        completedAt: {
          not: null,
        },
        ...(propertyId && { propertyId }),
        ...(orgId && { property: { organizationId: orgId } }),
      },
      include: {
        property: true,
      },
    });

    const resolutionTimes = requests
      .filter((req) => req.completedAt)
      .map((req) => {
        const createdAt = new Date(req.createdAt);
        const completedAt = new Date(req.completedAt!);
        return {
          id: req.id,
          property: req.property?.name || 'Unknown',
          title: req.title,
          resolutionTimeHours: (completedAt.getTime() - createdAt.getTime()) / (1000 * 60 * 60),
          priority: req.priority,
        };
      });

    const avgResolutionTime =
      resolutionTimes.length > 0
        ? resolutionTimes.reduce((sum, r) => sum + r.resolutionTimeHours, 0) / resolutionTimes.length
        : 0;

    return {
      totalCompleted: requests.length,
      averageResolutionTimeHours: avgResolutionTime,
      averageResolutionTimeDays: avgResolutionTime / 24,
      byPriority: {
        EMERGENCY: this.calculateAverageForPriority(resolutionTimes, 'EMERGENCY'),
        HIGH: this.calculateAverageForPriority(resolutionTimes, 'HIGH'),
        MEDIUM: this.calculateAverageForPriority(resolutionTimes, 'MEDIUM'),
        LOW: this.calculateAverageForPriority(resolutionTimes, 'LOW'),
      },
      details: resolutionTimes,
    };
  }

  private calculateAverageForPriority(
    resolutionTimes: Array<{ priority: string; resolutionTimeHours: number }>,
    priority: string,
  ) {
    const filtered = resolutionTimes.filter((r) => r.priority === priority);
    if (filtered.length === 0) return { count: 0, averageHours: 0 };
    return {
      count: filtered.length,
      averageHours: filtered.reduce((sum, r) => sum + r.resolutionTimeHours, 0) / filtered.length,
    };
  }

  async getVacancyRate(filters?: { propertyId?: string; orgId?: string }) {
    const propertyId = filters?.propertyId;
    const orgId = filters?.orgId;
    const properties = await this.prisma.property.findMany({
      where: {
        ...(propertyId ? { id: propertyId } : {}),
        ...(orgId ? { organizationId: orgId } : {}),
      },
      include: {
        units: {
          include: {
            lease: {
              where: {
                status: 'ACTIVE',
              },
            },
          },
        },
      },
    });

    return properties.map((property) => {
      const totalUnits = property.units.length;
      const occupiedUnits = property.units.filter((unit) => unit.lease && (unit.lease as any)[0]?.status === 'ACTIVE').length;
      const vacancyRate = totalUnits > 0 ? ((totalUnits - occupiedUnits) / totalUnits) * 100 : 0;

      return {
        property: property.name,
        totalUnits,
        occupiedUnits,
        vacantUnits: totalUnits - occupiedUnits,
        vacancyRate: vacancyRate.toFixed(2),
      };
    });
  }

  async getPaymentHistory(filters?: { userId?: string; propertyId?: string; startDate?: Date; endDate?: Date; orgId?: string }) {
    const startDate = filters?.startDate || new Date(new Date().getFullYear(), 0, 1);
    const endDate = filters?.endDate || new Date();
    const propertyId = filters?.propertyId;
    const orgId = filters?.orgId;

    const payments = await this.prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(filters?.userId && { userId: filters.userId }),
        ...(propertyId && {
          lease: {
            unit: {
              propertyId,
            },
          },
        }),
        ...(orgId && {
          lease: {
            unit: {
              property: { organizationId: orgId },
            },
          },
        }),
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        lease: {
          include: {
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
      },
      orderBy: {
        paymentDate: 'desc',
      },
    });

    return payments.map((payment) => ({
      id: payment.id,
      amountCents: payment.amountCents,
      paymentDate: payment.paymentDate,
      status: payment.status,
      tenant: payment.user.username,
      property: payment.lease?.unit.property.name || 'Unknown',
      unit: payment.lease?.unit.name || 'Unknown',
    }));
  }

  async getManualPaymentsSummary(filters?: { propertyId?: string; startDate?: Date; endDate?: Date; orgId?: string }) {
    const startDate = filters?.startDate || new Date(new Date().getFullYear(), 0, 1);
    const endDate = filters?.endDate || new Date();

    const payments = await this.prisma.manualPayment.findMany({
      where: {
        receivedAt: { gte: startDate, lte: endDate },
        ...(filters?.propertyId && { propertyId: filters.propertyId }),
        ...(filters?.orgId && { organizationId: filters.orgId }),
      },
      include: {
        lease: { include: { unit: { include: { property: true } } } },
        tenant: { select: { username: true } },
      },
      orderBy: { receivedAt: 'desc' },
    });

    return payments.map((p) => ({
      id: p.id,
      property: p.lease?.unit?.property?.name ?? 'Unknown',
      unit: p.lease?.unit?.name ?? 'Unknown',
      tenant: p.tenant?.username ?? 'Unknown',
      method: p.method,
      appliedTo: p.appliedTo,
      amount: p.amountCents / 100,
      amountCents: p.amountCents,
      status: p.status,
      referenceNumber: p.referenceNumber,
      receivedAt: p.receivedAt,
    }));
  }

  async getManualChargesSummary(filters?: { propertyId?: string; startDate?: Date; endDate?: Date; orgId?: string }) {
    const startDate = filters?.startDate || new Date(new Date().getFullYear(), 0, 1);
    const endDate = filters?.endDate || new Date();

    const charges = await this.prisma.manualCharge.findMany({
      where: {
        chargeDate: { gte: startDate, lte: endDate },
        ...(filters?.propertyId && { propertyId: filters.propertyId }),
        ...(filters?.orgId && { organizationId: filters.orgId }),
      },
      include: {
        lease: { include: { unit: { include: { property: true } } } },
        tenant: { select: { username: true } },
      },
      orderBy: { chargeDate: 'desc' },
    });

    return charges.map((c) => ({
      id: c.id,
      property: c.lease?.unit?.property?.name ?? 'Unknown',
      unit: c.lease?.unit?.name ?? 'Unknown',
      tenant: c.tenant?.username ?? 'Unknown',
      chargeType: c.chargeType,
      amount: c.amountCents / 100,
      amountCents: c.amountCents,
      status: c.status,
      description: c.description,
      chargeDate: c.chargeDate,
      dueDate: c.dueDate,
    }));
  }

  async getDelinquencyAnalytics(filters?: {
    propertyId?: string;
    startDate?: Date;
    endDate?: Date;
    orgId?: string;
    actorId?: string;
  }) {
    const startDate = filters?.startDate || new Date(new Date().getFullYear(), 0, 1);
    const endDate = filters?.endDate || new Date();
    const propertyId = filters?.propertyId;
    const orgId = filters?.orgId;
    const now = new Date();

    const invoices = await this.prisma.invoice.findMany({
      where: {
        issuedAt: {
          gte: startDate,
          lte: endDate,
        },
        ...(propertyId && {
          lease: {
            unit: {
              propertyId,
            },
          },
        }),
        ...(orgId && {
          lease: {
            unit: {
              property: { organizationId: orgId },
            },
          },
        }),
      },
      include: {
        lease: {
          include: {
            tenant: {
              select: {
                id: true,
                email: true,
              },
            },
            unit: {
              include: {
                property: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
        payments: {
          where: {
            status: 'COMPLETED',
          },
          select: {
            id: true,
            amountCents: true,
            paymentDate: true,
          },
        },
        paymentPlan: {
          include: {
            paymentPlanPayments: {
              include: {
                payment: {
                  select: {
                    id: true,
                    amountCents: true,
                    paymentDate: true,
                    status: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const paymentPlans = invoices
      .map((invoice) => invoice.paymentPlan)
      .filter((plan): plan is NonNullable<typeof plan> => Boolean(plan));

    const invoicesWithBalances = invoices.map((invoice) => {
      const totalPaid = invoice.payments.reduce((sum, payment) => sum + payment.amountCents, 0);
      const outstandingBalance = Math.max(invoice.amountCents - totalPaid, 0);
      const isOverdue = invoice.status !== 'PAID' && invoice.dueDate < now && outstandingBalance > 0;
      const isPartial = totalPaid > 0 && outstandingBalance > 0;

      return {
        invoice,
        totalPaid,
        outstandingBalance,
        isOverdue,
        isPartial,
      };
    });

    const overdueInvoices = invoicesWithBalances.filter((item) => item.isOverdue);
    const partialInvoices = invoicesWithBalances.filter((item) => item.isPartial);

    const leaseLateCounts = new Map<string, number>();
    overdueInvoices.forEach((item) => {
      const leaseId = item.invoice.leaseId;
      leaseLateCounts.set(leaseId, (leaseLateCounts.get(leaseId) || 0) + 1);
    });

    const repeatLateLeases = Array.from(leaseLateCounts.entries())
      .filter(([, count]) => count >= 2)
      .map(([leaseId, count]) => {
        const sample = overdueInvoices.find((item) => item.invoice.leaseId === leaseId);
        return {
          leaseId,
          occurrences: count,
          tenant: (sample?.invoice.lease as any)?.tenant?.username || 'Unknown',
          property: (sample?.invoice.lease as any)?.unit?.property?.name || 'Unknown',
          unit: (sample?.invoice.lease as any)?.unit?.name || 'Unknown',
        };
      });

    const paymentPlanStatusCounts = paymentPlans.reduce<Record<string, number>>((acc, plan) => {
      acc[plan.status] = (acc[plan.status] || 0) + 1;
      return acc;
    }, {});

    const paymentPlanDetails = paymentPlans.map((plan) => {
      const relatedInvoice = invoices.find((invoice) => invoice.paymentPlan?.id === plan.id);
      const planPayments = plan.paymentPlanPayments.filter((installment) => installment.payment?.status === 'COMPLETED');
      const amountPaid = planPayments.reduce((sum, installment) => sum + (installment.payment?.amountCents || 0), 0);
      const remainingAmount = Math.max(plan.totalAmountCents - amountPaid, 0);

      return {
        id: plan.id,
        status: plan.status,
        installments: plan.installments,
        totalAmountCents: plan.totalAmountCents,
        amountPaid,
        remainingAmount,
        acceptedAt: plan.acceptedAt,
        completedAt: plan.completedAt,
        cancelledAt: plan.cancelledAt,
        tenant: (relatedInvoice?.lease as any)?.tenant?.username || 'Unknown',
        property: (relatedInvoice?.lease as any)?.unit?.property?.name || 'Unknown',
        unit: (relatedInvoice?.lease as any)?.unit?.name || 'Unknown',
      };
    });

    const result = {
      totalInvoices: invoices.length,
      overdueInvoices: overdueInvoices.length,
      overdueBalance: overdueInvoices.reduce((sum, item) => sum + item.outstandingBalance, 0),
      partialPaymentInvoices: partialInvoices.length,
      partiallyPaidBalance: partialInvoices.reduce((sum, item) => sum + item.outstandingBalance, 0),
      invoicesOnPaymentPlans: paymentPlans.length,
      paymentPlansByStatus: paymentPlanStatusCounts,
      repeatLateLeasesCount: repeatLateLeases.length,
      repeatLateLeases,
      paymentPlanDetails,
    };

    await this.auditLogService.record({
      orgId,
      actorId: filters?.actorId,
      module: 'reporting',
      action: 'DELINQUENCY_ANALYTICS_VIEWED',
      entityType: 'portfolio',
      result: 'SUCCESS',
      metadata: {
        propertyId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        totalInvoices: result.totalInvoices,
        overdueInvoices: result.overdueInvoices,
        invoicesOnPaymentPlans: result.invoicesOnPaymentPlans,
        repeatLateLeasesCount: result.repeatLateLeasesCount,
      },
    });

    return result;
  }

  async getAccountingSyncStatus(filters: { orgId?: string; actorId?: string }) {
    if (!filters.orgId) {
      throw new BadRequestException('Organization context is required');
    }

    const connections = await this.prisma.quickBooksConnection.findMany({
      where: {
        organizationId: filters.orgId,
      },
      orderBy: {
        updatedAt: 'desc',
      },
      select: {
        id: true,
        companyId: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        tokenExpiresAt: true,
        refreshTokenExpiresAt: true,
      },
    });

    const activeConnections = connections.filter((connection) => connection.isActive);
    const latestConnection = activeConnections[0] || connections[0] || null;
    const now = new Date();

    const result = {
      connected: activeConnections.length > 0,
      activeConnections: activeConnections.length,
      latestConnection: latestConnection
        ? {
            companyId: latestConnection.companyId,
            isActive: latestConnection.isActive,
            connectedAt: latestConnection.createdAt,
            lastSyncAt: latestConnection.updatedAt,
            tokenExpiresAt: latestConnection.tokenExpiresAt,
            refreshTokenExpiresAt: latestConnection.refreshTokenExpiresAt,
            syncFreshnessHours: Math.round((now.getTime() - latestConnection.updatedAt.getTime()) / (1000 * 60 * 60)),
          }
        : null,
    };

    await this.auditLogService.record({
      orgId: filters.orgId,
      actorId: filters.actorId,
      module: 'reporting',
      action: 'ACCOUNTING_SYNC_STATUS_VIEWED',
      entityType: 'quickbooksConnection',
      result: 'SUCCESS',
      metadata: {
        connected: result.connected,
        activeConnections: result.activeConnections,
        latestCompanyId: result.latestConnection?.companyId,
      },
    });

    return result;
  }

  async logSyndicationError(input: {
    propertyId: string;
    channel: SyndicationChannel;
    error: string;
    context?: unknown;
  }) {
    await this.prisma.syndicationErrorLog.create({
      data: {
        propertyId: input.propertyId,
        channel: input.channel,
        error: input.error,
        context: input.context ? (input.context as object) : undefined,
      },
    });
  }
}
