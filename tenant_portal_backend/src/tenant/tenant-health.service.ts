import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TenantHealthClassification } from '@prisma/client';

export interface HealthDimensions {
  paymentStability: number;
  maintenanceFriction: number;
  communicationResponsiveness: number;
  renewalLikelihood: number;
  complianceRisk: number;
}

export interface TenantHealthResult {
  classification: TenantHealthClassification;
  score: number;
  dimensions: HealthDimensions;
  signals: string[];
  actions: string[];
}

@Injectable()
export class TenantHealthService {
  private readonly logger = new Logger(TenantHealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  async computeHealth(userId: string): Promise<TenantHealthResult> {
    const [paymentData, maintenanceData, commData, leaseData, violationData] =
      await Promise.all([
        this.getPaymentMetrics(userId),
        this.getMaintenanceMetrics(userId),
        this.getCommunicationMetrics(userId),
        this.getLeaseMetrics(userId),
        this.getViolationMetrics(userId),
      ]);

    const dimensions: HealthDimensions = {
      paymentStability: paymentData.score,
      maintenanceFriction: maintenanceData.score,
      communicationResponsiveness: commData.score,
      renewalLikelihood: leaseData.score,
      complianceRisk: violationData.score,
    };

    const weightedScore =
      dimensions.paymentStability * 0.35 +
      dimensions.maintenanceFriction * 0.15 +
      dimensions.communicationResponsiveness * 0.15 +
      dimensions.renewalLikelihood * 0.20 +
      dimensions.complianceRisk * 0.15;

    const signals: string[] = [
      ...paymentData.signals,
      ...maintenanceData.signals,
      ...commData.signals,
      ...leaseData.signals,
      ...violationData.signals,
    ];

    const actions: string[] = [];
    let classification: TenantHealthClassification;

    if (weightedScore >= 80) {
      classification = TenantHealthClassification.STABLE;
    } else if (weightedScore >= 60) {
      classification = TenantHealthClassification.WATCH;
      actions.push('Review Account');
    } else if (weightedScore >= 40) {
      classification = TenantHealthClassification.AT_RISK;
      actions.push('Review Account', 'Contact Tenant');
    } else {
      classification = TenantHealthClassification.HIGH_TOUCH;
      actions.push('Review Account', 'Escalate Collections', 'Contact Tenant');
    }

    if (leaseData.renewalDue) {
      actions.push('Offer Renewal');
    }

    return { classification, score: Math.round(weightedScore), dimensions, signals, actions };
  }

  private async getPaymentMetrics(userId: string) {
    const signals: string[] = [];
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const payments = await this.prisma.payment.findMany({
      where: { userId, paymentDate: { gte: sixMonthsAgo } },
      include: { invoice: true },
      orderBy: { paymentDate: 'desc' },
    });

    const totalPayments = payments.length;
    const latePayments = payments.filter((p) => {
      if (!p.invoice?.dueDate) return false;
      return p.paymentDate > p.invoice.dueDate;
    });

    if (latePayments.length > 0) {
      signals.push(`${latePayments.length} late payment${latePayments.length > 1 ? 's' : ''} in last 6 months`);
    }

    const lease = await this.prisma.lease.findFirst({
      where: { tenantId: userId },
    });

    if (lease && lease.currentBalanceCents > 0) {
      signals.push(`Outstanding balance: $${lease.currentBalanceCents.toLocaleString()}`);
    }

    const onTimeRate = totalPayments > 0
      ? ((totalPayments - latePayments.length) / totalPayments) * 100
      : 100;

    return { score: Math.min(100, onTimeRate), signals };
  }

  private async getMaintenanceMetrics(userId: string) {
    const signals: string[] = [];

    const openRequests = await this.prisma.maintenanceRequest.count({
      where: { authorId: userId, status: { not: 'COMPLETED' } },
    });

    const emergencyCount = await this.prisma.maintenanceRequest.count({
      where: {
        authorId: userId,
        priority: 'EMERGENCY',
        createdAt: { gte: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000) },
      },
    });

    if (openRequests > 0) {
      signals.push(`${openRequests} open maintenance request${openRequests > 1 ? 's' : ''}`);
    }

    if (emergencyCount > 0) {
      signals.push(`${emergencyCount} emergency request${emergencyCount > 1 ? 's' : ''} in 6 months`);
    }

    let score = 100;
    if (openRequests > 3) score -= 30;
    else if (openRequests > 1) score -= 15;
    if (emergencyCount > 1) score -= 20;

    return { score: Math.max(0, score), signals };
  }

  private async getCommunicationMetrics(userId: string) {
    const signals: string[] = [];

    const lastComm = await this.prisma.communicationLog.findFirst({
      where: { tenantId: userId },
      orderBy: { createdAt: 'desc' },
    });

    const daysSinceContact = lastComm
      ? Math.floor((Date.now() - lastComm.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : 999;

    if (daysSinceContact > 30) {
      signals.push(`No contact in ${daysSinceContact} days`);
    }

    let score = 100;
    if (daysSinceContact > 60) score -= 40;
    else if (daysSinceContact > 30) score -= 20;

    return { score: Math.max(0, score), signals };
  }

  private async getLeaseMetrics(userId: string) {
    const signals: string[] = [];
    let renewalDue = false;

    const lease = await this.prisma.lease.findFirst({
      where: { tenantId: userId, status: { in: ['ACTIVE', 'RENEWAL_PENDING'] } },
    });

    if (!lease) {
      return { score: 50, signals: ['No active lease'], renewalDue: false };
    }

    const daysUntilEnd = Math.floor(
      (lease.endDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24),
    );

    if (daysUntilEnd <= 90 && daysUntilEnd > 0) {
      signals.push(`Lease ends in ${daysUntilEnd} days`);
      renewalDue = true;
    }

    if (lease.status === 'RENEWAL_PENDING') {
      signals.push('Renewal pending');
    }

    let score = 80;
    if (daysUntilEnd <= 30) score -= 30;
    else if (daysUntilEnd <= 60) score -= 15;
    if (lease.status === 'RENEWAL_PENDING') score += 10;

    return { score: Math.max(0, Math.min(100, score)), signals, renewalDue };
  }

  private async getViolationMetrics(userId: string) {
    const signals: string[] = [];

    const profile = await this.prisma.tenantProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return { score: 100, signals };
    }

    const openViolations = await this.prisma.violation.count({
      where: { tenantProfileId: profile.id, isResolved: false },
    });

    if (openViolations > 0) {
      signals.push(`${openViolations} unresolved violation${openViolations > 1 ? 's' : ''}`);
    }

    let score = 100;
    if (openViolations > 2) score -= 40;
    else if (openViolations > 0) score -= 20;

    return { score: Math.max(0, score), signals };
  }
}
