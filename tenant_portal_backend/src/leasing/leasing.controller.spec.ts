import { Test, TestingModule } from '@nestjs/testing';
import { LeasingController } from './leasing.controller';
import { LeasingService } from './leasing.service';
import { HttpException } from '@nestjs/common';
import { LeadStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

describe('LeasingController (current contract)', () => {
  let controller: LeasingController;
  const service = {
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

  const mockPrismaService = {
    userOrganization: {
      findMany: jest.fn().mockResolvedValue([{ organizationId: 'org-1', role: 'MEMBER' }]),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LeasingController],
      providers: [
        { provide: LeasingService, useValue: service },
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    controller = module.get(LeasingController);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('createLead', () => {
    it('returns the upserted lead (no wrapper)', async () => {
      const lead = {
        id: 'lead_1',
        sessionId: 'sess_abc123',
        name: 'Jane Williams',
        status: 'NEW',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      service.upsertLead.mockResolvedValue(lead);

      const result = await controller.createLead({ sessionId: 'sess_abc123', name: 'Jane Williams' });
      expect(result).toEqual(lead);
      expect(service.upsertLead).toHaveBeenCalledWith('sess_abc123', { name: 'Jane Williams' });
    });

    it('throws if sessionId missing', async () => {
      await expect(controller.createLead({ name: 'No Session' } as any)).rejects.toThrow(HttpException);
      await expect(controller.createLead({ name: 'No Session' } as any)).rejects.toThrow('sessionId is required');
    });
  });

  describe('getLeadBySession / getLeadById', () => {
    it('getLeadBySession returns lead or 404', async () => {
      const lead = { id: 'lead_1', sessionId: 'sess_abc123', createdAt: new Date(), updatedAt: new Date() };
      service.getLeadBySessionId.mockResolvedValue(lead);
      expect(await controller.getLeadBySession('sess_abc123')).toEqual(lead);

      service.getLeadBySessionId.mockResolvedValue(null);
      await expect(controller.getLeadBySession('missing')).rejects.toThrow(HttpException);
    });

    it('getLeadById returns lead or 404', async () => {
      const lead = { id: 'lead_1', createdAt: new Date(), updatedAt: new Date() };
      service.getLeadById.mockResolvedValue(lead);
      expect(await controller.getLeadById('lead_1')).toEqual(lead);

      service.getLeadById.mockResolvedValue(null);
      await expect(controller.getLeadById('missing')).rejects.toThrow(HttpException);
    });
  });

  describe('addMessage / getMessages', () => {
    it('addMessage returns created message (no wrapper)', async () => {
      const msg = { id: 1, leadId: 'lead_1', role: 'USER', content: 'Hello', createdAt: new Date() };
      service.addMessage.mockResolvedValue(msg);

      const result = await controller.addMessage('lead_1', { role: 'USER', content: 'Hello' });
      expect(result).toEqual(msg);
      expect(service.addMessage).toHaveBeenCalledWith('lead_1', 'USER', 'Hello', undefined);
    });

    it('addMessage validates role/content separately', async () => {
      await expect(controller.addMessage('lead_1', { role: '', content: 'x' } as any)).rejects.toThrow('role is required');
      await expect(controller.addMessage('lead_1', { role: 'USER', content: '' } as any)).rejects.toThrow('content is required');
    });

    it('getMessages returns array from service', async () => {
      const messages = [{ id: 1, leadId: 'lead_1', content: 'a' }];
      service.getConversationHistory.mockResolvedValue(messages);

      const result = await controller.getMessages('lead_1');
      expect(result).toEqual(messages);
      expect(service.getConversationHistory).toHaveBeenCalledWith('lead_1');
    });
  });

  describe('searchProperties', () => {
    it('POST body criteria and returns array (no wrapper)', async () => {
      const props = [{ id: 1, bedrooms: 2, rent: 1800 }];
      service.searchProperties.mockResolvedValue(props);

      const result = await controller.searchProperties({ bedrooms: 2, maxRent: 2000, petFriendly: true, limit: 10 });
      expect(result).toEqual(props);
      expect(service.searchProperties).toHaveBeenCalledWith({ bedrooms: 2, maxRent: 2000, petFriendly: true, limit: 10 });
    });
  });

  describe('recordInquiry', () => {
    it('requires propertyId and maps interest->interestLevel', async () => {
      // propertyId / unitId are UUID strings (Property.id, Unit.id are @db.Uuid).
      // The controller must forward them through unchanged — NOT numeric-coerce
      // them (Number('<uuid>')=NaN previously corrupted the Prisma write -> 500).
      const propertyId = '11111111-1111-1111-1111-111111111111';
      const unitId = '22222222-2222-2222-2222-222222222222';
      const inquiry = { id: 1, leadId: 'lead_1', propertyId, unitId, interest: 'HIGH', createdAt: new Date() };
      service.recordPropertyInquiry.mockResolvedValue(inquiry);

      const result = await controller.recordInquiry('lead_1', { propertyId, unitId, interest: 'HIGH' });
      expect(result).toEqual({ ...inquiry, interestLevel: 'HIGH' });
      expect(service.recordPropertyInquiry).toHaveBeenCalledWith('lead_1', propertyId, unitId, 'HIGH');

      await expect(controller.recordInquiry('lead_1', { propertyId: '' } as any)).rejects.toThrow('propertyId is required');
    });
  });

  describe('updateStatus', () => {
    it('requires valid LeadStatus and returns lead (no wrapper)', async () => {
      const lead = { id: 'lead_1', status: 'QUALIFIED', updatedAt: new Date() };
      service.updateLeadStatus.mockResolvedValue(lead);

      const result = await controller.updateStatus('lead_1', { status: LeadStatus.QUALIFIED });
      expect(result).toEqual(lead);
      expect(service.updateLeadStatus).toHaveBeenCalledWith('lead_1', LeadStatus.QUALIFIED, undefined);

      await expect(controller.updateStatus('lead_1', { status: '' } as any)).rejects.toThrow('Status is required');
      await expect(controller.updateStatus('lead_1', { status: 'NOT_A_STATUS' } as any)).rejects.toThrow('Invalid status value');
    });
  });

  describe('getStatistics', () => {
    it('returns stats object from service (no wrapper)', async () => {
      const stats = { total: 150, new: 45, qualified: 25 };
      service.getLeadStatistics.mockResolvedValue(stats);

      const result = await controller.getStatistics('2024-01-01', '2024-12-31');
      expect(result).toEqual(stats);
      expect(service.getLeadStatistics).toHaveBeenCalledWith(new Date('2024-01-01'), new Date('2024-12-31'), undefined);

      const result2 = await controller.getStatistics();
      expect(result2).toEqual(stats);
    });
  });
});
