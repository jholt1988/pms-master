import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  LeaseStatus,
  LeaseRenewalStatus,
  EsignEnvelopeStatus,
  MaintenancePriority,
  Status,
  InspectionRequestStatus,
} from '@prisma/client';

export type TenantFeedDomain =
  | 'payments'
  | 'maintenance'
  | 'lease'
  | 'inspection'
  | 'document'
  | 'message'
  | 'renewal'
  | 'move_out';

export type TenantFeedItemKind =
  | 'critical_signal'
  | 'decision'
  | 'scheduled_event'
  | 'update';

export interface TenantFeedItem {
  id: string;
  kind: TenantFeedItemKind;
  domain: TenantFeedDomain;
  title: string;
  summary: string;
  priority: number;
  timestamp: string;
  navigateTo: string;
  financialImpact?: number;
  urgencyHours?: number;
  isDismissed?: boolean;
  metadata?: Record<string, unknown>;
}

const KIND_BASE: Record<TenantFeedItemKind, number> = {
  critical_signal: 80,
  decision: 70,
  scheduled_event: 50,
  update: 30,
};

function score(
  kind: TenantFeedItemKind,
  urgencyHours?: number,
  financialImpact?: number,
): number {
  let s = KIND_BASE[kind];
  if (urgencyHours != null) {
    if (urgencyHours <= 24) s += 20;
    else if (urgencyHours <= 72) s += 10;
    else if (urgencyHours <= 168) s += 5;
  }
  if (financialImpact != null) {
    if (financialImpact >= 1000) s += 10;
    else if (financialImpact >= 500) s += 5;
  }
  return Math.min(100, s);
}

@Injectable()
export class TenantFeedService {
  private readonly logger = new Logger(TenantFeedService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getTenantFeed(
    userId: string,
  ): Promise<{ items: TenantFeedItem[]; generatedAt: string }> {
    const items: TenantFeedItem[] = [];

    try {
      const now = new Date();

      // ── Active lease ──────────────────────────────────────────────────────
      const lease = await this.prisma.lease.findFirst({
        where: {
          tenantId: userId,
          status: {
            in: [
              LeaseStatus.ACTIVE,
              LeaseStatus.RENEWAL_PENDING,
              LeaseStatus.NOTICE_GIVEN,
            ],
          },
        },
        include: {
          invoices: {
            where: { status: { in: ['UNPAID', 'OVERDUE'] } },
            orderBy: { dueDate: 'asc' },
            take: 5,
          },
          renewalOffers: {
            where: { status: LeaseRenewalStatus.OFFERED },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          esignEnvelopes: {
            where: {
              status: {
                in: [EsignEnvelopeStatus.SENT, EsignEnvelopeStatus.DELIVERED],
              },
            },
            orderBy: { createdAt: 'desc' },
            take: 1,
          },
          notices: {
            orderBy: { sentAt: 'desc' },
            take: 1,
          },
        },
      });

      if (lease) {
        const daysToExpiry = Math.ceil(
          (new Date(lease.endDate).getTime() - now.getTime()) / 86_400_000,
        );

        // Lease expiry warning
        if (daysToExpiry <= 60 && daysToExpiry > 0) {
          const urgencyHours = daysToExpiry * 24;
          const kind: TenantFeedItemKind =
            daysToExpiry <= 30 ? 'critical_signal' : 'decision';
          items.push({
            id: `lease-expiry-${lease.id}`,
            kind,
            domain: 'lease',
            title: `Lease expires in ${daysToExpiry} day${daysToExpiry === 1 ? '' : 's'}`,
            summary:
              daysToExpiry <= 30
                ? 'Your lease is expiring soon. Contact your property manager or respond to a renewal offer.'
                : 'Your lease is coming up for renewal. Review your options.',
            priority: score(kind, urgencyHours),
            timestamp: now.toISOString(),
            navigateTo: '/lease',
            urgencyHours,
          });
        }

        // Pending e-sign envelope
        if (lease.esignEnvelopes.length > 0) {
          const env = lease.esignEnvelopes[0];
          items.push({
            id: `esign-${env.id}`,
            kind: 'decision',
            domain: 'lease',
            title: 'Lease ready to sign',
            summary:
              'Your lease document is awaiting your electronic signature.',
            priority: score('decision', 48),
            timestamp: env.createdAt.toISOString(),
            navigateTo: '/lease',
          });
        }

        // Renewal offer
        if (lease.renewalOffers.length > 0) {
          const offer = lease.renewalOffers[0];
          items.push({
            id: `renewal-${offer.id}`,
            kind: 'decision',
            domain: 'renewal',
            title: 'Renewal offer received',
            summary: `New term offered at $${offer.proposedRent.toLocaleString()}/mo. Accept or decline.`,
            priority: score('decision', 72, offer.proposedRent),
            timestamp: offer.createdAt.toISOString(),
            navigateTo: '/lease',
            financialImpact: offer.proposedRent,
          });
        }

        // Overdue / upcoming invoices
        for (const invoice of lease.invoices) {
          const dueDate = new Date(invoice.dueDate);
          const hoursUntilDue =
            (dueDate.getTime() - now.getTime()) / 3_600_000;
          const isOverdue =
            invoice.status === 'OVERDUE' || hoursUntilDue < 0;
          const kind: TenantFeedItemKind = isOverdue
            ? 'critical_signal'
            : 'decision';
          const urgencyHours = isOverdue ? 0 : Math.max(0, hoursUntilDue);
          const daysLabel = Math.ceil(urgencyHours / 24);

          items.push({
            id: `invoice-${invoice.id}`,
            kind,
            domain: 'payments',
            title: isOverdue
              ? `Payment overdue — $${invoice.amount.toLocaleString()}`
              : `Rent due in ${daysLabel} day${daysLabel === 1 ? '' : 's'}`,
            summary: isOverdue
              ? `$${invoice.amount.toLocaleString()} was due on ${dueDate.toLocaleDateString()}. Pay now to avoid late fees.`
              : `$${invoice.amount.toLocaleString()} due on ${dueDate.toLocaleDateString()}.`,
            priority: score(kind, urgencyHours, invoice.amount),
            timestamp: invoice.issuedAt.toISOString(),
            navigateTo: '/payments',
            financialImpact: invoice.amount,
            urgencyHours: isOverdue ? 0 : urgencyHours,
          });
        }

        // Move-out notice
        if (lease.notices.length > 0) {
          const notice = lease.notices[0];
          // LeaseNotice has no moveOutDate field — use lease.moveOutAt if set
          if (lease.moveOutAt) {
            const daysToMoveOut = Math.ceil(
              (new Date(lease.moveOutAt).getTime() - now.getTime()) /
                86_400_000,
            );
            if (daysToMoveOut > 0 && daysToMoveOut <= 30) {
              items.push({
                id: `move-out-${notice.id}`,
                kind: 'scheduled_event',
                domain: 'move_out',
                title: `Move-out in ${daysToMoveOut} day${daysToMoveOut === 1 ? '' : 's'}`,
                summary: `Your move-out is scheduled for ${new Date(lease.moveOutAt).toLocaleDateString()}. Review the checklist.`,
                priority: score('scheduled_event', daysToMoveOut * 24),
                timestamp: notice.sentAt.toISOString(),
                navigateTo: '/move-out',
                urgencyHours: daysToMoveOut * 24,
              });
            }
          }
        }

        // ── Upcoming inspections (next 14 days) ──────────────────────────
        const twoWeeks = new Date(now.getTime() + 14 * 86_400_000);
        const inspections = await this.prisma.inspectionRequest.findMany({
          where: {
            leaseId: lease.id,
            status: InspectionRequestStatus.PENDING,
            createdAt: { gte: now, lte: twoWeeks },
          },
          orderBy: { createdAt: 'asc' },
          take: 3,
        });

        for (const insp of inspections) {
          const hoursUntil =
            (insp.createdAt.getTime() - now.getTime()) / 3_600_000;
          items.push({
            id: `inspection-${insp.id}`,
            kind: 'scheduled_event',
            domain: 'inspection',
            title: `Inspection scheduled — ${insp.type}`,
            summary: `Scheduled for ${insp.createdAt.toLocaleDateString()}. Ensure access is available.`,
            priority: score('scheduled_event', hoursUntil),
            timestamp: insp.createdAt.toISOString(),
            navigateTo: `/inspections/${insp.id}`,
            urgencyHours: hoursUntil,
          });
        }
      }

      // ── Maintenance requests ──────────────────────────────────────────────
      const maintenanceRequests = await this.prisma.maintenanceRequest.findMany(
        {
          where: {
            authorId: userId,
            status: { in: [Status.PENDING, Status.IN_PROGRESS, Status.COMPLETED] },
          },
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      );

      for (const req of maintenanceRequests) {
        if (
          req.priority === MaintenancePriority.EMERGENCY &&
          req.status === Status.PENDING
        ) {
          items.push({
            id: `maint-emergency-${req.id}`,
            kind: 'critical_signal',
            domain: 'maintenance',
            title: `Emergency request open — ${req.title}`,
            summary:
              'Your emergency maintenance request is being reviewed. We will contact you shortly.',
            priority: score('critical_signal', 6),
            timestamp: req.createdAt.toISOString(),
            navigateTo: `/maintenance/${req.id}`,
            urgencyHours: 6,
          });
        } else if (req.status === Status.COMPLETED) {
          items.push({
            id: `maint-complete-${req.id}`,
            kind: 'decision',
            domain: 'maintenance',
            title: `Repair completed — ${req.title}`,
            summary:
              'Your maintenance request has been marked complete. Confirm to close it out.',
            priority: score('decision', 72),
            timestamp: req.updatedAt.toISOString(),
            navigateTo: `/maintenance/${req.id}`,
          });
        } else if (req.status === Status.IN_PROGRESS) {
          items.push({
            id: `maint-inprogress-${req.id}`,
            kind: 'scheduled_event',
            domain: 'maintenance',
            title: `Repair in progress — ${req.title}`,
            summary: 'A technician is working on your request.',
            priority: score('scheduled_event', 48),
            timestamp: req.updatedAt.toISOString(),
            navigateTo: `/maintenance/${req.id}`,
          });
        }
      }

      // ── Recent messages (no readAt field — show latest from others) ──────
      const unreadMessages = await this.prisma.message.findMany({
        where: {
          conversation: {
            participants: { some: { userId } },
          },
          senderId: { not: userId },
        },
        orderBy: { createdAt: 'desc' },
        take: 3,
      });

      for (const msg of unreadMessages) {
        const preview =
          typeof msg.content === 'string'
            ? msg.content.slice(0, 80) +
              (msg.content.length > 80 ? '…' : '')
            : 'New message from your property manager.';
        items.push({
          id: `message-${msg.id}`,
          kind: 'update',
          domain: 'message',
          title: 'New message from PM',
          summary: preview,
          priority: score('update', 24),
          timestamp: msg.createdAt.toISOString(),
          navigateTo: `/messages/${msg.conversationId}`,
        });
      }
    } catch (err) {
      this.logger.error('Error building tenant feed', err);
    }

    const sorted = items.sort((a, b) => b.priority - a.priority).slice(0, 30);
    return { items: sorted, generatedAt: new Date().toISOString() };
  }
}
