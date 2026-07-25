import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { EsignEnvelopeStatus, EsignParticipantStatus, EsignProvider, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EsignatureService } from '../esignature/esignature.service';
import { VoidEnvelopeDto } from '../esignature/dto/void-envelope.dto';
import { AuditLogService } from '../shared/audit-log.service';

export interface OperatorEsignaturesActor {
  userId: string;
  username: string;
  role: Role;
}

export interface OperatorEsignaturesWorkbench {
  generatedAt: string;
  metrics: {
    totalEnvelopes: number;
    draft: number;
    sent: number;
    completed: number;
    voided: number;
    expired: number;
    declined: number;
    error: number;
  };
  envelopes: OperatorEsignatureEnvelopeItem[];
  riskQueue: OperatorEsignatureRiskItem[];
  recentActivity: OperatorEsignatureActivityItem[];
  sourceLinks: { label: string; href: string; entityType: string }[];
}

export interface OperatorEsignatureEnvelopeItem {
  id: number;
  providerEnvelopeId: string;
  provider: EsignProvider;
  status: EsignEnvelopeStatus;
  providerStatus: string | null;
  leaseId: string;
  propertyName: string | null;
  unitLabel: string | null;
  tenantName: string | null;
  tenantEmail: string | null;
  participantCount: number;
  pendingParticipantCount: number;
  createdAt: string;
  updatedAt: string;
  canonicalRoute: string;
}

export interface OperatorEsignatureRiskItem {
  envelopeId: number;
  leaseId: string;
  providerEnvelopeId: string;
  status: EsignEnvelopeStatus;
  providerStatus: string | null;
  propertyName: string | null;
  tenantName: string | null;
  tenantEmail: string | null;
  dueAt: string;
  hoursUntilDue: number;
  reminderCount: number;
  pendingParticipantsCount: number;
  pendingParticipants: { id: number; name: string; email: string; status: EsignParticipantStatus }[];
  riskLevel: 'OVERDUE' | 'CRITICAL' | 'HIGH' | 'MEDIUM';
}

export interface OperatorEsignatureActivityItem {
  envelopeId: number;
  leaseId: string;
  status: EsignEnvelopeStatus;
  providerStatus: string | null;
  propertyName: string | null;
  tenantName: string | null;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class OperatorEsignaturesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly esignatureService: EsignatureService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getWorkbench(
    orgId: string,
    _actor: { userId: string; role: Role },
    options: { propertyId?: string; status?: EsignEnvelopeStatus; limit?: number } = {},
  ): Promise<OperatorEsignaturesWorkbench> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);

    // Build where clause scoped to the organization via Lease → Unit → Property
    const where: Record<string, unknown> = {
      lease: {
        unit: {
          property: {
            organizationId: orgId,
            ...(options.propertyId ? { id: options.propertyId } : {}),
          },
        },
      },
    };

    if (options.status) {
      where['status'] = options.status;
    }

    const envelopes = await this.prisma.esignEnvelope.findMany({
      where,
      include: {
        participants: true,
        lease: {
          include: {
            tenant: true,
            unit: {
              include: {
                property: true,
              },
            },
          },
        },
        createdBy: {
          select: { id: true, username: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: limit,
    });

    const items = envelopes.map((envelope) => this.mapEnvelopeItem(envelope));

    // Compute status metrics
    const metrics = {
      totalEnvelopes: envelopes.length,
      draft: envelopes.filter((e) => e.status === EsignEnvelopeStatus.CREATED).length,
      sent: envelopes.filter((e) => e.status === EsignEnvelopeStatus.SENT || e.status === EsignEnvelopeStatus.DELIVERED).length,
      completed: envelopes.filter((e) => e.status === EsignEnvelopeStatus.COMPLETED).length,
      voided: envelopes.filter((e) => e.status === EsignEnvelopeStatus.VOIDED).length,
      expired: envelopes.filter((e) => e.status === EsignEnvelopeStatus.DECLINED).length,
      declined: envelopes.filter((e) => e.status === EsignEnvelopeStatus.DECLINED).length,
      error: envelopes.filter((e) => e.status === EsignEnvelopeStatus.ERROR).length,
    };

    // Risk queue: envelopes that are SENT or DELIVERED, sorted by urgency
    const riskItems = await this.getRiskQueue(orgId, limit);

    // Recent activity: last 20 envelopes by updatedAt
    const recentActivity = envelopes.slice(0, 20).map((envelope) => ({
      envelopeId: envelope.id,
      leaseId: envelope.leaseId,
      status: envelope.status,
      providerStatus: envelope.providerStatus,
      propertyName: envelope.lease?.unit?.property?.name ?? null,
      tenantName: envelope.lease?.tenant?.username ?? null,
      createdAt: envelope.createdAt.toISOString(),
      updatedAt: envelope.updatedAt.toISOString(),
    }));

    return {
      generatedAt: new Date().toISOString(),
      metrics,
      envelopes: items,
      riskQueue: riskItems,
      recentActivity,
      sourceLinks: [
        {
          label: 'Canonical e-signature API',
          href: '/api/esignature',
          entityType: 'EsignEnvelope',
        },
        {
          label: 'Operator e-signature workbench',
          href: '/api/operator-esignatures',
          entityType: 'EsignEnvelope',
        },
      ],
    };
  }

  async voidEnvelope(
    orgId: string,
    actor: { userId: string; username: string; role: Role },
    envelopeId: number,
    dto: VoidEnvelopeDto,
  ) {
    // Verify the envelope belongs to the org
    await this.assertEnvelopeInOrg(envelopeId, orgId);

    const result = await this.esignatureService.voidEnvelope(envelopeId, dto.reason, actor.userId);

    await this.recordOperatorAudit(orgId, actor.userId, 'ESIGN_ENVELOPE_VOIDED', envelopeId, {
      reason: dto.reason,
      providerEnvelopeId: result.providerEnvelopeId,
    });

    return result;
  }

  async resendEnvelope(
    orgId: string,
    actor: { userId: string; username: string; role: Role },
    envelopeId: number,
  ) {
    // Verify the envelope belongs to the org
    await this.assertEnvelopeInOrg(envelopeId, orgId);

    const result = await this.esignatureService.resendNotifications(envelopeId, actor.userId);

    await this.recordOperatorAudit(orgId, actor.userId, 'ESIGN_ENVELOPE_RESENT', envelopeId, {
      participantsNotified: (result as any).participantsNotified,
      reminderCount: (result as any).reminderCount,
    });

    return result;
  }

  // ─── Private helpers ────────────────────────────────────────────────

  private async assertEnvelopeInOrg(envelopeId: number, orgId: string): Promise<void> {
    const envelope = await this.prisma.esignEnvelope.findUnique({
      where: { id: envelopeId },
      include: {
        lease: {
          include: {
            unit: {
              include: { property: true },
            },
          },
        },
      },
    });

    if (!envelope) {
      throw new NotFoundException('Envelope not found.');
    }

    const property = envelope.lease?.unit?.property;
    if (!property || property.organizationId !== orgId) {
      throw new NotFoundException('Envelope not found.');
    }

    if (envelope.status === EsignEnvelopeStatus.COMPLETED) {
      throw new BadRequestException('Cannot modify a completed envelope.');
    }
  }

  private async getRiskQueue(orgId: string, limit: number): Promise<OperatorEsignatureRiskItem[]> {
    const envelopes = await this.prisma.esignEnvelope.findMany({
      where: {
        status: {
          in: [EsignEnvelopeStatus.SENT, EsignEnvelopeStatus.DELIVERED],
        },
        lease: {
          unit: {
            property: {
              organizationId: orgId,
            },
          },
        },
      },
      include: {
        participants: true,
        lease: {
          include: {
            tenant: true,
            unit: {
              include: { property: true },
            },
          },
        },
      },
      orderBy: { createdAt: 'asc' },
      take: Math.min(limit * 2, 200),
    });

    const now = new Date();
    const defaultDueHours = 72;

    const rows = envelopes
      .map((envelope) => {
        const metadata = (envelope.providerMetadata as Record<string, unknown>) || {};
        const dueAtIso =
          (metadata.dueAt as string) ||
          new Date(envelope.createdAt.getTime() + defaultDueHours * 3600000).toISOString();
        const dueAt = new Date(dueAtIso);
        const hoursUntilDue = (dueAt.getTime() - now.getTime()) / 3600000;
        const pendingParticipants = envelope.participants.filter(
          (p) => p.status !== EsignParticipantStatus.SIGNED && p.status !== EsignParticipantStatus.DECLINED,
        );

        return {
          envelopeId: envelope.id,
          leaseId: envelope.leaseId,
          providerEnvelopeId: envelope.providerEnvelopeId,
          status: envelope.status,
          providerStatus: envelope.providerStatus,
          propertyName: envelope.lease?.unit?.property?.name ?? null,
          tenantName: envelope.lease?.tenant?.username ?? null,
          tenantEmail: envelope.lease?.tenant?.email ?? null,
          dueAt: dueAt.toISOString(),
          hoursUntilDue,
          reminderCount: Number(metadata.reminderCount || 0),
          pendingParticipantsCount: pendingParticipants.length,
          pendingParticipants: pendingParticipants.map((p) => ({
            id: p.id,
            name: p.name,
            email: p.email,
            status: p.status,
          })),
          riskLevel:
            hoursUntilDue <= 0
              ? 'OVERDUE'
              : hoursUntilDue <= 4
                ? 'CRITICAL'
                : hoursUntilDue <= 24
                  ? 'HIGH'
                  : 'MEDIUM',
        } as OperatorEsignatureRiskItem;
      })
      .sort((a, b) => a.hoursUntilDue - b.hoursUntilDue)
      .slice(0, limit);

    return rows;
  }

  private mapEnvelopeItem(envelope: any): OperatorEsignatureEnvelopeItem {
    const pendingParticipants = (envelope.participants || []).filter(
      (p: any) => p.status !== EsignParticipantStatus.SIGNED && p.status !== EsignParticipantStatus.DECLINED,
    );

    return {
      id: envelope.id,
      providerEnvelopeId: envelope.providerEnvelopeId,
      provider: envelope.provider,
      status: envelope.status,
      providerStatus: envelope.providerStatus,
      leaseId: envelope.leaseId,
      propertyName: envelope.lease?.unit?.property?.name ?? null,
      unitLabel: envelope.lease?.unit?.unitNumber ?? envelope.lease?.unit?.name ?? null,
      tenantName: envelope.lease?.tenant?.username ?? null,
      tenantEmail: envelope.lease?.tenant?.email ?? null,
      participantCount: envelope.participants?.length ?? 0,
      pendingParticipantCount: pendingParticipants.length,
      createdAt: envelope.createdAt.toISOString(),
      updatedAt: envelope.updatedAt.toISOString(),
      canonicalRoute: `/api/operator-esignatures/envelopes/${envelope.id}`,
    };
  }

  private async recordOperatorAudit(
    orgId: string,
    actorId: string,
    action: string,
    envelopeId: number,
    metadata: Record<string, unknown>,
  ) {
    await this.auditLogService.record({
      orgId,
      actorId,
      module: 'operator-esignatures',
      action,
      entityType: 'EsignEnvelope',
      entityId: envelopeId,
      result: 'SUCCESS',
      metadata,
    });
  }
}
