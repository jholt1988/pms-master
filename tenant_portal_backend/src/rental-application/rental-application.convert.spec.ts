import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { ApplicationStatus, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SecurityEventsService } from '../security-events/security-events.service';
import { AuditLogService } from '../shared/audit-log.service';
import { ScheduleService } from '../schedule/schedule.service';
import { ApplicationLifecycleService } from './application-lifecycle.service';
import { RentalApplicationAiService } from './rental-application.ai.service';
import { RentalApplicationService } from './rental-application.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('RentalApplicationService convertApprovedApplicationToLease', () => {
  const prisma = {
    rentalApplication: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    lease: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    leaseHistory: {
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  } as any;
  const scheduleService = { createEvent: jest.fn() } as any;
  const notificationsService = { create: jest.fn() } as any;

  let service: RentalApplicationService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RentalApplicationService,
        { provide: PrismaService, useValue: prisma },
        { provide: SecurityEventsService, useValue: { logEvent: jest.fn() } },
        { provide: ApplicationLifecycleService, useValue: {} },
        { provide: RentalApplicationAiService, useValue: {} },
        { provide: AuditLogService, useValue: { record: jest.fn() } },
        { provide: ScheduleService, useValue: scheduleService },
        { provide: NotificationsService, useValue: notificationsService },
      ],
    }).compile();

    service = module.get(RentalApplicationService);
    jest.clearAllMocks();

    prisma.$transaction.mockImplementation(async (cb: any) =>
      cb({
        lease: prisma.lease,
        rentalApplication: prisma.rentalApplication,
        leaseHistory: prisma.leaseHistory,
      }),
    );
  });

  it('rejects conversion when application is not approved', async () => {
    prisma.rentalApplication.findFirst.mockResolvedValue({
      id: 10,
      status: ApplicationStatus.PENDING,
      applicantId: 'tenant-1',
    });

    await expect(
      service.convertApprovedApplicationToLease(
        10,
        { userId: 'pm-1', username: 'pm', role: Role.PROPERTY_MANAGER },
        { startDate: '2026-06-01', endDate: '2027-05-31' },
        'org-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates draft lease and links application on approved conversion', async () => {
    prisma.rentalApplication.findFirst.mockResolvedValue({
      id: 11,
      status: ApplicationStatus.APPROVED,
      applicantId: 'tenant-1',
      unitId: 'unit-1',
      income: 6000,
      decisionNotes: 'approved',
      convertedLeaseId: null,
    });
    prisma.lease.findUnique.mockResolvedValue(null);
    prisma.lease.create.mockResolvedValue({ id: 'lease-1', status: 'DRAFT' });
    prisma.rentalApplication.update.mockResolvedValue({ id: 11, convertedLeaseId: 'lease-1' });

    const result = await service.convertApprovedApplicationToLease(
      11,
      { userId: 'pm-1', username: 'pm', role: Role.PROPERTY_MANAGER },
      { startDate: '2026-06-01', endDate: '2027-05-31' },
      'org-1',
    );

    expect(result.id).toBe('lease-1');
    expect(prisma.lease.create).toHaveBeenCalled();
    expect(prisma.rentalApplication.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 11 },
        data: expect.objectContaining({ convertedLeaseId: 'lease-1' }),
      }),
    );
    expect(prisma.leaseHistory.create).toHaveBeenCalled();
    expect(scheduleService.createEvent).toHaveBeenCalled();
    expect(notificationsService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'tenant-1',
        metadata: expect.objectContaining({
          workflow: 'APPLICATION_TO_LEASE_CONVERSION',
          leaseId: 'lease-1',
        }),
      }),
    );
  });
});
