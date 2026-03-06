import { MessagingController } from './messaging.controller';

const mockMessagingService = {
  getConversations: jest.fn(),
  createConversation: jest.fn(),
  createThread: jest.fn(),
  getConversationById: jest.fn(),
  getConversationMessages: jest.fn(),
  sendMessage: jest.fn(),
  findPropertyManagers: jest.fn(),
  findAllTenants: jest.fn(),
  findAllUsers: jest.fn(),
  getAllConversations: jest.fn(),
  searchConversations: jest.fn(),
  getConversationStats: jest.fn(),
};

const mockBulkMessagingService = {
  previewBulkMessage: jest.fn(),
  queueBulkMessage: jest.fn(),
  listBatches: jest.fn(),
  getBatchById: jest.fn(),
  getRecipientStatuses: jest.fn(),
  getDeliveryReport: jest.fn(),
  getTemplates: jest.fn(),
};

const mockAuditLogService = {
  record: jest.fn(),
};

describe('MessagingController', () => {
  let controller: MessagingController;

  beforeEach(() => {
    Object.values(mockMessagingService).forEach((fn: any) => fn.mockReset?.());
    Object.values(mockBulkMessagingService).forEach((fn: any) => fn.mockReset?.());
    mockAuditLogService.record.mockReset();

    controller = new MessagingController(
      mockMessagingService as any,
      mockBulkMessagingService as any,
      mockAuditLogService as any,
    );
  });

  it('delegates preview to the bulk service', async () => {
    mockBulkMessagingService.previewBulkMessage.mockResolvedValue({ totalRecipients: 2 });
    const dto = { title: 'Test', body: 'Hi', filters: { roles: ['TENANT'] } } as any;
    const req = { user: { userId: '7' } } as any;

    const result = await controller.previewBulk(dto, req);

    expect(mockBulkMessagingService.previewBulkMessage).toHaveBeenCalledWith(dto, '7', undefined);
    expect(result).toEqual({ totalRecipients: 2 });
  });

  it('queues bulk messages via the bulk service', async () => {
    mockBulkMessagingService.queueBulkMessage.mockResolvedValue({ id: 9 });
    const dto = { title: 'Test', body: 'Hi' } as any;
    const req = { user: { userId: '3' } } as any;

    const result = await controller.queueBulk(dto, req);

    expect(mockBulkMessagingService.queueBulkMessage).toHaveBeenCalledWith(dto, '3', undefined);
    expect(result).toEqual({ id: 9 });
  });

  it('starts a thread and records conversation + message audit logs', async () => {
    const thread = {
      id: 44,
      participants: [{ userId: 'u1' }, { userId: 'u2' }],
      initialMessage: { id: 77, conversationId: 44 },
    };
    mockMessagingService.createThread.mockResolvedValue(thread);
    mockAuditLogService.record.mockResolvedValue(undefined);

    const dto = { recipientId: '11111111-1111-4111-8111-111111111111', content: 'Hello there' } as any;
    const req = { user: { userId: '22222222-2222-4222-8222-222222222222' } } as any;

    const result = await controller.createThread(dto, req, 'org-1');

    expect(mockMessagingService.createThread).toHaveBeenCalledWith(dto, req.user.userId, 'org-1');
    expect(mockAuditLogService.record).toHaveBeenCalledTimes(2);
    expect(result).toEqual(thread);
  });
});
