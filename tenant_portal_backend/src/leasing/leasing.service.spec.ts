import { Test, TestingModule } from '@nestjs/testing';
import { LeasingService } from './leasing.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { LeadStatus, MessageRole, InterestLevel } from '@prisma/client';
import { TestDataFactory } from '../../test/factories';

describe('LeasingService', () => {
  let service: LeasingService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  const mockPrismaService = {
    lead: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    leadMessage: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
    propertyInquiry: {
      create: jest.fn(),
    },
    unit: {
      findMany: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
  };

  const mockEmailService = {
    sendLeadWelcomeEmail: jest.fn(),
    sendNewLeadNotificationToPM: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeasingService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<LeasingService>(LeasingService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  describe('upsertLead', () => {
    it('should create a new lead and send welcome email', async () => {
      const sessionId = 'session-123';
      const leadData: any = {
        name: 'John Doe',
        email: 'john@test.com',
        phone: '(555) 123-4567',
        bedrooms: 2,
        budget: 1800,
        status: LeadStatus.NEW,
      };

      const mockLead = {
        id: '1',
        sessionId,
        ...leadData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.lead.findUnique.mockResolvedValue(null); // New lead
      mockPrismaService.lead.upsert.mockResolvedValue(mockLead);
      mockEmailService.sendLeadWelcomeEmail.mockResolvedValue(undefined);

      const result = await service.upsertLead(sessionId, leadData);

      expect(result).toEqual(mockLead);
      expect(mockPrismaService.lead.upsert).toHaveBeenCalledWith({
        where: { sessionId },
        create: {
          sessionId,
          ...leadData,
        },
        update: {
          ...leadData,
          updatedAt: expect.any(Date),
        },
      });
      expect(mockEmailService.sendLeadWelcomeEmail).toHaveBeenCalledWith({
        name: leadData.name,
        email: leadData.email,
      });
    });

    it('should update existing lead without sending welcome email', async () => {
      const sessionId = 'session-123';
      const existingLead = TestDataFactory.createLead({ sessionId });
      const updateData: any = { bedrooms: 3, budget: 2000 };

      mockPrismaService.lead.findUnique.mockResolvedValue(existingLead);
      mockPrismaService.lead.upsert.mockResolvedValue({
        ...existingLead,
        ...updateData,
      });

      await service.upsertLead(sessionId, updateData);

      expect(mockEmailService.sendLeadWelcomeEmail).not.toHaveBeenCalled();
    });

    it('should notify property managers of qualified leads', async () => {
      const sessionId = 'session-456';
      const qualifiedLeadData: any = {
        name: 'Jane Smith',
        email: 'jane@test.com',
        status: LeadStatus.QUALIFIED,
        bedrooms: 2,
        budget: 1800,
      };

      const mockLead = {
        id: '2',
        sessionId,
        ...qualifiedLeadData,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockPMs = [
        { username: 'pm1@test.com' },
        { username: 'pm2@test.com' },
      ];

      mockPrismaService.lead.findUnique.mockResolvedValue(null);
      mockPrismaService.lead.upsert.mockResolvedValue(mockLead);
      mockPrismaService.user.findMany.mockResolvedValue(mockPMs);
      mockEmailService.sendLeadWelcomeEmail.mockResolvedValue(undefined);
      mockEmailService.sendNewLeadNotificationToPM.mockResolvedValue(undefined);

      await service.upsertLead(sessionId, qualifiedLeadData);

      expect(mockPrismaService.user.findMany).toHaveBeenCalledWith({
        where: { role: 'PROPERTY_MANAGER' },
        select: { username: true },
      });
      expect(mockEmailService.sendNewLeadNotificationToPM).toHaveBeenCalledTimes(2);
      expect(mockEmailService.sendNewLeadNotificationToPM).toHaveBeenCalledWith('pm1@test.com', mockLead);
      expect(mockEmailService.sendNewLeadNotificationToPM).toHaveBeenCalledWith('pm2@test.com', mockLead);
    });

    it('should not send emails if lead has no email address', async () => {
      const sessionId = 'session-789';
      const leadData = {
        name: 'Anonymous User',
        bedrooms: 1,
        status: LeadStatus.NEW,
      };

      mockPrismaService.lead.findUnique.mockResolvedValue(null);
      mockPrismaService.lead.upsert.mockResolvedValue({
        id: '3',
        sessionId,
        ...leadData,
        email: null,
      });

      await service.upsertLead(sessionId, leadData);

      expect(mockEmailService.sendLeadWelcomeEmail).not.toHaveBeenCalled();
      expect(mockEmailService.sendNewLeadNotificationToPM).not.toHaveBeenCalled();
    });
  });

  describe('getLeadBySessionId', () => {
    it('should return lead with all relations', async () => {
      const sessionId = 'session-123';
      const mockLead = {
        ...TestDataFactory.createLead({ sessionId }),
        messages: [
          { id: 1, content: 'Hello', role: MessageRole.USER },
          { id: 2, content: 'Hi there', role: MessageRole.ASSISTANT },
        ],
        propertyInquiries: [],
        tours: [],
        applications: [],
      };

      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);

      const result = await service.getLeadBySessionId(sessionId);

      expect(result).toEqual(mockLead);
      expect(mockPrismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { sessionId },
        include: {
          messages: { orderBy: { createdAt: 'asc' } },
          propertyInquiries: { include: { property: true, unit: true } },
          tours: { include: { property: true, unit: true } },
          applications: { include: { property: true, unit: true } },
        },
      });
    });

    it('should return null if lead not found', async () => {
      mockPrismaService.lead.findUnique.mockResolvedValue(null);

      const result = await service.getLeadBySessionId('nonexistent');

      expect(result).toBeNull();
    });
  });

  describe('getLeadById', () => {
    it('should return lead by ID with relations', async () => {
      const leadId = '123';
      const mockLead = TestDataFactory.createLead({ id: leadId });

      mockPrismaService.lead.findUnique.mockResolvedValue(mockLead);

      const result = await service.getLeadById(leadId);

      expect(result).toEqual(mockLead);
      expect(mockPrismaService.lead.findUnique).toHaveBeenCalledWith({
        where: { id: leadId },
        include: expect.objectContaining({
          messages: { orderBy: { createdAt: 'asc' } },
        }),
      });
    });
  });

  describe('getLeads', () => {
    it('should return all leads with default pagination', async () => {
      const mockLeads = [
        TestDataFactory.createLead({ id: '1' }),
        TestDataFactory.createLead({ id: '2' }),
      ];

      mockPrismaService.lead.findMany.mockResolvedValue(mockLeads);
      mockPrismaService.lead.count.mockResolvedValue(2);

      const result = await service.getLeads();

      expect(result).toEqual({ 
        leads: mockLeads, 
        total: 2,
        page: 1,
        limit: 50,
        totalPages: 1
      });
      expect(mockPrismaService.lead.findMany).toHaveBeenCalledWith({
        where: {},
        include: {
          _count: {
            select: {
              messages: true,
              tours: true,
              applications: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
        skip: 0,
      });
    });

    it('should filter leads by status', async () => {
      const mockLeads = [TestDataFactory.createLead({ status: LeadStatus.QUALIFIED })];

      mockPrismaService.lead.findMany.mockResolvedValue(mockLeads);
      mockPrismaService.lead.count.mockResolvedValue(1);

      await service.getLeads({ status: LeadStatus.QUALIFIED });

      expect(mockPrismaService.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: LeadStatus.QUALIFIED },
        })
      );
    });

    it('should filter leads by search term', async () => {
      mockPrismaService.lead.findMany.mockResolvedValue([]);
      mockPrismaService.lead.count.mockResolvedValue(0);

      await service.getLeads({ search: 'john' });

      expect(mockPrismaService.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: 'john', mode: 'insensitive' } },
              { email: { contains: 'john', mode: 'insensitive' } },
              { phone: { contains: 'john', mode: 'insensitive' } },
            ],
          },
        })
      );
    });

    it('should filter leads by date range', async () => {
      const dateFrom = new Date('2025-01-01');
      const dateTo = new Date('2025-12-31');

      mockPrismaService.lead.findMany.mockResolvedValue([]);
      mockPrismaService.lead.count.mockResolvedValue(0);

      await service.getLeads({ dateFrom, dateTo });

      expect(mockPrismaService.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            createdAt: {
              gte: dateFrom,
              lte: dateTo,
            },
          },
        })
      );
    });

    it('should apply pagination limits', async () => {
      mockPrismaService.lead.findMany.mockResolvedValue([]);
      mockPrismaService.lead.count.mockResolvedValue(0);

      await service.getLeads({ limit: 10, offset: 20 });

      expect(mockPrismaService.lead.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 10,
          skip: 20,
        })
      );
    });
  });

  describe('addMessage', () => {
    it('should create user message', async () => {
      const leadId = 'lead-123';
      const content = 'I am interested in a 2-bedroom apartment';
      const mockMessage = {
        id: 1,
        leadId,
        role: MessageRole.USER,
        content,
        metadata: null,
        createdAt: new Date(),
      };

      mockPrismaService.leadMessage.create.mockResolvedValue(mockMessage);

      const result = await service.addMessage(leadId, MessageRole.USER, content);

      expect(result).toEqual(mockMessage);
      expect(mockPrismaService.leadMessage.create).toHaveBeenCalledWith({
        data: {
          leadId,
          role: MessageRole.USER,
          content,
          metadata: expect.anything(),
        },
      });
    });

    it('should create assistant message with metadata', async () => {
      const leadId = 'lead-456';
      const content = 'I found 3 properties matching your criteria';
      const metadata = { propertyCount: 3, searchCriteria: { bedrooms: 2 } };

      mockPrismaService.leadMessage.create.mockResolvedValue({
        id: 2,
        leadId,
        role: MessageRole.ASSISTANT,
        content,
        metadata,
        createdAt: new Date(),
      });

      await service.addMessage(leadId, MessageRole.ASSISTANT, content, metadata);

      expect(mockPrismaService.leadMessage.create).toHaveBeenCalledWith({
        data: {
          leadId,
          role: MessageRole.ASSISTANT,
          content,
          metadata,
        },
      });
    });
  });

  describe('getConversationHistory', () => {
    it('should return messages ordered by creation date', async () => {
      const leadId = 'lead-123';
      const mockMessages = [
        { id: 1, content: 'First message', role: MessageRole.USER, createdAt: new Date('2025-11-09T10:00:00') },
        { id: 2, content: 'Second message', role: MessageRole.ASSISTANT, createdAt: new Date('2025-11-09T10:01:00') },
        { id: 3, content: 'Third message', role: MessageRole.USER, createdAt: new Date('2025-11-09T10:02:00') },
      ];

      mockPrismaService.leadMessage.findMany.mockResolvedValue(mockMessages);

      const result = await service.getConversationHistory(leadId);

      expect(result).toEqual(mockMessages);
      expect(mockPrismaService.leadMessage.findMany).toHaveBeenCalledWith({
        where: { leadId },
        orderBy: { createdAt: 'asc' },
      });
    });

    it('should return empty array if no messages', async () => {
      mockPrismaService.leadMessage.findMany.mockResolvedValue([]);

      const result = await service.getConversationHistory('lead-999');

      expect(result).toEqual([]);
    });
  });

  describe('searchProperties', () => {
    it('should search properties by bedrooms', async () => {
      const mockUnits = [
        {
          id: 1,
          bedrooms: 2,
          bathrooms: 1,
          property: {
            id: 1,
            address: '123 Main St',
            city: 'Springfield',
            state: 'CA',
          },
        },
      ];

      mockPrismaService.unit.findMany.mockResolvedValue(mockUnits);

      const result = await service.searchProperties({ bedrooms: 2 });

      expect(mockPrismaService.unit.findMany).toHaveBeenCalledWith({
        where: {
          lease: null,
          bedrooms: 2,
        },
        include: { property: true },
        take: 10,
      });
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        bedrooms: 2,
        address: '123 Main St',
      });
    });

    it('should filter by pet-friendly units', async () => {
      mockPrismaService.unit.findMany.mockResolvedValue([]);

      await service.searchProperties({ petFriendly: true });

      expect(mockPrismaService.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            petsAllowed: true,
          }),
        })
      );
    });

    it('should apply custom limit', async () => {
      mockPrismaService.unit.findMany.mockResolvedValue([]);

      await service.searchProperties({ limit: 5 });

      expect(mockPrismaService.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          take: 5,
        })
      );
    });

    it('should only return available units', async () => {
      mockPrismaService.unit.findMany.mockResolvedValue([]);

      await service.searchProperties({});

      expect(mockPrismaService.unit.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            lease: null, // Ensures only vacant units
          }),
        })
      );
    });
  });

  describe('recordPropertyInquiry', () => {
    it('should create property inquiry with default interest level', async () => {
      const leadId = 'lead-123';
      const propertyId = 1;
      const unitId = 5;

      const mockInquiry = {
        id: 1,
        leadId,
        propertyId,
        unitId,
        interest: InterestLevel.MEDIUM,
        createdAt: new Date(),
      };

      mockPrismaService.propertyInquiry.create.mockResolvedValue(mockInquiry);

      const result = await service.recordPropertyInquiry(leadId, propertyId, unitId);

      expect(result).toEqual(mockInquiry);
      expect(mockPrismaService.propertyInquiry.create).toHaveBeenCalledWith({
        data: {
          leadId,
          propertyId,
          unitId,
          interest: InterestLevel.MEDIUM,
        },
      });
    });

    it('should create inquiry with custom interest level', async () => {
      const leadId = 'lead-456';
      const propertyId = 2;

      mockPrismaService.propertyInquiry.create.mockResolvedValue({
        id: 2,
        leadId,
        propertyId,
        unitId: null,
        interest: InterestLevel.HIGH,
        createdAt: new Date(),
      });

      await service.recordPropertyInquiry(leadId, propertyId, undefined, InterestLevel.HIGH);

      expect(mockPrismaService.propertyInquiry.create).toHaveBeenCalledWith({
        data: {
          leadId,
          propertyId,
          unitId: null,
          interest: InterestLevel.HIGH,
        },
      });
    });
  });

  describe('updateLeadStatus', () => {
    it('should update lead status', async () => {
      const leadId = 'lead-123';
      const newStatus = LeadStatus.TOURING;

      const mockUpdatedLead = {
        ...TestDataFactory.createLead({ id: leadId }),
        status: newStatus,
      };

      mockPrismaService.lead.update.mockResolvedValue(mockUpdatedLead);

      const result = await service.updateLeadStatus(leadId, newStatus);

      expect(result.status).toBe(newStatus);
      expect(mockPrismaService.lead.update).toHaveBeenCalledWith({
        where: { id: leadId },
        data: { status: newStatus },
      });
    });

    it('should set convertedAt timestamp when converting lead', async () => {
      const leadId = 'lead-789';

      mockPrismaService.lead.update.mockResolvedValue({
        ...TestDataFactory.createLead({ id: leadId }),
        status: LeadStatus.CONVERTED,
        convertedAt: new Date(),
      });

      await service.updateLeadStatus(leadId, LeadStatus.CONVERTED);

      expect(mockPrismaService.lead.update).toHaveBeenCalledWith({
        where: { id: leadId },
        data: {
          status: LeadStatus.CONVERTED,
          convertedAt: expect.any(Date),
        },
      });
    });
  });

  describe('getLeadStatistics', () => {
    it('should return statistics for all leads', async () => {
      mockPrismaService.lead.count
        .mockResolvedValueOnce(100) // total
        .mockResolvedValueOnce(20)  // new
        .mockResolvedValueOnce(30)  // qualified
        .mockResolvedValueOnce(15)  // touring
        .mockResolvedValueOnce(25)  // converted
        .mockResolvedValueOnce(10); // lost

      const result = await service.getLeadStatistics();

      expect(result).toEqual({
        totalLeads: 100,
        newLeads: 20,
        qualifiedLeads: 30,
        touringLeads: 15,
        convertedLeads: 25,
        lostLeads: 10,
        conversionRate: 25, // 25/100 * 100
      });
    });

    it('should filter statistics by date range', async () => {
      const dateFrom = new Date('2025-01-01');
      const dateTo = new Date('2025-12-31');

      mockPrismaService.lead.count.mockResolvedValue(50);

      await service.getLeadStatistics(dateFrom, dateTo);

      expect(mockPrismaService.lead.count).toHaveBeenCalledWith({
        where: {
          createdAt: {
            gte: dateFrom,
            lte: dateTo,
          },
        },
      });
    });

    it('should calculate 0% conversion rate when no leads', async () => {
      mockPrismaService.lead.count.mockResolvedValue(0);

      const result = await service.getLeadStatistics();

      expect(result.conversionRate).toBe(0);
    });

    it('should calculate conversion rate correctly', async () => {
      mockPrismaService.lead.count
        .mockResolvedValueOnce(200) // total
        .mockResolvedValueOnce(40)  // new
        .mockResolvedValueOnce(60)  // qualified
        .mockResolvedValueOnce(30)  // touring
        .mockResolvedValueOnce(50)  // converted (25%)
        .mockResolvedValueOnce(20); // lost

      const result = await service.getLeadStatistics();

      expect(result.conversionRate).toBe(25); // 50/200 * 100
    });
  });
});
