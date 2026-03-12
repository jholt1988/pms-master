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
import { RentalApplicationReviewAction } from './dto/review-action.dto';

describe('RentalApplicationService review actions', () => {
  const prisma = {
    rentalApplication: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    rentalApplicationNote: {
      create: jest.fn(),
    },
  } as any;

  const lifecycle = {
    canTransition: jest.fn(),
    transitionStatus: jest.fn(),
    recordLifecycleEvent: jest.fn(),
  } as any;

  const scheduleService = {
    createEvent: jest.fn(),
  } as any;

  let service: RentalApplicationService;

  const actor = { userId: 'pm-1', username: 'pm', role: Role.PROPERTY_MANAGER };

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        RentalApplicationService,
        { provide: PrismaService, useValue: prisma },
        { provide: SecurityEventsService, useValue: { logEvent: jest.fn() } },
        { provide: ApplicationLifecycleService, useValue: lifecycle },
        { provide: RentalApplicationAiService, useValue: {} },
        { provide: AuditLogService, useValue: { record: jest.fn() } },
        { provide: ScheduleService, useValue: scheduleService },
      ],
    }).compile();

    service = module.get(RentalApplicationService);
    jest.clearAllMocks();

    prisma.rentalApplication.findFirst.mockResolvedValue({
      id: 10,
      status: ApplicationStatus.PENDING,
      propertyId: 'prop-1',
      unitId: 'unit-1',
      applicantId: 'tenant-1',
      fullName: 'Alex Applicant',
      manualNotes: [],
    });

    prisma.rentalApplication.findUnique.mockResolvedValue({
      id: 10,
      status: ApplicationStatus.PENDING,
      propertyId: 'prop-1',
      unitId: 'unit-1',
      applicantId: 'tenant-1',
      fullName: 'Alex Applicant',
      manualNotes: [],
    });

    prisma.rentalApplicationNote.create.mockResolvedValue({
      id: 111,
      body: 'note',
      createdAt: new Date(),
      author: { id: actor.userId, username: actor.username },
    });

    lifecycle.canTransition.mockReturnValue(true);
    lifecycle.transitionStatus.mockResolvedValue(undefined);
    lifecycle.recordLifecycleEvent.mockResolvedValue(undefined);
    scheduleService.createEvent.mockResolvedValue({ id: 500 });
  });

  it('handles REQUEST_INFO by transitioning and adding note', async () => {
    await service.performReviewAction(
      10,
      { action: RentalApplicationReviewAction.REQUEST_INFO, note: 'Upload paystubs' },
      actor,
      'org-1',
    );

    expect(lifecycle.transitionStatus).toHaveBeenCalled();
    expect(prisma.rentalApplicationNote.create).toHaveBeenCalled();
  });

  it('requires scheduledAt for SCHEDULE_INTERVIEW', async () => {
    await expect(
      service.performReviewAction(
        10,
        { action: RentalApplicationReviewAction.SCHEDULE_INTERVIEW },
        actor,
        'org-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates schedule event for SCHEDULE_INTERVIEW', async () => {
    await service.performReviewAction(
      10,
      {
        action: RentalApplicationReviewAction.SCHEDULE_INTERVIEW,
        scheduledAt: new Date().toISOString(),
        note: 'Bring co-applicant',
      },
      actor,
      'org-1',
    );

    expect(scheduleService.createEvent).toHaveBeenCalled();
  });
});
