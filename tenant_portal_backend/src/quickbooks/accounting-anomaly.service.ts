import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentLedgerEntry } from '@prisma/client';

export interface AnomalyAssessment {
  isAnomaly: boolean;
  score: number;
  reason?: string;
}

@Injectable()
export class AccountingAnomalyService {
  private readonly logger = new Logger(AccountingAnomalyService.name);
  private readonly absoluteThresholdMinor = 5_000_000;
  private readonly ratioThreshold = 3;
  private readonly zScoreThreshold = 2.5;

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assesses a payment ledger entry before shipping it to an external accounting system
   * Traps payload > N standard deviations as an AccountingAnomalyIntent
   */
  async assessLedgerEntry(entry: PaymentLedgerEntry): Promise<AnomalyAssessment> {
    const grossAmountUsd = entry.grossAmountMinor / 100;

    if (!entry.organizationId) {
      return {
        isAnomaly: true,
        score: 0.97,
        reason: 'Ledger entry is missing organization context required for accounting sync',
      };
    }

    if (!entry.leaseId) {
      return {
        isAnomaly: true,
        score: 0.93,
        reason: 'Ledger entry is missing lease linkage required for reconciliation',
      };
    }

    if (entry.grossAmountMinor > this.absoluteThresholdMinor) {
      this.logger.warn(`Anomaly detected: Amount $${grossAmountUsd} exceeds max absolute threshold`);
      return { isAnomaly: true, score: 0.99, reason: 'Amount exceeds absolute threshold ($50,000)' };
    }

    const duplicateCount = await this.prisma.paymentLedgerEntry.count({
      where: {
        organizationId: entry.organizationId,
        leaseId: entry.leaseId,
        grossAmountMinor: entry.grossAmountMinor,
        currency: entry.currency,
        id: { not: entry.id },
        createdAt: {
          gte: new Date(Date.now() - 1000 * 60 * 60 * 24),
        },
      },
    });

    if (duplicateCount > 0) {
      return {
        isAnomaly: true,
        score: 0.96,
        reason: 'Potential duplicate accounting sync payload detected within the last 24 hours',
      };
    }

    const historicalPayments = await this.prisma.paymentLedgerEntry.findMany({
      where: {
        organizationId: entry.organizationId,
        leaseId: entry.leaseId,
        id: { not: entry.id },
      },
      orderBy: { createdAt: 'desc' },
      take: 24,
      select: {
        grossAmountMinor: true,
        platformFeeMinor: true,
      },
    });

    if (historicalPayments.length >= 3) {
      const grossSeries = historicalPayments.map((item) => item.grossAmountMinor);
      const average = grossSeries.reduce((sum, value) => sum + value, 0) / grossSeries.length;
      const ratio = average > 0 ? entry.grossAmountMinor / average : 1;
      const variance =
        grossSeries.reduce((sum, value) => sum + Math.pow(value - average, 2), 0) / grossSeries.length;
      const standardDeviation = Math.sqrt(variance);
      const zScore = standardDeviation > 0 ? Math.abs((entry.grossAmountMinor - average) / standardDeviation) : 0;

      if (ratio > this.ratioThreshold || zScore >= this.zScoreThreshold) {
        return {
          isAnomaly: true,
          score: Math.min(0.98, Math.max(0.82, zScore / 4)),
          reason: 'Amount is materially outside the expected range for this lease',
        };
      }

      const avgFeePct =
        historicalPayments.reduce((sum, item) => {
          if (!item.grossAmountMinor) return sum;
          return sum + item.platformFeeMinor / item.grossAmountMinor;
        }, 0) / historicalPayments.length;
      const entryFeePct = entry.grossAmountMinor > 0 ? entry.platformFeeMinor / entry.grossAmountMinor : 0;

      if (Math.abs(entryFeePct - avgFeePct) > 0.15) {
        return {
          isAnomaly: true,
          score: 0.84,
          reason: 'Platform fee allocation deviates materially from recent accounting history',
        };
      }
    }

    return { isAnomaly: false, score: 0.1 };
  }

  async listRecentAnomalies(orgId: string, options?: { status?: string; limit?: number }) {
    const limit = Math.min(Math.max(options?.limit ?? 25, 1), 100);
    const status = options?.status?.trim();
    const anomalies = await (this.prisma as any).actionIntent.findMany({
      where: {
        organizationId: orgId,
        type: 'QUICKBOOKS_ANOMALY',
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return {
      count: anomalies.length,
      items: anomalies,
    };
  }
}
