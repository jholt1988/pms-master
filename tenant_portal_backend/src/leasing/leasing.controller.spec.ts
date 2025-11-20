import { Test, TestingModule } from '@nestjs/testing';
import { HttpException, HttpStatus } from '@nestjs/common';
import { LeasingController } from './leasing.controller';
import { LeasingService } from './leasing.service';
import { testData } from '../../test/factories';

// Define enums locally if not yet in @prisma/client
enum LeadStatus {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  QUALIFIED = 'QUALIFIED',
  TOURING = 'TOURING',
  APPLICATION_SUBMITTED = 'APPLICATION_SUBMITTED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

enum InterestLevel {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
}

describe('LeasingController', () => {
  let controller: LeasingController;
  let service: LeasingService;

  const mockLeasingService = {
    upsertLead: jest.fn(),
    getLeadBySessionId: jest.fn(),
    getLeadById: jest.fn(),
    getLeads: jest.fn(),
    addMessage: jest.fn(),
    getConversationHistory: jest.fn(),
    searchProperties: jest.fn(),
    recordPropertyInquiry: jest.fn(),
    updateLeadStatus: jest.fn(),
    getLeadStatistics: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeasingController],
      providers: [
        {
          provide: LeasingService,
          useValue: mockLeasingService,
        },
      ],
    }).compile();

    controller = module.get<LeasingController>(LeasingController);
    service = module.get<LeasingService>(LeasingService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createLead', () => {
    it('should create a lead successfully', async () => {
      const leadData = {
        sessionId: 'sess_abc123',
        name: testData.fullName(),
        email: testData.email(),
        phone: testData.phone(),
        preferredMoveInDate: new Date('2024-12-01'),
      };

      const mockLead = {
        id: 'lead_1',
        sessionId: 'sess_abc123',
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        status: LeadStatus.NEW,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockLeasingService.upsertLead.mockResolvedValue(mockLead);

      const result = await controller.createLead(leadData);

      expect(result).toEqual({
        success: true,
        leadId: 'lead_1',
        message: 'Lead saved successfully',
      });
      expect(service.upsertLead).toHaveBeenCalledWith('sess_abc123', {
        name: leadData.name,
        email: leadData.email,
        phone: leadData.phone,
        preferredMoveInDate: leadData.preferredMoveInDate,
      });
    });

    it('should throw HttpException when sessionId is missing', async () => {
      const leadData = {
        name: testData.fullName(),
        email: testData.email(),
      };

      await expect(controller.createLead(leadData)).rejects.toThrow(HttpException);
      await expect(controller.createLead(leadData)).rejects.toThrow('Session ID is required');
      expect(service.upsertLead).not.toHaveBeenCalled();
    });

    it('should throw HttpException when service throws an error', async () => {
      const leadData = {
        sessionId: 'sess_abc123',
        email: 'invalid',
      };

      mockLeasingService.upsertLead.mockRejectedValue(new Error('Invalid email format'));

      await expect(controller.createLead(leadData)).rejects.toThrow(HttpException);
      await expect(controller.createLead(leadData)).rejects.toThrow('Invalid email format');
    });
  });

  describe('getLeadBySession', () => {
    it('should return lead by session ID', async () => {
      const mockLead = {
        id: 'lead_1',
        sessionId: 'sess_abc123',
        name: testData.fullName(),
        email: testData.email(),
        status: LeadStatus.NEW,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockLeasingService.getLeadBySessionId.mockResolvedValue(mockLead);

      const result = await controller.getLeadBySession('sess_abc123');

      expect(result).toEqual({
        success: true,
        lead: mockLead,
      });
      expect(service.getLeadBySessionId).toHaveBeenCalledWith('sess_abc123');
    });

    it('should throw HttpException when lead not found', async () => {
      mockLeasingService.getLeadBySessionId.mockResolvedValue(null);

      await expect(controller.getLeadBySession('sess_notfound')).rejects.toThrow(HttpException);
      await expect(controller.getLeadBySession('sess_notfound')).rejects.toThrow('Lead not found');
    });
  });

  describe('getLeadById', () => {
    it('should return lead by ID', async () => {
      const mockLead = {
        id: 'lead_1',
        sessionId: 'sess_abc123',
        name: testData.fullName(),
        email: testData.email(),
        status: LeadStatus.CONTACTED,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockLeasingService.getLeadById.mockResolvedValue(mockLead);

      const result = await controller.getLeadById('lead_1');

      expect(result).toEqual({
        success: true,
        lead: mockLead,
      });
      expect(service.getLeadById).toHaveBeenCalledWith('lead_1');
    });

    it('should throw HttpException when lead not found', async () => {
      mockLeasingService.getLeadById.mockResolvedValue(null);

      await expect(controller.getLeadById('lead_notfound')).rejects.toThrow(HttpException);
      await expect(controller.getLeadById('lead_notfound')).rejects.toThrow('Lead not found');
    });
  });

  describe('getLeads', () => {
    it('should return leads without filters', async () => {
      const mockResult = {
        leads: [
          {
            id: 'lead_1',
            sessionId: 'sess_1',
            status: LeadStatus.NEW,
            createdAt: new Date(),
          },
          {
            id: 'lead_2',
            sessionId: 'sess_2',
            status: LeadStatus.CONTACTED,
            createdAt: new Date(),
          },
        ],
        total: 2,
        limit: 50,
        offset: 0,
      };

      mockLeasingService.getLeads.mockResolvedValue(mockResult);

      const result = await controller.getLeads();

      expect(result).toEqual({
        success: true,
        ...mockResult,
      });
      expect(service.getLeads).toHaveBeenCalledWith({});
    });

    it('should return leads with status filter', async () => {
      const mockResult = {
        leads: [
          {
            id: 'lead_3',
            sessionId: 'sess_3',
            status: LeadStatus.QUALIFIED,
            createdAt: new Date(),
          },
        ],
        total: 1,
        limit: 50,
        offset: 0,
      };

      mockLeasingService.getLeads.mockResolvedValue(mockResult);

      const result = await controller.getLeads('QUALIFIED');

      expect(result.success).toBe(true);
      expect(service.getLeads).toHaveBeenCalledWith({ status: 'QUALIFIED' });
    });

    it('should return leads with search and pagination', async () => {
      const mockResult = {
        leads: [],
        total: 0,
        limit: 10,
        offset: 20,
      };

      mockLeasingService.getLeads.mockResolvedValue(mockResult);

      const result = await controller.getLeads(
        undefined,
        'john',
        undefined,
        undefined,
        '10',
        '20',
      );

      expect(result.success).toBe(true);
      expect(service.getLeads).toHaveBeenCalledWith({
        search: 'john',
        limit: 10,
        offset: 20,
      });
    });

    it('should return leads with date range filter', async () => {
      const dateFrom = '2024-01-01';
      const dateTo = '2024-12-31';
      const mockResult = {
        leads: [],
        total: 0,
        limit: 50,
        offset: 0,
      };

      mockLeasingService.getLeads.mockResolvedValue(mockResult);

      await controller.getLeads(undefined, undefined, dateFrom, dateTo);

      expect(service.getLeads).toHaveBeenCalledWith({
        dateFrom: new Date(dateFrom),
        dateTo: new Date(dateTo),
      });
    });
  });

  describe('addMessage', () => {
    it('should add a message successfully', async () => {
      const mockMessage = {
        id: 1,
        leadId: 'lead_1',
        role: MessageRole.USER,
        content: 'Hello, I need information about properties',
        createdAt: new Date(),
      };

      mockLeasingService.addMessage.mockResolvedValue(mockMessage);

      const result = await controller.addMessage('lead_1', {
        role: 'USER',
        content: 'Hello, I need information about properties',
      });

      expect(result).toEqual({
        success: true,
        message: mockMessage,
      });
      expect(service.addMessage).toHaveBeenCalledWith(
        'lead_1',
        'USER',
        'Hello, I need information about properties',
        undefined,
      );
    });

    it('should throw HttpException when role is missing', async () => {
      await expect(
        controller.addMessage('lead_1', { role: '', content: 'test' }),
      ).rejects.toThrow(HttpException);
      await expect(
        controller.addMessage('lead_1', { role: '', content: 'test' }),
      ).rejects.toThrow('Role and content are required');
    });

    it('should throw HttpException when content is missing', async () => {
      await expect(
        controller.addMessage('lead_1', { role: 'USER', content: '' }),
      ).rejects.toThrow(HttpException);
    });

    it('should add message with metadata', async () => {
      const metadata = { source: 'web', deviceType: 'mobile' };
      const mockMessage = {
        id: 2,
        leadId: 'lead_1',
        role: MessageRole.ASSISTANT,
        content: 'Here are the properties',
        metadata: metadata as any,
        createdAt: new Date(),
      };

      mockLeasingService.addMessage.mockResolvedValue(mockMessage);

      const result = await controller.addMessage('lead_1', {
        role: 'ASSISTANT',
        content: 'Here are the properties',
        metadata,
      });

      expect(result.success).toBe(true);
      expect(service.addMessage).toHaveBeenCalledWith(
        'lead_1',
        'ASSISTANT',
        'Here are the properties',
        metadata,
      );
    });
  });

  describe('getConversationHistory', () => {
    it('should return conversation messages', async () => {
      const mockMessages = [
        {
          id: 1,
          leadId: 'lead_1',
          role: MessageRole.USER,
          content: 'Hi',
          createdAt: new Date('2024-01-01'),
        },
        {
          id: 2,
          leadId: 'lead_1',
          role: MessageRole.ASSISTANT,
          content: 'Hello! How can I help?',
          createdAt: new Date('2024-01-01'),
        },
      ];

      mockLeasingService.getConversationHistory.mockResolvedValue(mockMessages);

      const result = await controller.getConversationHistory('lead_1');

      expect(result).toEqual({
        success: true,
        messages: mockMessages,
      });
      expect(service.getConversationHistory).toHaveBeenCalledWith('lead_1');
    });

    it('should throw HttpException on service error', async () => {
      mockLeasingService.getConversationHistory.mockRejectedValue(
        new Error('Database connection failed'),
      );

      await expect(controller.getConversationHistory('lead_1')).rejects.toThrow(HttpException);
    });
  });

  describe('searchProperties', () => {
    it('should search properties with all criteria', async () => {
      const mockProperties = [
        {
          id: 1,
          address: testData.street(),
          bedrooms: 2,
          bathrooms: 2,
          rent: 1800,
          petFriendly: true,
        },
      ];

      mockLeasingService.searchProperties.mockResolvedValue(mockProperties);

      const result = await controller.searchProperties('2', '2', '2000', 'true', '10');

      expect(result).toEqual({
        success: true,
        properties: mockProperties,
      });
      expect(service.searchProperties).toHaveBeenCalledWith({
        bedrooms: 2,
        bathrooms: 2,
        maxRent: 2000,
        petFriendly: true,
        limit: 10,
      });
    });

    it('should search properties with partial criteria', async () => {
      const mockProperties: any[] = [];

      mockLeasingService.searchProperties.mockResolvedValue(mockProperties);

      const result = await controller.searchProperties('3', undefined, '1500');

      expect(result.success).toBe(true);
      expect(service.searchProperties).toHaveBeenCalledWith({
        bedrooms: 3,
        maxRent: 1500,
      });
    });

    it('should search properties without criteria', async () => {
      const mockProperties = [
        { id: 1, address: '123 Main St' },
        { id: 2, address: '456 Oak Ave' },
      ];

      mockLeasingService.searchProperties.mockResolvedValue(mockProperties);

      const result = await controller.searchProperties();

      expect(result.success).toBe(true);
      expect(service.searchProperties).toHaveBeenCalledWith({});
    });
  });

  describe('recordInquiry', () => {
    it('should record property inquiry successfully', async () => {
      const mockInquiry = {
        id: 1,
        leadId: 'lead_1',
        propertyId: 5,
        unitId: 10,
        interestLevel: InterestLevel.HIGH,
        createdAt: new Date(),
      };

      mockLeasingService.recordPropertyInquiry.mockResolvedValue(mockInquiry);

      const result = await controller.recordInquiry('lead_1', {
        propertyId: 5,
        unitId: 10,
        interest: 'HIGH',
      });

      expect(result).toEqual({
        success: true,
        inquiry: mockInquiry,
      });
      expect(service.recordPropertyInquiry).toHaveBeenCalledWith('lead_1', 5, 10, 'HIGH');
    });

    it('should record inquiry without unitId', async () => {
      const mockInquiry = {
        id: 2,
        leadId: 'lead_1',
        propertyId: 8,
        unitId: null,
        interestLevel: InterestLevel.MEDIUM,
        createdAt: new Date(),
      };

      mockLeasingService.recordPropertyInquiry.mockResolvedValue(mockInquiry);

      const result = await controller.recordInquiry('lead_1', {
        propertyId: 8,
        interest: 'MEDIUM',
      });

      expect(result.success).toBe(true);
      expect(service.recordPropertyInquiry).toHaveBeenCalledWith('lead_1', 8, undefined, 'MEDIUM');
    });

    it('should throw HttpException when propertyId is missing', async () => {
      await expect(
        controller.recordInquiry('lead_1', { propertyId: null as any }),
      ).rejects.toThrow(HttpException);
      await expect(
        controller.recordInquiry('lead_1', { propertyId: null as any }),
      ).rejects.toThrow('Property ID is required');
    });
  });

  describe('updateStatus', () => {
    it('should update lead status successfully', async () => {
      const mockLead = {
        id: 'lead_1',
        sessionId: 'sess_1',
        status: LeadStatus.QUALIFIED,
        updatedAt: new Date(),
      };

      mockLeasingService.updateLeadStatus.mockResolvedValue(mockLead);

      const result = await controller.updateStatus('lead_1', { status: 'QUALIFIED' });

      expect(result).toEqual({
        success: true,
        lead: mockLead,
      });
      expect(service.updateLeadStatus).toHaveBeenCalledWith('lead_1', 'QUALIFIED');
    });

    it('should throw HttpException when status is missing', async () => {
      await expect(controller.updateStatus('lead_1', { status: '' })).rejects.toThrow(
        HttpException,
      );
      await expect(controller.updateStatus('lead_1', { status: '' })).rejects.toThrow(
        'Status is required',
      );
    });
  });

  describe('getStatistics', () => {
    it('should return lead statistics without date filters', async () => {
      const mockStats = {
        total: 150,
        new: 45,
        contacted: 30,
        qualified: 25,
        tourScheduled: 20,
        applicationSubmitted: 15,
        converted: 10,
        lost: 5,
        conversionRate: 6.67,
      };

      mockLeasingService.getLeadStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics();

      expect(result).toEqual({
        success: true,
        stats: mockStats,
      });
      expect(service.getLeadStatistics).toHaveBeenCalledWith(undefined, undefined);
    });

    it('should return statistics with date range', async () => {
      const mockStats = {
        total: 50,
        new: 15,
        contacted: 10,
        qualified: 8,
        tourScheduled: 7,
        applicationSubmitted: 5,
        converted: 3,
        lost: 2,
        conversionRate: 6.0,
      };

      mockLeasingService.getLeadStatistics.mockResolvedValue(mockStats);

      const result = await controller.getStatistics('2024-01-01', '2024-12-31');

      expect(result.success).toBe(true);
      expect(service.getLeadStatistics).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-12-31'),
      );
    });
  });
});
