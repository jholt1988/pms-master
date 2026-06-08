import { Injectable } from '@nestjs/common';
import { BookkeepingTransactionStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BookkeepingService } from '../bookkeeping/bookkeeping.service';
import { PaymentsService } from '../payments/payments.service';
import {
  OperatorPaymentException,
  OperatorPaymentLedgerAccount,
  OperatorPaymentWorkbench,
} from './operator-payments.types';

type Actor = {
  userId: string;
  role: Role;
};

@Injectable()
export class OperatorPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
    private readonly bookkeepingService: BookkeepingService,
  ) {}

  async getWorkbench(
    orgId: string,
    _actor: Actor,
    options: { propertyId?: string; limit?: number } = {},
  ): Promise<OperatorPaymentWorkbench> {
    const limit = Math.min(Math.max(options.limit ?? 20, 1), 100);
    const [ledgerAccounts, delinquency, exceptionResult, reconciliation, paymentExpansionGates] =
      await Promise.all([
        this.getLedgerAccounts(orgId, options.propertyId, limit),
        this.paymentsService.getDelinquencyQueue({
          orgId,
          propertyId: options.propertyId,
          limit,
          offset: 0,
          sortBy: 'priorityScore',
          sortOrder: 'desc',
        }),
        this.bookkeepingService.getExceptionTransactions(orgId, limit, 0),
        this.bookkeepingService.getReconciliationSummary(orgId),
        this.bookkeepingService.getPaymentExpansionGateStatus(orgId),
      ]);
    const exceptions = exceptionResult.data.map((transaction): OperatorPaymentException => ({
      id: transaction.id,
      description: transaction.description,
      amountCents: transaction.amountCents,
      status: transaction.status,
      reason: transaction.exceptionReason ?? null,
      sourceType: transaction.sourceType,
      sourceId: transaction.sourceId ?? null,
      date: transaction.date.toISOString(),
      canonicalRoute: `/api/bookkeeping/transactions/exceptions?id=${transaction.id}`,
    }));
    const delinquencyItems = this.extractDelinquencyItems(delinquency);
    const paymentExpansionBlocked = this.isPaymentExpansionBlocked(paymentExpansionGates);

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        ledgerAccounts: ledgerAccounts.length,
        totalBalanceCents: ledgerAccounts.reduce((sum, account) => sum + account.currentBalanceCents, 0),
        delinquentLeases: delinquencyItems.length,
        delinquentAmountCents: delinquencyItems.reduce((sum: number, item: any) => sum + (item.amountDueCents ?? 0), 0),
        paymentExceptions: exceptions.length,
        unreconciledItems: this.countUnreconciledItems(reconciliation),
        paymentExpansionBlocked,
      },
      ledgerAccounts,
      delinquency,
      exceptions,
      reconciliation,
      paymentExpansionGates,
    };
  }

  private async getLedgerAccounts(orgId: string, propertyId: string | undefined, limit: number): Promise<OperatorPaymentLedgerAccount[]> {
    const accounts = await this.prisma.ledgerAccount.findMany({
      where: {
        organizationId: orgId,
        ...(propertyId ? { propertyId } : {}),
      },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { property: true } },
          },
        },
        entries: {
          orderBy: { effectiveDate: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    if (accounts.length > 0) {
      return accounts.map((account) => ({
        leaseId: account.leaseId,
        tenantId: account.lease.tenantId,
        tenantName: this.userLabel(account.lease.tenant),
        propertyId: account.propertyId ?? account.lease.unit?.propertyId ?? null,
        propertyName: account.lease.unit?.property?.name ?? null,
        unitId: account.unitId ?? account.lease.unitId ?? null,
        unitName: account.lease.unit?.name ?? null,
        currentBalanceCents: Math.round((account.lease.currentBalance ?? 0) * 100),
        entryCount: 0,
        lastActivityAt: account.entries[0]?.effectiveDate.toISOString() ?? account.updatedAt.toISOString(),
        canonicalRoute: `/api/payments/ledger/accounts/${account.leaseId}`,
      }));
    }

    const leases = await this.prisma.lease.findMany({
      where: {
        unit: {
          property: {
            organizationId: orgId,
            ...(propertyId ? { id: propertyId } : {}),
          },
        },
      },
      include: {
        tenant: true,
        unit: { include: { property: true } },
        invoices: { orderBy: { dueDate: 'desc' }, take: 1 },
        payments: { orderBy: { paymentDate: 'desc' }, take: 1 },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    return leases.map((lease) => {
      const lastInvoiceAt = lease.invoices[0]?.dueDate;
      const lastPaymentAt = lease.payments[0]?.paymentDate;
      const lastActivityAt = [lastInvoiceAt, lastPaymentAt, lease.updatedAt]
        .filter(Boolean)
        .sort((left, right) => right!.getTime() - left!.getTime())[0];

      return {
        leaseId: lease.id,
        tenantId: lease.tenantId,
        tenantName: this.userLabel(lease.tenant),
        propertyId: lease.unit.propertyId,
        propertyName: lease.unit.property.name,
        unitId: lease.unitId,
        unitName: lease.unit.name,
        currentBalanceCents: Math.round((lease.currentBalance ?? 0) * 100),
        entryCount: lease.invoices.length + lease.payments.length,
        lastActivityAt: lastActivityAt?.toISOString() ?? null,
        canonicalRoute: `/api/payments/ledger/accounts/${lease.id}`,
      };
    });
  }

  private extractDelinquencyItems(delinquency: unknown): any[] {
    if (!delinquency || typeof delinquency !== 'object') {
      return [];
    }
    const payload = delinquency as any;
    if (Array.isArray(payload.data)) return payload.data;
    if (Array.isArray(payload.items)) return payload.items;
    if (Array.isArray(payload.queue)) return payload.queue;
    return [];
  }

  private countUnreconciledItems(reconciliation: unknown): number {
    if (!reconciliation || typeof reconciliation !== 'object') {
      return 0;
    }
    const payload = reconciliation as any;
    if (typeof payload.unmatchedCount === 'number') return payload.unmatchedCount;
    if (typeof payload.exceptionCount === 'number') return payload.exceptionCount;
    if (Array.isArray(payload.items)) return payload.items.filter((item: any) => item.status !== 'CONFIRMED').length;
    return 0;
  }

  private isPaymentExpansionBlocked(gates: unknown): boolean {
    if (!gates || typeof gates !== 'object') {
      return true;
    }
    const payload = gates as any;
    if (typeof payload.ready === 'boolean') return !payload.ready;
    if (typeof payload.blocked === 'boolean') return payload.blocked;
    if (Array.isArray(payload.blockers)) return payload.blockers.length > 0;
    return false;
  }

  private userLabel(user: { firstName?: string | null; lastName?: string | null; email?: string | null; username?: string | null }) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.email || user.username || 'tenant';
  }
}
