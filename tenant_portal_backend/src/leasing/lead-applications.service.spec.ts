import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApplicationDecisionReasonCode, LeadApplicationStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { SecurityEventsService } from '../security-events/security-events.service';
import { LeadApplicationsService } from './lead-applications.service';

describe('LeadApplicationsService pipeline guardrails', () => {
  const prisma = {
    leadApplication: {
      create: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      findMany: jest.fn(),
    },
  } as any;

  const emailService = {
    sendApplicationStatusEmail: jest.fn(),
    sendApplicationReceivedEmail: jest.fn(),
  } as any;

  let service: LeadApplicationsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        LeadApplicationsService,
        { provide: PrismaService, useValue: prisma },
        { provide: EmailService, useValue: emailService },
        { provide: SecurityEventsService, useValue: { logEvent: jest.fn() } },
      ],
    }).compile();

    service = module.get(LeadApplicationsService);
    jest.clearAllMocks();

    prisma.leadApplication.findUnique.mockResolvedValue({
      id: 'app-1',
      status: LeadApplicationStatus.SUBMITTED,
    });

    prisma.leadApplication.update.mockResolvedValue({
      id: 'app-1',
      status: LeadApplicationStatus.PENDING,
      lead: { email: null },
      property: { id: 'prop-1' },
    });
  });

  it('blocks invalid status transition', async () => {
    prisma.leadApplication.findUnique.mockResolvedValue({
      id: 'app-1',
      status: LeadApplicationStatus.APPROVED,
    });

    await expect(
      service.updateApplicationStatus('app-1', 'DENIED', 'pm-1', 'late reversal', ApplicationDecisionReasonCode.OTHER),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('requires review notes and reason code for denied status', async () => {
    await expect(
      service.updateApplicationStatus('app-1', 'DENIED', 'pm-1'),
    ).rejects.toBeInstanceOf(BadRequestException);

    await expect(
      service.updateApplicationStatus('app-1', 'DENIED', 'pm-1', 'reason text'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists decision metadata when denied', async () => {
    await service.updateApplicationStatus(
      'app-1',
      'DENIED',
      'pm-1',
      'Income does not meet requirements',
      ApplicationDecisionReasonCode.INCOME_INSUFFICIENT,
    );

    expect(prisma.leadApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          decisionReasonCode: ApplicationDecisionReasonCode.INCOME_INSUFFICIENT,
          decisionNotes: 'Income does not meet requirements',
        }),
      }),
    );
  });

  it('throws not found when status update target is missing', async () => {
    prisma.leadApplication.findUnique.mockResolvedValueOnce(null);

    await expect(
      service.updateApplicationStatus('missing', 'PENDING', 'pm-1', 'ok'),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns stale applications with suggestedAction', async () => {
    prisma.leadApplication.findMany.mockResolvedValue([
      {
        id: 'app-stale-1',
        status: LeadApplicationStatus.CONDITIONALLY_APPROVED,
        followUpDueAt: new Date(),
        lastActivityAt: new Date(Date.now() - 72 * 60 * 60 * 1000),
        lead: { id: 'lead-1' },
        property: { id: 'prop-1' },
        unit: { id: 'unit-1' },
      },
    ]);

    const result = await service.getStaleApplications(48, 50);
    expect(result.count).toBe(1);
    expect(result.items[0].suggestedAction).toContain('pending conditions');
  });
});
