import { Test, TestingModule } from '@nestjs/testing';
import { BulkMessagingService } from './bulk-messaging.service';
import { PrismaService } from '../prisma/prisma.service';
import { MessagingService } from './messaging.service';
import { BulkRecipientStatus } from '@prisma/client';

describe('BulkMessagingService', () => {
  let service: BulkMessagingService;
  const mockPrisma = {
    messageTemplate: { findUnique: jest.fn(), findMany: jest.fn() },
    user: { findMany: jest.fn() },
    bulkMessageBatch: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    bulkMessageRecipient: {
      createMany: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
    },
  } as unknown as PrismaService;

  const mockMessagingService = {
    sendMessage: jest.fn(),
  } as unknown as MessagingService;

  const sampleUser = {
    id: 2,
    username: 'tenant_user',
    lease: {
      unit: { name: 'Unit 1', property: { name: 'Maple' } },
    },
  };

  beforeEach(async () => {
    jest.resetAllMocks();
    (mockPrisma.messageTemplate.findMany as jest.Mock).mockResolvedValue([]);
    (mockPrisma.user.findMany as jest.Mock).mockResolvedValue([sampleUser]);
    (mockPrisma.bulkMessageBatch.create as jest.Mock).mockResolvedValue({
      id: 1,
      creatorId: 1,
      throttlePerMinute: 30,
    });
    (mockPrisma.bulkMessageRecipient.createMany as jest.Mock).mockResolvedValue({});
    (mockPrisma.bulkMessageBatch.findUnique as jest.Mock).mockResolvedValue({
      id: 1,
      title: 'Test',
      body: 'Hello',
      creator: { id: 1, username: 'manager', role: 'PROPERTY_MANAGER' },
      template: null,
    });
    (mockPrisma.bulkMessageRecipient.groupBy as jest.Mock).mockResolvedValue([
      { status: BulkRecipientStatus.SENT, _count: { _all: 1 } },
    ]);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BulkMessagingService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: MessagingService, useValue: mockMessagingService },
      ],
    }).compile();

    service = module.get<BulkMessagingService>(BulkMessagingService);
  });

  it('previews bulk messages with merge fields', async () => {
    (mockPrisma.messageTemplate.findUnique as jest.Mock).mockResolvedValue({ id: 10, body: 'Hello {{username}}' });
    const preview = await service.previewBulkMessage(
      {
        title: 'Notice',
        body: 'Fallback',
        templateId: 10,
        filters: { roles: ['TENANT'] },
      },
      1,
    );

    expect(preview.totalRecipients).toBe(1);
    expect(preview.sample[0].renderedContent).toContain('tenant_user');
  });

  it('queues bulk messages and persists rendered recipients', async () => {
    jest.spyOn(service, 'getBatchById').mockResolvedValue({ id: 1 } as any);
    await service.queueBulkMessage(
      {
        title: 'Notice',
        body: 'Hello {{propertyName}}',
        filters: { roles: ['TENANT'] },
        mergeFields: { managerName: 'Jordan' },
      },
      1,
    );

    expect(mockPrisma.bulkMessageBatch.create).toHaveBeenCalled();
    expect(mockPrisma.bulkMessageRecipient.createMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([
          expect.objectContaining({
            batchId: 1,
            userId: sampleUser.id,
            renderedContent: expect.stringContaining('Maple'),
          }),
        ]),
      }),
    );
  });

  it('processes pending recipients with throttling and retry bookkeeping', async () => {
    (mockPrisma.bulkMessageBatch.findMany as jest.Mock).mockResolvedValue([
      {
        id: 5,
        creatorId: 9,
        throttlePerMinute: 30,
        status: 'QUEUED',
        body: 'Hello {{username}}',
        metadata: { managerName: 'Pat' },
        startedAt: null,
        recipients: [
          {
            id: 55,
            userId: sampleUser.id,
            status: BulkRecipientStatus.PENDING,
            attempts: 0,
            mergeVariables: { username: 'tenant_user' },
            renderedContent: null,
            user: sampleUser,
          },
        ],
      },
    ]);
    (mockPrisma.bulkMessageRecipient.count as jest.Mock)
      .mockResolvedValueOnce(0) // sentRecently
      .mockResolvedValueOnce(0) // pending check
      .mockResolvedValueOnce(0); // failure count
    (mockMessagingService.sendMessage as jest.Mock).mockResolvedValue({ id: 444 });
    await service.processQueue();

    expect(mockPrisma.bulkMessageRecipient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 55 },
        data: expect.objectContaining({ status: BulkRecipientStatus.SENT, messageId: 444 }),
      }),
    );
  });
});
