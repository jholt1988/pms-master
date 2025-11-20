import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { EsignEnvelopeStatus, EsignParticipantStatus, EsignProvider } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EsignatureService } from './esignature.service';
import { CreateEnvelopeDto } from './dto/create-envelope.dto';
import { ProviderWebhookDto } from './dto/provider-webhook.dto';

jest.mock('axios');

const mockAxiosInstance = {
  request: jest.fn(),
};

(axios.create as jest.Mock).mockReturnValue(mockAxiosInstance);

describe('EsignatureService', () => {
  let service: EsignatureService;
  let prisma: PrismaService;
  let config: ConfigService;
  let documents: DocumentsService;
  let notifications: NotificationsService;

  beforeEach(() => {
    prisma = {
      lease: { findUnique: jest.fn() },
      esignEnvelope: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
      esignParticipant: { findFirst: jest.fn(), updateMany: jest.fn(), update: jest.fn() },
    } as any;

    config = {
      get: jest.fn().mockReturnValue('test'),
    } as any;

    documents = {
      saveBuffer: jest.fn(),
    } as any;

    notifications = {
      sendSignatureAlert: jest.fn(),
    } as any;

    mockAxiosInstance.request.mockReset();

    service = new EsignatureService(prisma, config, documents, notifications);
  });

  describe('createEnvelope', () => {
    it('creates envelope records and notifies participants even when provider fails', async () => {
      const dto: CreateEnvelopeDto = {
        templateId: 'tmpl-123',
        message: 'Sign please',
        recipients: [
          { name: 'Tenant', email: 'tenant@test.com', role: 'TENANT', userId: 42 },
        ],
      };

      (prisma.lease.findUnique as jest.Mock).mockResolvedValue({
        id: 1,
        tenant: { id: 42 },
        unit: {},
      });
      mockAxiosInstance.request.mockRejectedValue(new Error('network'));
      (prisma.esignEnvelope.create as jest.Mock).mockResolvedValue({
        id: 99,
        participants: [{ id: 1, name: 'Tenant', email: 'tenant@test.com' }],
      });

      const envelope = await service.createEnvelope(1, dto, 7);

      expect(envelope.id).toBe(99);
      expect(prisma.esignEnvelope.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ leaseId: 1, createdById: 7 }),
        }),
      );
      expect(notifications.sendSignatureAlert).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'REQUESTED', envelopeId: 99 }),
      );
    });
  });

  describe('handleProviderWebhook', () => {
    it('updates status, stores documents, and notifies participants on completion', async () => {
      const envelopeRecord = {
        id: 5,
        leaseId: 12,
        createdById: 7,
        provider: EsignProvider.DOCUSIGN,
        providerEnvelopeId: 'env-123',
        status: EsignEnvelopeStatus.SENT,
        participants: [
          { id: 1, name: 'Tenant', email: 'tenant@test.com', phone: '555-0000', userId: 42 },
        ],
      };

      (prisma.esignEnvelope.findFirst as jest.Mock).mockResolvedValue(envelopeRecord as any);
      (prisma.esignEnvelope.update as jest.Mock).mockResolvedValue(envelopeRecord as any);
      (documents.saveBuffer as jest.Mock).mockResolvedValue({ id: 88 } as any);

      const dto: ProviderWebhookDto = {
        envelopeId: 'env-123',
        status: 'COMPLETED',
        participants: [{ email: 'tenant@test.com', status: 'SIGNED' }],
        documents: [
          {
            name: 'signed.pdf',
            type: 'combined',
            contentBase64: Buffer.from('pdf').toString('base64'),
          },
        ],
      };

      await service.handleProviderWebhook(dto);

      expect(prisma.esignParticipant.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: EsignParticipantStatus.SIGNED },
        }),
      );
      expect(documents.saveBuffer).toHaveBeenCalled();
      expect(prisma.esignEnvelope.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ providerStatus: 'COMPLETED' }),
        }),
      );
      expect(notifications.sendSignatureAlert).toHaveBeenCalledWith(
        expect.objectContaining({ event: 'COMPLETED' }),
      );
    });
  });
});
