import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeaseStatus, SyndicationChannel } from '@prisma/client';

@Injectable()
export class ReportingService {
  constructor(private readonly prisma: PrismaService) {}

  async getRentRoll(filters?: { propertyId?: number; status?: LeaseStatus }) {
    const leases = await this.prisma.lease.findMany({
      where: {
        ...(filters?.propertyId && { unit: { propertyId: filters.propertyId } }),
        ...(filters?.status && { status: filters.status }),
      },
      include: {
        tenant: {
          select: {
            id: true,
            username: true,
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
      tenant: lease.tenant.username,
      rentAmount: lease.rentAmount,
      status: lease.status,
      currentBalance: lease.currentBalance,
      unpaidInvoices: lease.invoices.length,
      totalUnpaid: lease.invoices.reduce((sum, inv) => sum + inv.amount, 0),
      startDate: lease.startDate,
      endDate: lease.endDate,
    }));
  }

  async getProfitAndLoss(filters?: { propertyId?: number; startDate?: Date; endDate?: Date }) {
    const startDate = filters?.startDate || new Date(new Date().getFullYear(), 0, 1);
    const endDate = filters?.endDate || new Date();

    // Get income (rent payments)
    const payments = await this.prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: startDate,
          lte: endDate,
        },
        status: 'COMPLETED',
        ...(filters?.propertyId && {
          lease: {
            unit: {
              propertyId: filters.propertyId,
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
        ...(filters?.propertyId && { propertyId: filters.propertyId }),
      },
      include: {
        property: true,
      },
    });

    const incomeByProperty: Record<number, { name: string; income: number; expenses: number }> = {};

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
      incomeByProperty[propertyId].income += payment.amount;
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
      incomeByProperty[propertyId].expenses += expense.amount;
    });

    return Object.values(incomeByProperty).map((property) => ({
      property: property.name,
      income: property.income,
      expenses: property.expenses,
      netIncome: property.income - property.expenses,
      margin: property.income > 0 ? ((property.income - property.expenses) / property.income) * 100 : 0,
    }));
  }

  async getMaintenanceResolutionAnalytics(filters?: { propertyId?: number; startDate?: Date; endDate?: Date }) {
    const startDate = filters?.startDate || new Date(new Date().getFullYear(), 0, 1);
    const endDate = filters?.endDate || new Date();

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
        ...(filters?.propertyId && { propertyId: filters.propertyId }),
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

  async getVacancyRate(filters?: { propertyId?: number }) {
    const properties = await this.prisma.property.findMany({
      where: filters?.propertyId ? { id: filters.propertyId } : undefined,
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
      const occupiedUnits = property.units.filter((unit) => unit.lease && unit.lease.status === 'ACTIVE').length;
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

  async getPaymentHistory(filters?: { userId?: number; propertyId?: number; startDate?: Date; endDate?: Date }) {
    const startDate = filters?.startDate || new Date(new Date().getFullYear(), 0, 1);
    const endDate = filters?.endDate || new Date();

    const payments = await this.prisma.payment.findMany({
      where: {
        paymentDate: {
          gte: startDate,
          lte: endDate,
        },
        ...(filters?.userId && { userId: filters.userId }),
        ...(filters?.propertyId && {
          lease: {
            unit: {
              propertyId: filters.propertyId,
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
      amount: payment.amount,
      paymentDate: payment.paymentDate,
      status: payment.status,
      tenant: payment.user.username,
      property: payment.lease?.unit.property.name || 'Unknown',
      unit: payment.lease?.unit.name || 'Unknown',
    }));
  }

  async logSyndicationError(input: {
    propertyId: number;
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

