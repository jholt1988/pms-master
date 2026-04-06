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

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Assesses a payment ledger entry before shipping it to an external accounting system
   * Traps payload > N standard deviations as an AccountingAnomalyIntent
   */
  async assessLedgerEntry(entry: PaymentLedgerEntry): Promise<AnomalyAssessment> {
    // Basic bounds checking
    const grossAmountUsd = entry.grossAmountMinor / 100;
    
    // In a mature system, this would calculate standard deviations against historical payments
    // For Phase 1, we implement a heuristics-based approach:
    
    // 1. Absolute threshold check (e.g. rent > $50,000 is an anomaly)
    if (grossAmountUsd > 50000) {
      this.logger.warn(`Anomaly detected: Amount $${grossAmountUsd} exceeds max absolute threshold`);
      return { isAnomaly: true, score: 0.99, reason: `Amount exceeds absolute threshold ($50,000)` };
    }

    // 2. Relative threshold check against property/lease history
    if (entry.leaseId) {
      const historicalPayments = await this.prisma.paymentLedgerEntry.findMany({
        where: { leaseId: entry.leaseId },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      if (historicalPayments.length > 0) {
        const sum = historicalPayments.reduce((acc, curr) => acc + curr.grossAmountMinor, 0);
        const avgMinor = sum / historicalPayments.length;
        const ratio = entry.grossAmountMinor / avgMinor;

        // If the new payment is more than 300% of the historical average
        if (ratio > 3) {
          this.logger.warn(`Anomaly detected: Amount is ${(ratio * 100).toFixed(0)}% of historical average for lease`);
          return { isAnomaly: true, score: 0.85, reason: `Amount is highly irregular compared to historical average` };
        }
      }
    }

    return { isAnomaly: false, score: 0.1 };
  }
}
