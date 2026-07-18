import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DocumentCategory, EsignEnvelopeStatus, EsignParticipantStatus, LeaseStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { LeaseService } from '../lease/lease.service';
import { EsignatureService } from '../esignature/esignature.service';
import { AuditLogService } from '../shared/audit-log.service';
import {
  OperatorLeaseSigningActor,
  OperatorLeaseSigningEnvelope,
  OperatorLeaseSigningItem,
  OperatorLeaseSigningWorkbench,
  SendLeaseEnvelopePayload,
} from './operator-lease-signing.types';

type LeaseWithSigning = Awaited<ReturnType<OperatorLeaseSigningService['findSigningLeases']>>[number];

@Injectable()
export class OperatorLeaseSigningService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly leaseService: LeaseService,
    private readonly esignatureService: EsignatureService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getWorkbench(
    orgId: string,
    _actor: OperatorLeaseSigningActor,
    options: { propertyId?: string; status?: LeaseStatus; limit?: number } = {},
  ): Promise<OperatorLeaseSigningWorkbench> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const [leases, riskQueue] = await Promise.all([
      this.findSigningLeases(orgId, options.propertyId, options.status, limit),
      this.esignatureService.getSignatureRiskQueue(25, 72).catch((error) => ({
        unavailable: true,
        reason: error?.message ?? 'Signature risk queue unavailable',
      })),
    ]);
    const items = leases.map((lease) => this.mapItem(lease));

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        draftLeases: items.filter((item) => item.leaseStatus === LeaseStatus.DRAFT).length,
        packetsReady: items.filter((item) => item.documentCount > 0 && !item.latestEnvelope).length,
        envelopesSent: items.filter((item) =>
          item.latestEnvelope?.status === EsignEnvelopeStatus.SENT ||
          item.latestEnvelope?.status === EsignEnvelopeStatus.DELIVERED,
        ).length,
        signaturesCompleted: items.filter((item) => item.latestEnvelope?.status === EsignEnvelopeStatus.COMPLETED).length,
        signingBlocked: items.filter((item) => item.blockers.length > 0).length,
        riskItems: typeof riskQueue === 'object' && riskQueue !== null && 'count' in riskQueue ? Number((riskQueue as any).count ?? 0) : 0,
      },
      items,
      riskQueue,
      sourceLinks: [
        { label: 'Canonical leases API', href: '/api/leases', entityType: 'Lease' },
        { label: 'Canonical e-signature API', href: '/api/esignature/leases/{leaseId}/envelopes', entityType: 'EsignEnvelope' },
      ],
    };
  }

  async generatePacket(orgId: string, actor: OperatorLeaseSigningActor, leaseId: string) {
    await this.assertLeaseInOrg(orgId, leaseId);
    const result = await this.leaseService.generateLeaseDocument(leaseId, actor.userId, orgId);
    await this.recordAudit(orgId, actor.userId, 'LEASE_PACKET_GENERATED', leaseId, result);
    return result;
  }

  async sendEnvelope(
    orgId: string,
    actor: Required<Pick<OperatorLeaseSigningActor, 'userId' | 'role'>>,
    leaseId: string,
    payload: SendLeaseEnvelopePayload,
  ) {
    const lease = await this.getLeaseForAction(orgId, leaseId);
    const signerEmail = payload.signerEmail ?? lease.tenant.email;
    const signerName = payload.signerName ?? lease.tenant.email;

    if (!signerEmail) {
      throw new BadRequestException('Tenant email is required before sending lease for signature.');
    }

    const envelope = await this.esignatureService.createEnvelope(
      leaseId,
      {
        templateId: payload.templateId ?? 'LEASE_PACKET_V1',
        message: payload.message ?? `Please review and sign your lease for ${lease.unit?.property?.name ?? 'your property'}.`,
        provider: payload.provider as any,
        recipients: [
          {
            name: signerName,
            email: signerEmail,
            role: 'TENANT',
            userId: lease.tenantId,
          },
        ],
      },
      actor.userId,
    );
    await this.recordAudit(orgId, actor.userId, 'LEASE_ENVELOPE_SENT', leaseId, {
      envelopeId: envelope.id,
      providerEnvelopeId: envelope.providerEnvelopeId,
    });
    return envelope;
  }

  async refreshEnvelope(orgId: string, actor: Required<Pick<OperatorLeaseSigningActor, 'userId' | 'role'>>, envelopeId: number) {
    const envelope = await this.prisma.esignEnvelope.findUnique({ where: { id: envelopeId } });
    if (!envelope) throw new NotFoundException('Envelope not found.');
    await this.assertLeaseInOrg(orgId, envelope.leaseId);
    const result = await this.esignatureService.refreshEnvelopeStatus(envelopeId, actor);
    await this.recordAudit(orgId, actor.userId, 'LEASE_ENVELOPE_REFRESHED', envelope.leaseId, {
      envelopeId,
      status: result.status,
    });
    return result;
  }

  async resendEnvelope(orgId: string, actorId: string, envelopeId: number) {
    const envelope = await this.prisma.esignEnvelope.findUnique({ where: { id: envelopeId } });
    if (!envelope) throw new NotFoundException('Envelope not found.');
    await this.assertLeaseInOrg(orgId, envelope.leaseId);
    const result = await this.esignatureService.resendNotifications(envelopeId, actorId);
    await this.recordAudit(orgId, actorId, 'LEASE_ENVELOPE_RESENT', envelope.leaseId, { envelopeId });
    return result;
  }

  private async findSigningLeases(orgId: string, propertyId?: string, status?: LeaseStatus, limit = 50) {
    return this.prisma.lease.findMany({
      where: {
        ...(status ? { status } : { status: { in: [LeaseStatus.DRAFT, LeaseStatus.PENDING_APPROVAL, LeaseStatus.ACTIVE] } }),
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
        generalDocuments: { where: { category: DocumentCategory.LEASE }, orderBy: { createdAt: 'desc' }, take: 3 },
        documents: { orderBy: { createdAt: 'desc' }, take: 3 },
        esignEnvelopes: {
          include: { participants: true },
          orderBy: { createdAt: 'desc' },
          take: 3,
        },
      },
      orderBy: [{ updatedAt: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  private async getLeaseForAction(orgId: string, leaseId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, unit: { property: { organizationId: orgId } } },
      include: {
        tenant: true,
        unit: { include: { property: true } },
        generalDocuments: { where: { category: DocumentCategory.LEASE }, orderBy: { createdAt: 'desc' }, take: 1 },
        documents: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!lease) throw new NotFoundException('Lease not found.');
    return lease;
  }

  private async assertLeaseInOrg(orgId: string, leaseId: string) {
    const lease = await this.prisma.lease.findFirst({
      where: { id: leaseId, unit: { property: { organizationId: orgId } } },
      select: { id: true },
    });
    if (!lease) throw new NotFoundException('Lease not found.');
  }

  private mapItem(lease: LeaseWithSigning): OperatorLeaseSigningItem {
    const latestEnvelope = lease.esignEnvelopes[0] ? this.mapEnvelope(lease.esignEnvelopes[0]) : null;
    const documentCount = lease.generalDocuments.length + lease.documents.length;
    const blockers = [
      lease.tenant?.email ? null : 'Tenant email is missing.',
      lease.tenantId ? null : 'Lease has no tenant.',
      lease.unitId ? null : 'Lease has no unit.',
    ].filter(Boolean) as string[];

    return {
      leaseId: lease.id,
      leaseStatus: lease.status,
      tenantId: lease.tenantId,
      tenantName: lease.tenant?.email ?? 'Tenant',
      tenantEmail: lease.tenant?.email ?? null,
      propertyId: lease.unit?.property?.id ?? null,
      propertyName: lease.unit?.property?.name ?? null,
      unitId: lease.unitId,
      unitLabel: lease.unit?.unitNumber ?? lease.unit?.name ?? lease.unitId,
      startDate: lease.startDate.toISOString(),
      endDate: lease.endDate.toISOString(),
      rentAmount: lease.rentAmountCents != null ? lease.rentAmountCents / 100 : 0,
      depositAmount: lease.depositAmount,
      documentCount,
      latestEnvelope,
      nextAction: this.getNextAction(lease.status, documentCount, latestEnvelope, blockers),
      blockers,
      canonicalRoute: `/api/operator-lease-signing/leases/${lease.id}`,
    };
  }

  private mapEnvelope(envelope: LeaseWithSigning['esignEnvelopes'][number]): OperatorLeaseSigningEnvelope {
    return {
      id: envelope.id,
      providerEnvelopeId: envelope.providerEnvelopeId,
      status: envelope.status,
      providerStatus: envelope.providerStatus ?? null,
      createdAt: envelope.createdAt.toISOString(),
      updatedAt: envelope.updatedAt.toISOString(),
      signedPdfDocumentId: envelope.signedPdfDocumentId ?? null,
      auditTrailDocumentId: envelope.auditTrailDocumentId ?? null,
      canonicalRoute: `/api/esignature/envelopes/${envelope.id}`,
      participants: envelope.participants.map((participant) => ({
        id: participant.id,
        name: participant.name,
        email: participant.email,
        role: participant.role,
        status: participant.status,
        userId: participant.userId ?? null,
      })),
    };
  }

  private getNextAction(
    leaseStatus: LeaseStatus,
    documentCount: number,
    latestEnvelope: OperatorLeaseSigningEnvelope | null,
    blockers: string[],
  ): OperatorLeaseSigningItem['nextAction'] {
    if (blockers.length > 0) return 'blocked';
    if (latestEnvelope?.status === EsignEnvelopeStatus.COMPLETED || leaseStatus === LeaseStatus.ACTIVE) return 'complete';
    if (
      latestEnvelope &&
      (
        latestEnvelope.status === EsignEnvelopeStatus.SENT ||
        latestEnvelope.status === EsignEnvelopeStatus.DELIVERED ||
        latestEnvelope.status === EsignEnvelopeStatus.CREATED
      )
    ) return 'monitor_signature';
    if (documentCount === 0) return 'generate_packet';
    return 'send_for_signature';
  }

  private async recordAudit(orgId: string, actorId: string, action: string, leaseId: string, metadata: Record<string, unknown>) {
    await this.auditLogService.record({
      orgId,
      actorId,
      module: 'operator-lease-signing',
      action,
      entityType: 'Lease',
      entityId: leaseId,
      result: 'SUCCESS',
      metadata,
    });
  }
}
