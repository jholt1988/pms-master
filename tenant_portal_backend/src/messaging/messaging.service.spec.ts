import { BadRequestException } from '@nestjs/common';
import { MessagingService } from './messaging.service';

describe('MessagingService.createThread', () => {
  const prisma: any = {
    user: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  let service: MessagingService;

  beforeEach(() => {
    prisma.user.findMany.mockReset();
    prisma.$transaction.mockReset();
    service = new MessagingService(prisma);
  });

  it('throws when no recipients are provided', async () => {
    await expect(
      service.createThread({ content: 'hello world' } as any, 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('creates conversation and initial message atomically', async () => {
    const creatorId = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const recipientId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

    prisma.user.findMany.mockResolvedValue([{ id: creatorId }, { id: recipientId }]);

    prisma.$transaction.mockImplementation(async (fn: any) => {
      const tx = {
        conversation: {
          create: jest.fn().mockResolvedValue({
            id: 99,
            participants: [
              { user: { id: creatorId, username: 'creator', role: 'TENANT' } },
              { user: { id: recipientId, username: 'recipient', role: 'PROPERTY_MANAGER' } },
            ],
          }),
        },
        message: {
          create: jest.fn().mockResolvedValue({
            id: 123,
            conversationId: 99,
            content: 'Hello',
            sender: { id: creatorId, username: 'creator', role: 'TENANT' },
          }),
        },
      };

      const result = await fn(tx);

      expect(tx.conversation.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            participants: {
              create: expect.arrayContaining([{ userId: creatorId }, { userId: recipientId }]),
            },
          }),
        }),
      );
      expect(tx.message.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            senderId: creatorId,
            conversationId: 99,
            content: 'Hello',
          }),
        }),
      );

      return result;
    });

    const result = await service.createThread(
      { recipientId, content: 'Hello' } as any,
      creatorId,
    );

    expect(result).toEqual(
      expect.objectContaining({
        id: 99,
        initialMessage: expect.objectContaining({ id: 123, conversationId: 99 }),
      }),
    );
  });
});
