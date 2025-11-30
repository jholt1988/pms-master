import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { DocumentCategory, EsignEnvelope, EsignEnvelopeStatus, EsignParticipantStatus, EsignProvider, Prisma, Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosInstance } from 'axios';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreateEnvelopeDto } from './dto/create-envelope.dto';
import { ProviderWebhookDto, ProviderWebhookDocumentDto } from './dto/provider-webhook.dto';
import { RecipientViewDto } from './dto/recipient-view.dto';

interface ProviderRecipient {
  email: string;
  recipientId?: string;
  status?: string;
}

interface ProviderEnvelopeResponse {
  envelopeId: string;
  status: EsignEnvelopeStatus;
  providerStatus: string;
  metadata: Record<string, unknown>;
  recipients: ProviderRecipient[];
}

@Injectable()
export class EsignatureService {
  private readonly logger = new Logger(EsignatureService.name);
  private readonly httpClient: AxiosInstance;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly documentsService: DocumentsService,
    private readonly notificationsService: NotificationsService,
  ) {
    this.httpClient = axios.create({
      baseURL: this.configService.get<string>('ESIGN_PROVIDER_BASE_URL',process.env.ESIGN_PROVIDER_BASE_URL ),
    });
  }

  async createEnvelope(leaseId: number, dto: CreateEnvelopeDto, actorId: number) {
    if (!dto.recipients?.length) {
      throw new BadRequestException('At least one recipient is required.');
    }

    const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: { tenant: true, unit: { include: { property: true } } },
    });

    if (!lease) {
      throw new NotFoundException('Lease not found.');
    }

    const provider = dto.provider ?? (this.configService.get('ESIGN_PROVIDER') as EsignProvider) ?? EsignProvider.DOCUSIGN;
    const providerResponse = await this.dispatchProviderEnvelope(provider, dto, lease);

    const envelope = (await this.prisma.esignEnvelope.create({
      data: {
        leaseId,
        createdById: actorId,
        provider,
        providerEnvelopeId: providerResponse.envelopeId,
        status: providerResponse.status,
        providerStatus: providerResponse.providerStatus,
        providerMetadata: providerResponse.metadata as Prisma.JsonValue,
        participants: {
          create: dto.recipients.map((recipient) => ({
            name: recipient.name,
            email: recipient.email,
            phone: recipient.phone,
            role: recipient.role,
            userId: recipient.userId,
            status: EsignParticipantStatus.SENT,
            recipientId: providerResponse.recipients.find((entry) => entry.email === recipient.email)?.recipientId,
          })),
        },
      },
      include: { participants: true },
    })) as EsignEnvelope & { participants: { id: number; name: string; email: string; phone?: string | null; userId?: number | null; status: EsignParticipantStatus }[] };

    await Promise.all(
      envelope.participants.map((participant) =>
        this.notificationsService.sendSignatureAlert({
          event: 'REQUESTED',
          envelopeId: envelope.id,
          leaseId,
          participantName: participant.name,
          userId: participant.userId ?? undefined,
          email: participant.email,
          phone: participant.phone ?? undefined,
        }),
      ),
    );

    return envelope;
  }

  async listLeaseEnvelopes(leaseId: number, user: { userId: number; role: Role }) {
    const lease = await this.prisma.lease.findUnique({ where: { id: leaseId } });
    if (!lease) {
      throw new NotFoundException('Lease not found.');
    }

    if (user.role === Role.TENANT && lease.tenantId !== user.userId) {
      throw new ForbiddenException('You are not allowed to view this lease.');
    }

    return this.prisma.esignEnvelope.findMany({
      where: { leaseId },
      include: { participants: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createRecipientView(envelopeId: number, user: { userId: number; role: Role }, dto: RecipientViewDto) {
    const participant = await this.prisma.esignParticipant.findFirst({
      where: { envelopeId, userId: user.userId },
      include: { envelope: true },
    });

    if (!participant) {
      throw new ForbiddenException('You are not assigned to this envelope.');
    }

    const url = await this.requestRecipientView(participant.envelope, participant.recipientId, dto.returnUrl);

    await this.prisma.esignParticipant.update({
      where: { id: participant.id },
      data: { recipientUrl: url, status: EsignParticipantStatus.VIEWED },
    });

    return { url };
  }

  async handleProviderWebhook(payload: ProviderWebhookDto) {
    const envelope = await this.prisma.esignEnvelope.findFirst({
      where: { providerEnvelopeId: payload.envelopeId },
      include: { participants: true },
    });

    if (!envelope) {
      this.logger.warn(`Received webhook for unknown envelope ${payload.envelopeId}`);
      return { ignored: true };
    }

    const status = this.mapEnvelopeStatus(payload.status);
    const data: Prisma.EsignEnvelopeUpdateInput = {
      providerStatus: payload.status,
      providerMetadata: (payload.metadata ?? payload) as Prisma.JsonValue,
      ...(status && { status }),
    };

    const updated = await this.prisma.esignEnvelope.update({
      where: { id: envelope.id },
      data,
      include: { participants: true },
    });

    if (payload.participants?.length) {
      await Promise.all(
        payload.participants.map((participant) =>
          this.prisma.esignParticipant.updateMany({
            where: { envelopeId: envelope.id, email: participant.email },
            data: { status: this.mapParticipantStatus(participant.status) ?? EsignParticipantStatus.SENT },
          }),
        ),
      );
    }

    if (status === EsignEnvelopeStatus.COMPLETED && payload.documents?.length) {
      await this.attachFinalDocuments(updated, payload.documents);

      await Promise.all(
        updated.participants.map((participant) =>
          this.notificationsService.sendSignatureAlert({
            event: 'COMPLETED',
            envelopeId: updated.id,
            leaseId: updated.leaseId,
            participantName: participant.name,
            userId: participant.userId ?? undefined,
            email: participant.email,
            phone: participant.phone ?? undefined,
          }),
        ),
      );
    }

    return { success: true };
  }

  private async attachFinalDocuments(envelope: EsignEnvelope & { participants: { id: number }[] }, documents: ProviderWebhookDocumentDto[]) {
    const combined = documents.find((doc) => (doc.type ?? '').toLowerCase().includes('certificate') === false);
    const certificate = documents.find((doc) => (doc.type ?? '').toLowerCase().includes('certificate'));

    const updateData: Prisma.EsignEnvelopeUpdateInput = {};

    if (combined?.contentBase64) {
      const buffer = Buffer.from(combined.contentBase64, 'base64');
      const document = await this.documentsService.saveBuffer(buffer, {
        fileName: combined.name || `lease-${envelope.leaseId}-signed.pdf`,
        userId: envelope.createdById,
        category: DocumentCategory.LEASE,
        description: 'Signed lease PDF',
        leaseId: envelope.leaseId,
        mimeType: 'application/pdf',
      });
      updateData.signedPdfDocument = {
        connect: { id: document.id },
      };
    }

    if (certificate?.contentBase64) {
      const buffer = Buffer.from(certificate.contentBase64, 'base64');
      const document = await this.documentsService.saveBuffer(buffer, {
        fileName: certificate.name || `lease-${envelope.leaseId}-certificate.pdf`,
        userId: envelope.createdById,
        category: DocumentCategory.LEASE,
        description: 'Signature audit trail',
        leaseId: envelope.leaseId,
        mimeType: 'application/pdf',
      });
      updateData.auditTrailDocument = {
        connect: { id: document.id },
      };
    }

    if (Object.keys(updateData).length > 0) {
      await this.prisma.esignEnvelope.update({
        where: { id: envelope.id },
        data: updateData,
      });
    }
  }

  private async dispatchProviderEnvelope(
    provider: EsignProvider,
    dto: CreateEnvelopeDto,
    lease: any,
  ): Promise<ProviderEnvelopeResponse> {
    const payload = {
      templateId: dto.templateId,
      message: dto.message,
      lease: {
        id: lease.id,
        tenant: lease.tenant,
        unit: lease.unit,
      },
      recipients: dto.recipients,
    };

    try {
      const response = await this.httpClient.request<{ envelopeId: string; status: string; recipients?: ProviderRecipient[] }>({
        method: 'POST',
        url: '/envelopes',
        data: payload,
        headers: this.buildProviderHeaders(provider),
      });

      return {
        envelopeId: response.data.envelopeId,
        status: this.mapEnvelopeStatus(response.data.status) ?? EsignEnvelopeStatus.SENT,
        providerStatus: response.data.status,
        recipients: response.data.recipients ?? [],
        metadata: response.data as Record<string, unknown>,
      };
    } catch (error) {
      this.logger.warn(`Provider request failed, using mock envelope. Error: ${error}`);
      return {
        envelopeId: randomUUID(),
        status: EsignEnvelopeStatus.SENT,
        providerStatus: 'SENT',
        recipients: dto.recipients.map((recipient, index) => ({
          email: recipient.email,
          recipientId: `recipient-${index}`,
        })),
        metadata: payload,
      };
    }
  }

  private async requestRecipientView(envelope: EsignEnvelope, recipientId: string | null | undefined, returnUrl: string) {
    if (!recipientId) {
      return `${returnUrl}?envelope=${envelope.providerEnvelopeId}`;
    }

    try {
      const response = await this.httpClient.request<{ url: string }>({
        method: 'POST',
        url: `/envelopes/${envelope.providerEnvelopeId}/views/recipient`,
        data: {
          recipientId,
          returnUrl,
        },
        headers: this.buildProviderHeaders(envelope.provider),
      });
      return response.data.url;
    } catch (error) {
      this.logger.warn(`Failed to fetch recipient view URL, falling back. Error: ${error}`);
      return `${returnUrl}?envelope=${envelope.providerEnvelopeId}&recipient=${recipientId}`;
    }
  }

  private mapEnvelopeStatus(status?: string): EsignEnvelopeStatus | undefined {
    if (!status) {
      return undefined;
    }

    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'CREATED':
        return EsignEnvelopeStatus.CREATED;
      case 'SENT':
      case 'IN_PROGRESS':
        return EsignEnvelopeStatus.SENT;
      case 'DELIVERED':
        return EsignEnvelopeStatus.DELIVERED;
      case 'COMPLETED':
        return EsignEnvelopeStatus.COMPLETED;
      case 'DECLINED':
        return EsignEnvelopeStatus.DECLINED;
      case 'VOIDED':
        return EsignEnvelopeStatus.VOIDED;
      default:
        return EsignEnvelopeStatus.ERROR;
    }
  }

  private mapParticipantStatus(status?: string): EsignParticipantStatus | undefined {
    if (!status) {
      return undefined;
    }

    const normalized = status.toUpperCase();
    switch (normalized) {
      case 'CREATED':
        return EsignParticipantStatus.CREATED;
      case 'SENT':
      case 'DELIVERED':
        return EsignParticipantStatus.SENT;
      case 'COMPLETED':
      case 'SIGNED':
        return EsignParticipantStatus.SIGNED;
      case 'DECLINED':
        return EsignParticipantStatus.DECLINED;
      case 'VIEWED':
        return EsignParticipantStatus.VIEWED;
      default:
        return EsignParticipantStatus.ERROR;
    }
  }

  private buildProviderHeaders(provider: EsignProvider) {
    const token = this.configService.get<string>('ESIGN_PROVIDER_API_KEY');
    const accountId = this.configService.get<string>('ESIGN_PROVIDER_ACCOUNT_ID');
    const headers: Record<string, string> = {};

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    if (accountId) {
      headers['X-Esign-Account'] = accountId;
    }

    headers['X-Esign-Provider'] = provider;

    return headers;
  }
}
