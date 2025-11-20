import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { LeadApplicationStatus, MaintenancePriority, Status } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getPropertyManagerDashboardMetrics() {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

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
  this.prisma.property.count(),
  this.prisma.unit.count(),
  this.prisma.unit.count({ where: { lease: { isNot: null } } }),
  this.prisma.user.count({ where: { role: 'TENANT' } }),
  this.prisma.maintenanceRequest.count(),
  this.prisma.leadApplication.count(),
  this.prisma.payment.count({
    where: {
      paymentDate: {
        gte: startOfMonth,
        lte: now,
      },
    },
  }),
  this.prisma.invoice.aggregate({
    _sum: { amount: true },
    where: { status: 'PENDING', dueDate: { lt: now } },
  }),
  this.prisma.maintenanceRequest.findMany({
    orderBy: { createdAt: 'desc' },
    take: 3,
  }),
  this.prisma.leadApplication.findMany({
    orderBy: { submittedAt: 'desc' },
    take: 3,
    include: {
      lead: true,
    },
  }),
  this.prisma.payment.findMany({
    orderBy: { paymentDate: 'desc' },
    take: 3,
  }),
  this.prisma.lease.findMany({
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

    const [pendingApplications, approvedApplications, rejectedApplications] = await Promise.all([
      this.prisma.leadApplication.count({ where: { status: { in: pendingStatuses } } }),
      this.prisma.leadApplication.count({ where: { status: { in: approvedStatuses } } }),
      this.prisma.leadApplication.count({ where: { status: { in: rejectedStatuses } } }),
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
        pending: await this.prisma.maintenanceRequest.count({ where: { status: Status.PENDING } }),
        inProgress: await this.prisma.maintenanceRequest.count({ where: { status: Status.IN_PROGRESS } }),
        overdue: await this.prisma.maintenanceRequest.count({
          where: { createdAt: { lt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) } },
        }),
      },
      applications: {
        total: applications,
        pending: pendingApplications,
        approved: approvedApplications,
        rejected: rejectedApplications,
      },
      recentActivity,
    };
  }

  async getTenantDashboard(userId: number) {
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
