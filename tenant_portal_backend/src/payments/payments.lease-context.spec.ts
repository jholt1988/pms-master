import { ForbiddenException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { EmailService } from '../email/email.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentsService } from './payments.service';
import { AIPaymentService } from './ai-payment.service';
import { StripeService } from './stripe.service';
import { AuditLogService } from '../shared/audit-log.service';
import { WorkflowEventService } from '../policy/workflow-event.service';
import { WorkflowEventProcessor } from '../policy/workflow-event-processor.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

describe('PaymentsService lease-context access', () => {
  const prisma = {
    payment: {
      findUnique: jest.fn(),
    },
  } as any;

  const auditLog: any = { create: jest.fn().mockResolvedValue({}) };
  const workflowEventService: any = { raise: jest.fn().mockResolvedValue({}) };
  const eventEmitter: any = { emit: jest.fn() };

  let service: PaymentsService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AIPaymentService, useValue: {} },
        { provide: EmailService, useValue: {} },
        { provide: StripeService, useValue: {} },
        { provide: AuditLogService, useValue: auditLog },
        { provide: WorkflowEventService, useValue: workflowEventService },
        { provide: WorkflowEventProcessor, useValue: { process: jest.fn().mockResolvedValue({}) } },
        { provide: EventEmitter2, useValue: eventEmitter },
      ],
    }).compile();

    service = module.get(PaymentsService);
    jest.clearAllMocks();
  });

  it('allows PM access using payment.lease organization when invoice is absent', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 42,
      userId: 'tenant-1',
      invoice: null,
      lease: {
        unit: {
          property: {
            organizationId: 'org-1',
          },
        },
      },
    });

    await expect(
      service.getPaymentById(42, 'pm-user', Role.PROPERTY_MANAGER, 'org-1'),
    ).resolves.toMatchObject({ id: 42 });
  });

  it('denies PM access for cross-org payment context', async () => {
    prisma.payment.findUnique.mockResolvedValue({
      id: 42,
      userId: 'tenant-1',
      invoice: null,
      lease: {
        unit: {
          property: {
            organizationId: 'org-other',
          },
        },
      },
    });

    await expect(
      service.getPaymentById(42, 'pm-user', Role.PROPERTY_MANAGER, 'org-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
