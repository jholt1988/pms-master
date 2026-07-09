import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { PaymentLedgerEntry } from '@prisma/client';
import { AbstractQuickBooksService } from './quickbooks.types';
import { AccountingAnomalyService } from './accounting-anomaly.service';
import { AuditLogService } from '../shared/audit-log.service';
import Opossum from 'opossum';
import { PrismaService } from '../prisma/prisma.service';

interface SyncLedgerJobData {
  entry: PaymentLedgerEntry;
  userId: string;
  orgId: string;
}

@Processor('quickbooks-sync')
export class QuickBooksSyncProcessor {
  private readonly logger = new Logger(QuickBooksSyncProcessor.name);
  // opossum ships no types and @types/opossum is not installed, so the default
  // import resolves to a value; using it in type position triggered TS2749.
  // Typed as any here to restore tsc; add @types/opossum for real typing (#75).
  private circuitBreaker: any;

  constructor(
    private readonly qbService: AbstractQuickBooksService,
    private readonly anomalyService: AccountingAnomalyService,
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
  ) {
    // 1. Setup the opossum Circuit Breaker
    const syncAction = async (userId: string, orgId: string) => {
      // the actual API call logic
      const result = await this.qbService.basicSync(userId, orgId);
      if (!result.success) {
        throw new Error(result.message);
      }
      return result;
    };

    const breakerOptions = {
      timeout: 10000, 
      errorThresholdPercentage: 50, // When 50% of requests fail
      resetTimeout: 30000 // After 30 seconds, try again.
    };

    this.circuitBreaker = new Opossum(syncAction, breakerOptions);

    this.circuitBreaker.on('open', () => this.logger.warn('QuickBooks Circuit Breaker OPENED! Syncs pausing.'));
    this.circuitBreaker.on('halfOpen', () => this.logger.log('QuickBooks Circuit Breaker HALF-OPEN... testing.'));
    this.circuitBreaker.on('close', () => this.logger.log('QuickBooks Circuit Breaker CLOSED. Normal operations.'));
  }

  @Process({ name: 'sync-ledger-entry', concurrency: 2 })
  async handleSyncLedgerEntry(job: Job<SyncLedgerJobData>) {
    const { entry, userId, orgId } = job.data;
    
    this.logger.log(`Processing ledger sync job for PaymentLedgerEntry ${entry.id}`);

    // 2. Anomaly Detection
    const assessment = await this.anomalyService.assessLedgerEntry(entry);
    
    if (assessment.isAnomaly) {
      // Store the anomaly as an ActionIntent for PM dashboard review
      await (this.prisma as any).actionIntent.create({
        data: {
          type: 'QUICKBOOKS_ANOMALY',
          description: `Anomaly detected for Entry ${entry.id}: ${assessment.reason}`,
          status: 'PENDING',
          priority: 'HIGH',
          organizationId: orgId,
          userId: userId,
          metadata: {
            reason: assessment.reason,
            score: assessment.score,
            amount: entry.grossAmountMinor,
            entryId: entry.id
          }
        }
      });
      return; 
    }

    try {
      // 3. Fire circuit breaker execute
      const result = await this.circuitBreaker.fire(userId, orgId);
      this.logger.log(`Sync successful for Entry ${entry.id}`, result);
    } catch (e: any) {
      this.logger.error(`Failed to sync Entry ${entry.id} via Circuit Breaker: ${e.message}`);
      // Throwing error causes Bull to use exponential backoff and retry
      throw e;
    }
  }
}
