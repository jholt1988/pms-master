import { Injectable, NotFoundException } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { generateSignalId } from './utils/feed-id-generator';

type CanonicalUserRole = 'admin' | 'owner' | 'property_manager' | 'leasing' | 'maintenance';

interface CanonicalFeedAction {
  id: string;
  type: 'mutation' | 'navigation';
  label: string;
  variant: 'default' | 'primary' | 'secondary' | 'destructive';
  intent?: string;
  href?: string;
  requiresConfirm?: boolean;
  openInNewTab?: boolean;
}

interface CanonicalFeedItem {
  id: string;
  kind: 'critical_signal' | 'decision' | 'scheduled_event' | 'update';
  domain: 'payments' | 'leasing' | 'screening' | 'maintenance' | 'calendar';
  title: string;
  summary: string;
  priority: number;
  timestamp: string;
  actions: CanonicalFeedAction[];
  allowedRoles: CanonicalUserRole[];
  propertyId?: string;
  metadata?: Record<string, unknown>;
}

export interface CanonicalFeedResponse {
  items: CanonicalFeedItem[];
  role: CanonicalUserRole;
  generatedAt: string;
}

@Injectable()
export class FeedAggregatorService {
  constructor(private prisma: PrismaService) { }

  async getFeedForRole(role: string, limit = 20): Promise<CanonicalFeedResponse> {
    const canonicalRole = this.normalizeRole(role);
    const roleAliases = this.getRoleAliases(canonicalRole);

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
    switch ((role ?? '').toString().trim().toLowerCase()) {
      case 'admin':
      case 'administrator':
        return 'admin';
      case 'owner':
        return 'owner';
      case 'leasing':
        return 'leasing';
      case 'maintenance':
        return 'maintenance';
      case 'property_manager':
      case 'property-manager':
      case 'property manager':
      case 'pm':
      case 'propertymanager':
      case 'property_managers':
      default:
        return 'property_manager';
    }
  }

  private getRoleAliases(role: CanonicalUserRole): string[] {
    const aliases = new Set<string>();
    aliases.add(role);
    aliases.add(role.toUpperCase());

    if (role === 'property_manager') {
      aliases.add('pm');
      aliases.add('PROPERTY_MANAGER');
    }

    if (role === 'admin') {
      aliases.add('ADMIN');
    }

    if (role === 'owner') {
      aliases.add('OWNER');
    }

    if (role === 'leasing') {
      aliases.add('LEASING');
    }

    if (role === 'maintenance') {
      aliases.add('MAINTENANCE');
    }

    return [...aliases];
  }

  private toCanonicalFeedItem(item: any): CanonicalFeedItem {
    const evidence = item?.evidence && typeof item.evidence === 'object' && !Array.isArray(item.evidence)
      ? item.evidence as Record<string, unknown>
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
      metadata: evidence,
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
    if (!Array.isArray(rawActions)) {
      return [];
    }

    return rawActions.flatMap((action: any, index: number) => {
      if (!action || typeof action !== 'object') {
        return [];
      }

      const type = action.type === 'mutation' ? 'mutation' : 'navigation';
      const href = action.href ?? action.viewUrl ?? action.resolveUrl;

      return [{
        id: action.id ?? `${type}-${index}`,
        type,
        label: action.label ?? (type === 'mutation' ? 'Run action' : 'View details'),
        variant: action.variant ?? 'default',
        intent: action.intent,
        href,
        requiresConfirm: Boolean(action.requiresConfirm),
        openInNewTab: Boolean(action.openInNewTab),
      } satisfies CanonicalFeedAction];
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
            variant: 'destructive',
            requiresConfirm: true
          },
          {
            type: 'mutation',
            label: 'Issue Late Notice',
            intent: 'send_late_notice',
            variant: 'destructive',
            requiresConfirm: true
          },
          {
            type: 'navigation',
            label: 'Review Ledger',
            href: `/properties/${payload.propertyId}/tenants/${payload.tenantId}/ledger`,
            variant: 'primary'
          },
          {
            type:'mutation', 
            label: 'Mark as Resolved',
            intent: 'dismiss_manually',
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
          { label: 'Issue New 3-Day Notice', intent: 'send_late_notice', variant: 'destructive' },
          { label: 'Set Promise to Pay', intent: 'promise_to_pay', variant: 'secondary' }
        ],
        roleAccess: ['property_manager', 'admin'],
        tenantId: payload.tenantId
      }
    });
  }

  @OnEvent('application.scored')
  async handleApplicationScored(payload: { applicationId: string; score: number; urgency: string }) {
    const { applicationId, score, urgency } = payload;
    
    // Deterministic compound key: context_type_id
    const feedIdentifier = `app_scored_${applicationId}`;

    // Calculate priority based on AI score (The Brain's output)
    const priorityScore = this.calculatePriority(score, urgency);

    await this.prisma.feedItem.upsert({
      where: { id: feedIdentifier },
      update: {
        evidence: { score, status: 'SCORED' },
        priorityScore: priorityScore,
        updatedAt: new Date(),
      },
      create: {
        id: feedIdentifier,
        domain: 'LEASING',
        type: 'RENTAL_APPLICATION',
        title: 'Application Scored',
        summary: `New application scored: ${score}/100`,
        priorityScore: priorityScore,
        evidence: { applicationId, score, status: 'SCORED' },
        actions: [
          {
            type: 'navigation',
            label: 'Review Application',
            href: `/applications/${applicationId}`,
            variant: 'primary',
          },
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
        actions: { viewUrl: `/inspections/${inspectionId}/estimate` },
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
        actions: { resolveUrl: `/halt-resolution/${domain.toLowerCase()}/${referenceId}` },
        roleAccess: [requiresRole, 'ADMIN', 'OWNER'],
      },
    });
  }

}
