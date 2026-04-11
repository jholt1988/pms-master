import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { getQueueToken } from '@nestjs/bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityEventsService } from '../security-events/security-events.service';
import { AuditLogService } from '../shared/audit-log.service';
import { ScheduleService } from '../schedule/schedule.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ApplicationLifecycleService } from './application-lifecycle.service';
import { RentalApplicationAiService } from './rental-application.ai.service';
import { RentalApplicationService } from './rental-application.service';

describe('RentalApplicationService submitApplication hardening', () => {
  const prisma = {
    rentalApplication: {
      create: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
  } as any;

  const lifecycle = {
    recordLifecycleEvent: jest.fn(),
  } as any;

  let service: RentalApplicationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RentalApplicationService,
        { provide: PrismaService, useValue: prisma },
        { provide: SecurityEventsService, useValue: { logEvent: jest.fn() } },
        { provide: ApplicationLifecycleService, useValue: lifecycle },
        { provide: RentalApplicationAiService, useValue: {} },
        { provide: AuditLogService, useValue: { record: jest.fn() } },
        { provide: ScheduleService, useValue: {} },
        { provide: NotificationsService, useValue: { sendNotification: jest.fn() } },
        { provide: getQueueToken('ai-screening'), useValue: { add: jest.fn() } },
      ],
    }).compile();

    service = module.get(RentalApplicationService);
    jest.clearAllMocks();

    prisma.rentalApplication.create.mockResolvedValue({
      id: 1,
      propertyId: 'prop-1',
      unitId: 'unit-1',
      termsVersion: 'v1',
      privacyVersion: 'v1',
      termsAcceptedAt: new Date(),
      privacyAcceptedAt: new Date(),
      email: 'applicant@example.com',
    });
    prisma.user.findUnique.mockResolvedValue({ id: 'tenant-1', username: 'tenant', role: Role.TENANT });
    lifecycle.recordLifecycleEvent.mockResolvedValue(undefined);
  });

  const basePayload: any = {
    propertyId: 'prop-1',
    unitId: 'unit-1',
    fullName: 'Alex Applicant',
    email: 'alex@example.com',
    phoneNumber: '+1 316 555 1212',
    income: 5000,
    previousAddress: '123 Main St',
    references: [],
    pastLandlords: [],
    employments: [{ employerName: 'ABC', employmentType: 'FULL_TIME' }],
    additionalIncomes: [],
    pets: [],
    vehicles: [],
    authorizeCreditCheck: true,
    authorizeBackgroundCheck: true,
    authorizeEmploymentVerification: true,
    ssCardUploaded: false,
    proofOfIncomeUploaded: true,
    dlIdUploaded: true,
    termsAccepted: true,
    termsVersion: 'v1',
    privacyAccepted: true,
    privacyVersion: 'v1',
  };

  it('rejects missing verification authorizations', async () => {
    await expect(
      service.submitApplication({ ...basePayload, authorizeBackgroundCheck: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects missing required uploads', async () => {
    await expect(
      service.submitApplication({ ...basePayload, proofOfIncomeUploaded: false }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects when no employment and no additional income entries', async () => {
    await expect(
      service.submitApplication({ ...basePayload, employments: [], additionalIncomes: [] }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('persists intake compliance flags on successful submit', async () => {
    await service.submitApplication(basePayload, 'tenant-1');

    expect(prisma.rentalApplication.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          authorizeCreditCheck: true,
          authorizeBackgroundCheck: true,
          authorizeEmploymentVerification: true,
          proofOfIncomeUploaded: true,
          dlIdUploaded: true,
        }),
      }),
    );
  });
});
