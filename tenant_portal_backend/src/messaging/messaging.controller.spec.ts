import { Test, TestingModule } from '@nestjs/testing';
import { MessagingController } from './messaging.controller';
import { MessagingService } from './messaging.service';
import { BulkMessagingService } from './bulk-messaging.service';

const mockMessagingService = {
  getConversations: jest.fn(),
  createConversation: jest.fn(),
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

describe('MessagingController (bulk messaging)', () => {
  let controller: MessagingController;

  beforeEach(async () => {
    Object.values(mockMessagingService).forEach((fn: any) => fn.mockReset && fn.mockReset());
    Object.values(mockBulkMessagingService).forEach((fn: any) => fn.mockReset && fn.mockReset());

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MessagingController],
      providers: [
        { provide: MessagingService, useValue: mockMessagingService },
        { provide: BulkMessagingService, useValue: mockBulkMessagingService },
      ],
    }).compile();

    controller = module.get<MessagingController>(MessagingController);
  });

  it('delegates preview to the bulk service', async () => {
    mockBulkMessagingService.previewBulkMessage.mockResolvedValue({ totalRecipients: 2 });
    const dto = { title: 'Test', body: 'Hi', filters: { roles: ['TENANT'] } } as any;
    const req = { user: { userId: 7 } } as any;
    const result = await controller.previewBulk(dto, req);
    expect(mockBulkMessagingService.previewBulkMessage).toHaveBeenCalledWith(dto, 7);
    expect(result).toEqual({ totalRecipients: 2 });
  });

  it('queues bulk messages via the bulk service', async () => {
    mockBulkMessagingService.queueBulkMessage.mockResolvedValue({ id: 9 });
    const dto = { title: 'Test', body: 'Hi' } as any;
    const req = { user: { userId: 3 } } as any;
    const result = await controller.queueBulk(dto, req);
    expect(mockBulkMessagingService.queueBulkMessage).toHaveBeenCalledWith(dto, 3);
    expect(result).toEqual({ id: 9 });
  });

  it('lists bulk batches', async () => {
    mockBulkMessagingService.listBatches.mockResolvedValue([{ id: 1 }]);
    const result = await controller.listBulkBatches();
    expect(mockBulkMessagingService.listBatches).toHaveBeenCalled();
    expect(result).toEqual([{ id: 1 }]);
  });
});
