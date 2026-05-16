import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { normalizeAppRole, roleAliasesForQuery } from '../auth/app-role';
import type {
  CanonicalFeedAction,
  CanonicalFeedItem,
  CanonicalFeedMetadata,
  CanonicalFeedResponse,
  CanonicalUserRole,
} from './feed.types';
import { generateSignalId } from './utils/feed-id-generator';

@Injectable()
export class FeedAggregatorService {
  constructor(private prisma: PrismaService) { }

  async getFeedForRole(role: string, limit = 20): Promise<CanonicalFeedResponse> {
    const canonicalRole = this.normalizeRole(role);
    const roleAliases = roleAliasesForQuery(canonicalRole);

    const items = await this.prisma.feedItem.findMany({
      where: {
        isDismissed: false,
        OR: roleAliases.map((alias) => ({ roleAccess: { has: alias } })),
      },
      orderBy: [{ priorityScore: 'desc' }, { createdAt: 'desc' }],
      take: Number(limit),
    });

    return {
      items: items.map((item) => this.toCanonicalFeedItem(item)),
      role: canonicalRole,
      generatedAt: new Date().toISOString(),
    };
  }

  private normalizeRole(role: string | undefined): CanonicalUserRole {
    return normalizeAppRole(role);
  }

  private toCanonicalFeedItem(item: any): CanonicalFeedItem {
    const evidence = item?.evidence && typeof item.evidence === 'object' && !Array.isArray(item.evidence)
      ? item.evidence as Record<string, unknown>
      : undefined;

    const metadata: CanonicalFeedMetadata | undefined = evidence
      ? {
          ...evidence,
          reasoning: Array.isArray(evidence.reasoning) ? evidence.reasoning as string[] : undefined,
          type: typeof evidence.type === 'string' ? evidence.type as CanonicalFeedMetadata['type'] : undefined,
          confidenceScore: typeof evidence.confidenceScore === 'number' ? evidence.confidenceScore : undefined,
          impact: evidence.impact as CanonicalFeedMetadata['impact'] | undefined,
          relatedDecisionIds: Array.isArray(evidence.relatedDecisionIds)
            ? evidence.relatedDecisionIds as string[]
            : undefined,
          workflow: evidence.workflow as CanonicalFeedMetadata['workflow'] | undefined,
        }
      : undefined;

    return {
      id: item.id,
      kind: this.mapKind(item.type),
      domain: this.mapDomain(item.domain),
      title: item.title,
      summary: item.summary,
      priority: Math.round(Number(item.priorityScore ?? 0)),
      timestamp: item.updatedAt?.toISOString?.() ?? item.createdAt?.toISOString?.() ?? new Date().toISOString(),
      actions: this.mapActions(item.actions),
      allowedRoles: Array.isArray(item.roleAccess)
        ? item.roleAccess.map((role: string) => this.normalizeRole(role))
        : [],
      propertyId: item.propertyId ?? undefined,
      metadata,
    };
  }

  private mapKind(type: string | undefined): CanonicalFeedItem['kind'] {
    const normalized = (type ?? '').toLowerCase();
    if (normalized.includes('event')) return 'scheduled_event';
    if (normalized.includes('decision')) return 'decision';
    if (normalized.includes('critical') || normalized.includes('halt') || normalized.includes('delinquent')) {
      return 'critical_signal';
    }
    return 'update';
  }

  private mapDomain(domain: string | undefined): CanonicalFeedItem['domain'] {
    switch ((domain ?? '').toLowerCase()) {
      case 'payments':
        return 'payments';
      case 'screening':
      case 'rental_application':
      case 'rental-applications':
        return 'screening';
      case 'maintenance':
      case 'inspection':
        return 'maintenance';
      case 'calendar':
      case 'schedule':
        return 'calendar';
      case 'leasing':
      default:
        return 'leasing';
    }
  }

  private mapActions(rawActions: unknown): CanonicalFeedAction[] {
    const actionList = Array.isArray(rawActions)
      ? rawActions
      : rawActions && typeof rawActions === 'object'
        ? [rawActions]
        : [];

    if (actionList.length === 0) {
      return [];
    }

    return actionList.flatMap((action: any, index: number) => {
      if (!action || typeof action !== 'object') {
        return [];
      }

      const isMutation = action.type === 'mutation' || (!action.href && !action.viewUrl && !action.resolveUrl);

      return [{
        id: action.id ?? `${isMutation ? 'mutation' : 'navigation'}-${index}`,
        type: isMutation ? 'mutation' : 'navigation',
        label: action.label ?? (isMutation ? 'Run action' : 'View details'),
        variant: action.variant ?? 'default',
        intent: action.intent,
        href: action.href ?? action.viewUrl ?? action.resolveUrl,
        endpoint: action.endpoint,
        method: action.method ?? (isMutation ? 'POST' : 'GET'),
        body: action.body,
        requiresConfirm: Boolean(action.requiresConfirm || action.confirmRequired),
        confirmRequired: Boolean(action.requiresConfirm || action.confirmRequired),
        openInNewTab: Boolean(action.openInNewTab),
        description: typeof action.description === 'string' ? action.description : undefined,
        tooltip: typeof action.tooltip === 'string' ? action.tooltip : undefined,
        confirmation: action.confirmation && typeof action.confirmation === 'object'
          ? {
              title: action.confirmation.title,
              message: action.confirmation.message,
              confirmLabel: action.confirmation.confirmLabel,
              cancelLabel: action.confirmation.cancelLabel,
            }
          : undefined,
        metadata: action.metadata && typeof action.metadata === 'object'
          ? action.metadata as Record<string, unknown>
          : undefined,
      } satisfies CanonicalFeedAction & Record<string, any>];
    });
  }

  async addNoteToItem(
    id: string,
    note: { narrative: string; userId: string; lastUpdated: string },
  ) {
    const existingItem = await this.prisma.feedItem.findUnique({ where: { id } });
    if (!existingItem) {
      throw new NotFoundException('Feed item not found');
    }

    const existingEvidence =
      existingItem.evidence && typeof existingItem.evidence === 'object' && !Array.isArray(existingItem.evidence)
        ? (existingItem.evidence as Record<string, unknown>)
        : { rawEvidence: existingItem.evidence };
    const notes = Array.isArray(existingEvidence.notes) ? [...existingEvidence.notes, note] : [note];

    return this.prisma.feedItem.update({
      where: { id },
      data: {
        evidence: {
          ...existingEvidence,
          notes,
          latestNote: note.narrative,
          lastNotedBy: note.userId,
          lastNotedAt: note.lastUpdated,
        },
      },
    });
  }

  async dismissItem(id: string) {
    const existingItem = await this.prisma.feedItem.findUnique({ where: { id } });
    if (!existingItem) {
      throw new NotFoundException('Feed item not found');
    }

    return this.prisma.feedItem.update({
      where: { id },
      data: {
        isDismissed: true,
        updatedAt: new Date(),
      },
    });
  }

  @OnEvent('payment.delinquent')
  async handleDelinquentPayment(payload: any) {
    // 1. Math: Calculate Priority Score (from our previous model)
    const urgency = Math.min(100, payload.daysOverdue / 90 * 100);
    const risk = payload.daysOverdue >= 30 ? 100 : (payload.daysOverdue / 30 * 100);
    const baseScore = (urgency * 0.35 + risk * 0.25 + 40 /* static financial */) / 100;

    // Apply Property OS Confidence Discount (C^1.5)
    const finalScore = (baseScore * Math.pow(payload.confidence, 1.5)) * 100;

    const signalId = generateSignalId('payments', 'rent_delinquent', payload.paymentId);
    // 2. Upsert Materialized View
    await this.prisma.feedItem.upsert({
      where: {
        id: signalId
      },
      update: {
        priorityScore: finalScore,
        summary: `Payment of $${payload.amount} is ${payload.daysOverdue} days late.`,
        evidence: payload,
      },
      create: {
        id: signalId,
        domain: 'payments',
        type: 'rent_delinquent',
        priorityScore: finalScore,
        title: 'Rent Payment Delinquent',
        summary: `Payment of $${payload.amount} is ${payload.daysOverdue} days late.`,
        evidence: payload,
        actions: [
          {
            type: 'mutation',
            label: 'Issue 3-Day Notice',
            intent: 'send_3_day_notice',
            endpoint: `/payments/delinquency/${payload.paymentId}/issue-notice`,
            method: 'POST',
            body: { noticeType: '3_DAY' },
            variant: 'destructive',
            requiresConfirm: true
          },
          {
            type: 'mutation',
            label: 'Issue Late Notice',
            intent: 'send_late_notice',
            endpoint: `/payments/delinquency/${payload.paymentId}/issue-notice`,
            method: 'POST',
            body: { noticeType: 'LATE_FEE' },
            variant: 'destructive',
            requiresConfirm: true
          },
          {
            type: 'navigation',
            label: 'Review Ledger',
            href: `/properties/${payload.propertyId}/tenants/${payload.tenantId}/ledger`,
            endpoint: `/properties/${payload.propertyId}/tenants/${payload.tenantId}/ledger`,
            method: 'GET',
            variant: 'primary'
          },
          {
            type:'mutation', 
            label: 'Mark as Resolved',
            intent: 'dismiss_manually',
            endpoint: `/feed/${signalId}/dismiss`,
            method: 'PATCH',
            variant: 'secondary'
          }
        ],
        roleAccess: ['property_manager', 'admin'],
        tenantId: payload.tenantId
      }
    });
  }
  @OnEvent('payment.resolved')
  async handlePaymentResolved(payload: { paymentId: string; resolvedAt: Date }) {
    // Reconstruct the exact ID used when the delinquency was created
    const signalId = generateSignalId('payments', 'rent_delinquent', payload.paymentId);

    // Soft delete the signal so it vanishes from the Next.js active feed
    try {
      await this.prisma.feedItem.update({
        where: { id: signalId },
        data: {
          isDismissed: true,
          updatedAt: payload.resolvedAt
        }
      });
    } catch (error) {
      // Handle edge case: The payment was paid on time, so a delinquent 
      // signal never existed. Prisma throws a "Record to update not found" error.
      if (error.code === 'P2025') {
        // Safe to ignore. No actionable signal existed to dismiss.
        return;
      }
      throw error;
    }
  }

  // src/feed/feed-aggregator.service.ts
  @OnEvent('payment.partial')
  async handlePartialPayment(payload: { paymentId: string; newBalance: number; confidence: number; daysOverdue: number; tenantId: string }) {
    // 1. Soft-delete the original signal
    const originalSignalId = generateSignalId('payments', 'rent_delinquent', payload.paymentId);
    await this.prisma.feedItem.updateMany({
      where: { id: originalSignalId, isDismissed: false },
      data: { isDismissed: true, updatedAt: new Date() }
    });

    // 2. Math: Calculate priority for the remaining balance
    const urgency = Math.min(100, payload.daysOverdue / 90 * 100); // Clock is reset, so daysOverdue should be 1
    const risk = payload.daysOverdue >= 30 ? 100 : (payload.daysOverdue / 30 * 100);
    const baseScore = (urgency * 0.35 + risk * 0.25 + 40) / 100;
    const finalScore = (baseScore * Math.pow(payload.confidence, 1.5)) * 100;

    // 3. Create the NEW signal with a versioned ID
    const newSignalId = generateSignalId('payments', 'rent_delinquent', `${payload.paymentId}-partial-${Date.now()}`);

    await this.prisma.feedItem.create({
      data: {
        id: newSignalId,
        domain: 'payments',
        type: 'rent_delinquent',
        priorityScore: finalScore,
        title: 'Partial Payment - Notice Clock Reset',
        summary: `Remaining balance of $${payload.newBalance}. Previous notice voided.`,
        evidence: payload,
        actions: [
          {
            type: 'mutation',
            label: 'Issue New 3-Day Notice',
            intent: 'send_3_day_notice',
            endpoint: `/payments/delinquency/${payload.paymentId}/issue-notice`,
            method: 'POST',
            body: { noticeType: '3_DAY' },
            variant: 'destructive',
            requiresConfirm: true,
          },
          {
            type: 'mutation',
            label: 'Set Promise to Pay',
            intent: 'promise_to_pay',
            endpoint: `/payments/delinquency/${payload.paymentId}/promise-to-pay`,
            method: 'POST',
            variant: 'secondary',
          },
        ],
        roleAccess: ['property_manager', 'admin'],
        tenantId: payload.tenantId
      }
    });
  }

  @OnEvent('application.scored')
  async handleApplicationScored(payload: { applicationId: string; score: number; urgency: string }) {
    const { applicationId, score, urgency } = payload;

    const feedIdentifier = `app_scored_${applicationId}`;
    const priorityScore = this.calculatePriority(score, urgency);
    const evidence = {
      applicationId,
      score,
      status: 'SCORED',
      type: 'review' as const,
      confidenceScore: score,
      reasoning: ['Application scoring completed and ready for manager review'],
      workflow: { stage: 'screening_review', totalStages: 3, currentStageIndex: 1 },
    };

    await this.prisma.feedItem.upsert({
      where: { id: feedIdentifier },
      update: {
        summary: `Rental application scored: ${score}/100`,
        evidence,
        priorityScore,
        updatedAt: new Date(),
      },
      create: {
        id: feedIdentifier,
        domain: 'LEASING',
        type: 'RENTAL_APPLICATION',
        title: 'Application Scored',
        summary: `Rental application scored: ${score}/100`,
        priorityScore,
        evidence,
        actions: [
          {
            type: 'navigation',
            label: 'Review Application',
            href: `/screening/${applicationId}`,
            endpoint: `/screening/${applicationId}`,
            method: 'GET',
            variant: 'primary',
          },
          {
            type: 'mutation',
            label: 'Auto-Approve',
            endpoint: `/rental-applications/${applicationId}/review-action`,
            method: 'POST',
            body: { action: 'APPROVE' },
            variant: 'secondary',
          }
        ],
        roleAccess: ['PROPERTY_MANAGER', 'ADMIN', 'OWNER'],
      },
    });
  }

  private calculatePriority(score: number, urgency: string): number {
    // Logic for Feed sorting (The "Nerve" prioritization)
    let weight = score > 80 ? 10 : 5;
    if (urgency === 'HIGH') weight += 20;
    return weight;
  }
@OnEvent('inspection.estimated')
  async handleInspectionEstimated(payload: any) {
    const { inspectionId, totalEstimatedCost, priority } = payload;
    const feedKey = `inspection_est_${inspectionId}`;

    // Map to the Float priorityScore expected by the DB
    const priorityScore = priority === 'CRITICAL' ? 100 : priority === 'HIGH' ? 80 : 50;

    await this.prisma.feedItem.upsert({
      where: { id: feedKey },
      update: {
        summary: `New Repair Estimate: $${totalEstimatedCost}`,
        priorityScore: priorityScore,
        evidence: payload,
        updatedAt: new Date(),
      },
      create: {
        id: feedKey,
        domain: 'MAINTENANCE',
        type: 'INSPECTION_ESTIMATE',
        title: 'AI Estimate Generated',
        summary: `New Repair Estimate: $${totalEstimatedCost}`,
        priorityScore: priorityScore,
        evidence: payload,
        actions: [
          {
            type: 'navigation',
            label: 'View Estimate',
            href: `/inspections/${inspectionId}/estimate`,
            endpoint: `/inspections/${inspectionId}/estimate`,
            method: 'GET',
            variant: 'primary',
          },
          {
            type: 'mutation',
            label: 'Approve',
            endpoint: `/estimates/${inspectionId}/approve`,
            method: 'PATCH',
            variant: 'secondary',
            requiresConfirm: true
          }
        ],
        roleAccess: ['PROPERTY_MANAGER', 'ADMIN', 'OWNER'],
      },
    });
  }

@OnEvent('orchestrator.halt')
  async handleSwarmHalt(payload: any) {
    const { referenceId, reason, requiresRole, source } = payload;
    const feedKey = `halt_${source}_${referenceId}`;
    
    const domain = source.includes('application') ? 'LEASING' : 'MAINTENANCE';

    await this.prisma.feedItem.upsert({
      where: { id: feedKey },
      update: { 
        priorityScore: 100, 
        summary: `HALT: ${reason}`,
        updatedAt: new Date(),
      },
      create: {
        id: feedKey,
        domain: domain,
        type: 'SWARM_HALT',
        title: 'Critical Action Required',
        summary: `Halt Triggered: ${reason}`,
        priorityScore: 100, // Maximum priority
        evidence: payload,
        actions: [
          {
            type: 'navigation',
            label: 'Resolve Halt',
            href: `/halt-resolution/${domain.toLowerCase()}/${referenceId}`,
            endpoint: `/halt-resolution/${domain.toLowerCase()}/${referenceId}`,
            method: 'GET',
            variant: 'primary'
          }
        ],
        roleAccess: [requiresRole, 'ADMIN', 'OWNER'],
      },
    });
  }

}
