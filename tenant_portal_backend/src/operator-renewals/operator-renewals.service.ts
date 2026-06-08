import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  EsignEnvelopeStatus,
  LeaseNoticeDeliveryMethod,
  LeaseNoticeType,
  LeaseRenewalStatus,
  LeaseStatus,
  LeaseTerminationParty,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LeaseService } from '../lease/lease.service';
import { RenewalDecision } from '../lease/dto/respond-renewal-offer.dto';
import { EsignatureService } from '../esignature/esignature.service';
import { AuditLogService } from '../shared/audit-log.service';
import {
  CreateRenewalOfferPayload,
  OperatorRenewalActor,
  OperatorRenewalItem,
  OperatorRenewalsWorkbench,
  RecordMoveOutPayload,
  RecordRenewalResponsePayload,
  SendRenewalSignaturePayload,
} from './operator-renewals.types';

type RenewalLease = Awaited<ReturnType<OperatorRenewalsService['findRenewalLeases']>>[number];

@Injectable()
export class OperatorRenewalsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaseService: LeaseService,
    private readonly esignatureService: EsignatureService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getWorkbench(
    orgId: string,
    _actor: OperatorRenewalActor,
    options: { propertyId?: string; days?: number; limit?: number } = {},
  ): Promise<OperatorRenewalsWorkbench> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const days = Math.min(Math.max(options.days ?? 120, 1), 365);
    const leases = await this.findRenewalLeases(orgId, options.propertyId, days, limit);
    const items = leases.map((lease) => this.mapLease(lease));

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        expiringLeases: items.length,
        needsOffer: items.filter((item) => item.nextAction === 'create_offer').length,
        offersPending: items.filter((item) => item.latestOffer?.status === LeaseRenewalStatus.OFFERED).length,
        offersAccepted: items.filter((item) => item.latestOffer?.status === LeaseRenewalStatus.ACCEPTED).length,
        signaturesPending: items.filter((item) => item.nextAction === 'monitor_signature').length,
        moveOutNotices: items.filter((item) => item.latestNotice?.type === LeaseNoticeType.MOVE_OUT).length,
      },
      leases: items,
      sourceLinks: [
        { label: 'Canonical lease API', href: '/api/leases', entityType: 'Lease' },
        { label: 'Renewal offers API', href: '/api/leases/{id}/renewal-offers', entityType: 'LeaseRenewalOffer' },
        { label: 'E-signature API', href: '/api/esignature/leases/{leaseId}/envelopes', entityType: 'EsignEnvelope' },
      ],
    };
  }

  async createOffer(orgId: string, actor: OperatorRenewalActor, leaseId: string, payload: CreateRenewalOfferPayload) {
    const lease = await this.getLeaseInOrg(orgId, leaseId);
    const proposedStart = payload.proposedStart ?? this.addDays(lease.endDate, 1).toISOString();
    const proposedEnd = payload.proposedEnd ?? this.addYears(this.addDays(lease.endDate, 1), 1).toISOString();
    const result = await this.leaseService.createRenewalOffer(
      leaseId,
      {
        proposedRent: payload.proposedRent ?? Number(lease.rentAmount),
        proposedStart,
        proposedEnd,
        escalationPercent: payload.escalationPercent,
        message: payload.message,
        expiresAt: payload.expiresAt ?? lease.renewalDueAt?.toISOString() ?? this.addDays(lease.endDate, -30).toISOString(),
      },
      actor.userId,
      orgId,
    );
    await this.recordAudit(orgId, actor.userId, 'RENEWAL_OFFER_CREATED_BY_OPERATOR', leaseId, {
      proposedRent: payload.proposedRent ?? Number(lease.rentAmount),
    });
    return result;
  }

  async recordResponse(
    orgId: string,
    actor: OperatorRenewalActor,
    leaseId: string,
    offerId: number,
    payload: RecordRenewalResponsePayload,
  ) {
    const lease = await this.getLeaseInOrg(orgId, leaseId);
    const result = await this.leaseService.respondToRenewalOffer(
      leaseId,
      offerId,
      { decision: payload.decision as RenewalDecision, message: payload.message },
      lease.tenantId,
      orgId,
    );
    await this.recordAudit(orgId, actor.userId, 'RENEWAL_RESPONSE_RECORDED_BY_OPERATOR', leaseId, {
      offerId,
      tenantId: lease.tenantId,
      decision: payload.decision,
    });
    return result;
  }

  async sendSignature(orgId: string, actor: OperatorRenewalActor, leaseId: string, payload: SendRenewalSignaturePayload) {
    const lease = await this.getLeaseInOrg(orgId, leaseId);
    if (!lease.tenant.email && !payload.signerEmail) {
      throw new BadRequestException('Tenant email is required before sending renewal signature envelope.');
    }
    const envelope = await this.esignatureService.createEnvelope(
      leaseId,
      {
        templateId: payload.templateId ?? 'LEASE_RENEWAL_V1',
        message: payload.message ?? `Please review and sign your lease renewal for ${lease.unit?.property?.name ?? 'your property'}.`,
        recipients: [
          {
            name: payload.signerName ?? lease.tenant.username,
            email: payload.signerEmail ?? lease.tenant.email!,
            role: 'TENANT',
            userId: lease.tenantId,
          },
        ],
      },
      actor.userId,
    );
    await this.recordAudit(orgId, actor.userId, 'RENEWAL_SIGNATURE_SENT', leaseId, {
      envelopeId: envelope.id,
    });
    return envelope;
  }

  async refreshEnvelope(orgId: string, actor: OperatorRenewalActor, envelopeId: number) {
    const envelope = await this.prisma.esignEnvelope.findUnique({ where: { id: envelopeId } });
    if (!envelope) throw new NotFoundException('Envelope not found.');
    await this.getLeaseInOrg(orgId, envelope.leaseId);
    const result = await this.esignatureService.refreshEnvelopeStatus(envelopeId, {
      userId: actor.userId,
      role: actor.role,
    });
    await this.recordAudit(orgId, actor.userId, 'RENEWAL_SIGNATURE_REFRESHED', envelope.leaseId, {
      envelopeId,
      status: result.status,
    });
    return result;
  }

  async recordMoveOut(orgId: string, actor: OperatorRenewalActor, leaseId: string, payload: RecordMoveOutPayload) {
    const moveOutAt = new Date(payload.moveOutAt);
    if (Number.isNaN(moveOutAt.getTime())) {
      throw new BadRequestException('moveOutAt must be a valid date.');
    }
    await this.getLeaseInOrg(orgId, leaseId);
    await this.leaseService.recordLeaseNotice(
      leaseId,
      {
        type: LeaseNoticeType.MOVE_OUT,
        deliveryMethod: payload.deliveryMethod ?? LeaseNoticeDeliveryMethod.PORTAL,
        message: payload.message ?? `Move-out planned for ${moveOutAt.toISOString().slice(0, 10)}.`,
        acknowledgedAt: new Date().toISOString(),
      },
      actor.userId,
      orgId,
    );
    const result = await this.leaseService.updateLease(
      leaseId,
      {
        moveOutAt: moveOutAt.toISOString(),
        terminationEffectiveAt: moveOutAt.toISOString(),
        terminationRequestedBy: LeaseTerminationParty.TENANT,
        terminationReason: payload.message ?? 'Move-out selected during renewal workflow.',
      } as any,
      actor.userId,
      orgId,
    );
    await this.recordAudit(orgId, actor.userId, 'MOVE_OUT_RECORDED_FROM_RENEWAL_WORKFLOW', leaseId, {
      moveOutAt: moveOutAt.toISOString(),
    });
    return result;
  }

  private async findRenewalLeases(orgId: string, propertyId: string | undefined, days: number, limit: number) {
    const now = new Date();
    const end = this.addDays(now, days);
    return this.prisma.lease.findMany({
      where: {
        status: { in: [LeaseStatus.ACTIVE, LeaseStatus.RENEWAL_PENDING, LeaseStatus.NOTICE_GIVEN] },
        endDate: { gte: now, lte: end },
        unit: {
          property: {
            organizationId: orgId,
            ...(propertyId ? { id: propertyId } : {}),
          },
        },
      },
      include: {
        tenant: { select: { id: true, username: true, email: true } },
        unit: { include: { property: true } },
        renewalOffers: { orderBy: { createdAt: 'desc' }, take: 3 },
        notices: { orderBy: { sentAt: 'desc' }, take: 3 },
        esignEnvelopes: { include: { participants: true }, orderBy: { createdAt: 'desc' }, take: 3 },
      },
      orderBy: { endDate: 'asc' },
      take: limit,
    });
  }

  private async getLeaseInOrg(orgId: string, leaseId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, unit: { property: { organizationId: orgId } } },
      include: { tenant: true, unit: { include: { property: true } }, renewalOffers: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!lease) throw new NotFoundException('Lease not found.');
    return lease;
  }

  private mapLease(lease: RenewalLease): OperatorRenewalItem {
    const latestOffer = lease.renewalOffers[0] ?? null;
    const latestEnvelope = lease.esignEnvelopes[0] ?? null;
    const latestNotice = lease.notices[0] ?? null;
    const blockers = [lease.tenant.email ? null : 'Tenant email is missing.'].filter(Boolean) as string[];
    return {
      leaseId: lease.id,
      leaseStatus: lease.status,
      tenantId: lease.tenantId,
      tenantName: lease.tenant?.username ?? 'Tenant',
      tenantEmail: lease.tenant?.email ?? null,
      propertyId: lease.unit?.property?.id ?? null,
      propertyName: lease.unit?.property?.name ?? null,
      unitId: lease.unitId,
      unitLabel: lease.unit?.unitNumber ?? lease.unit?.name ?? lease.unitId,
      currentRent: lease.rentAmount,
      endDate: lease.endDate.toISOString(),
      renewalDueAt: lease.renewalDueAt?.toISOString() ?? null,
      moveOutAt: lease.moveOutAt?.toISOString() ?? null,
      latestOffer: latestOffer
        ? {
            id: latestOffer.id,
            proposedRent: latestOffer.proposedRent,
            proposedStart: latestOffer.proposedStart.toISOString(),
            proposedEnd: latestOffer.proposedEnd.toISOString(),
            status: latestOffer.status,
            expiresAt: latestOffer.expiresAt?.toISOString() ?? null,
            respondedAt: latestOffer.respondedAt?.toISOString() ?? null,
          }
        : null,
      latestEnvelope: latestEnvelope
        ? {
            id: latestEnvelope.id,
            status: latestEnvelope.status,
            providerStatus: latestEnvelope.providerStatus ?? null,
            participants: latestEnvelope.participants.map((participant) => ({
              id: participant.id,
              name: participant.name,
              email: participant.email,
              status: participant.status,
            })),
          }
        : null,
      latestNotice: latestNotice
        ? {
            id: latestNotice.id,
            type: latestNotice.type,
            sentAt: latestNotice.sentAt.toISOString(),
            message: latestNotice.message ?? null,
          }
        : null,
      nextAction: this.getNextAction(latestOffer, latestEnvelope, latestNotice, blockers),
      blockers,
      canonicalRoute: `/api/operator-renewals/leases/${lease.id}`,
    };
  }

  private getNextAction(
    latestOffer: RenewalLease['renewalOffers'][number] | null,
    latestEnvelope: RenewalLease['esignEnvelopes'][number] | null,
    latestNotice: RenewalLease['notices'][number] | null,
    blockers: string[],
  ): OperatorRenewalItem['nextAction'] {
    if (latestNotice?.type === LeaseNoticeType.MOVE_OUT) return 'move_out';
    if (!latestOffer) return 'create_offer';
    if (latestOffer.status === LeaseRenewalStatus.OFFERED) return 'await_response';
    if (latestOffer.status === LeaseRenewalStatus.DECLINED) return 'move_out';
    if (latestEnvelope?.status === EsignEnvelopeStatus.COMPLETED) return 'complete';
    if (latestEnvelope && [EsignEnvelopeStatus.CREATED, EsignEnvelopeStatus.SENT, EsignEnvelopeStatus.DELIVERED].includes(latestEnvelope.status as any)) return 'monitor_signature';
    if (blockers.length > 0) return 'blocked';
    if (latestOffer.status === LeaseRenewalStatus.ACCEPTED) return 'send_signature';
    return 'complete';
  }

  private addDays(date: Date, days: number) {
    return new Date(date.getTime() + days * 86400000);
  }

  private addYears(date: Date, years: number) {
    const next = new Date(date);
    next.setFullYear(next.getFullYear() + years);
    return next;
  }

  private async recordAudit(orgId: string, actorId: string, action: string, leaseId: string, metadata: Record<string, unknown>) {
    await this.auditLogService.record({
      orgId,
      actorId,
      module: 'operator-renewals',
      action,
      entityType: 'Lease',
      entityId: leaseId,
      result: 'SUCCESS',
      metadata,
    });
  }
}
