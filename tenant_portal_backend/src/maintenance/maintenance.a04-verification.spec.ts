/**
 * A-04 Verification — Owner maintenance flow boundaries
 *
 * Verifies:
 * 1. Owner can create maintenance requests with required propertyId
 * 2. Owner CANNOT create requests without propertyId
 * 3. Owner can add notes/comments
 * 4. Owner CANNOT change maintenance status
 * 5. Owner CANNOT assign technicians
 */

import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceService } from './maintenance.service';
import { AIMaintenanceService } from './ai-maintenance.service';
import { SystemUserService } from '../shared/system-user.service';
import { AIMaintenanceMetricsService } from './ai-maintenance-metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenancePriority, Status, Role, OrgRole } from '@prisma/client';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { MaintenanceController } from './maintenance.controller';
import { AuditLogService } from '../shared/audit-log.service';
import { MaintenanceFeatureExtractionService } from './ai/maintenance-feature-extraction.service';
import { MaintenanceDataQualityService } from './ai/maintenance-data-quality.service';

describe('A-04: Owner maintenance flow boundaries', () => {
  let controller: MaintenanceController;
  let service: MaintenanceService;

  const mockPrismaService = {
    maintenanceRequest: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    maintenanceRequestHistory: {
      create: jest.fn(),
    },
    maintenanceNote: {
      create: jest.fn(),
    },
    user: {
      findFirst: jest.fn(),
    },
    property: {
      findFirst: jest.fn(),
    },
    lease: {
      findFirst: jest.fn(),
    },
  };

  const mockAIMaintenanceService = {
    assignPriorityWithAI: jest.fn(),
    assignTechnician: jest.fn(),
  };

  const mockSystemUserService = {
    getSystemUserId: jest.fn(),
    isSystemUser: jest.fn(),
  };

  const mockAIMetrics = {
    recordMetric: jest.fn(),
    getMetrics: jest.fn(),
  };

  const mockAuditLogService = {
    record: jest.fn(),
  };

  const mockFeatureExtractionService = {
    extractFeatures: jest.fn(),
  };

  const mockDataQualityService = {
    getReport: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MaintenanceController],
      providers: [
        MaintenanceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AIMaintenanceService, useValue: mockAIMaintenanceService },
        { provide: SystemUserService, useValue: mockSystemUserService },
        { provide: AIMaintenanceMetricsService, useValue: mockAIMetrics },
        { provide: AuditLogService, useValue: mockAuditLogService },
        { provide: MaintenanceFeatureExtractionService, useValue: mockFeatureExtractionService },
        { provide: MaintenanceDataQualityService, useValue: mockDataQualityService },
      ],
    }).compile();

    controller = module.get<MaintenanceController>(MaintenanceController);
    service = module.get<MaintenanceService>(MaintenanceService);
  });

  describe('Owner create maintenance request', () => {
    it('allows owner to create request with propertyId', async () => {
      const dto: CreateMaintenanceRequestDto = {
        title: 'Leaky faucet',
        description: 'Kitchen sink dripping',
        propertyId: 'prop-123',
      };

      const mockRequest = {
        id: 1,
        title: dto.title,
        description: dto.description,
        priority: MaintenancePriority.MEDIUM,
        status: Status.PENDING,
        propertyId: dto.propertyId,
      };

      mockAIMaintenanceService.assignPriorityWithAI.mockResolvedValue(MaintenancePriority.MEDIUM);
      mockPrismaService.maintenanceRequest.create.mockResolvedValue(mockRequest);
      mockPrismaService.maintenanceRequestHistory.create.mockResolvedValue({} as any);

      const req = {
        user: { userId: 'owner-1', username: 'owner@test.com', role: Role.PROPERTY_MANAGER },
        org: { orgId: 'org-1', orgRole: OrgRole.OWNER },
      } as any;

      const result = await controller.create(req, dto);

      expect(result).toEqual(mockRequest);
      expect(mockPrismaService.maintenanceRequest.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: dto.title,
            description: dto.description,
            propertyId: dto.propertyId,
          }),
        }),
      );
    });

    it('blocks owner create without propertyId', async () => {
      const dto: CreateMaintenanceRequestDto = {
        title: 'Leaky faucet',
        description: 'Kitchen sink dripping',
        // propertyId missing
      };

      const req = {
        user: { userId: 'owner-1', username: 'owner@test.com', role: Role.PROPERTY_MANAGER },
        org: { orgId: 'org-1', orgRole: OrgRole.OWNER },
      } as any;

      await expect(controller.create(req, dto)).rejects.toThrow('propertyId is required for owners');
    });
  });

  describe('Owner add notes', () => {
    it('allows owner to add notes to maintenance request', async () => {
      const mockRequest = {
        id: 1,
        title: 'Leaky faucet',
        leaseId: null,
      };

      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(mockRequest);
      mockPrismaService.maintenanceNote.create.mockResolvedValue({
        id: 101,
        body: 'Owner update: waiting for parts',
        requestId: 1,
      });

      const req = {
        user: { userId: 'owner-1', username: 'owner@test.com', role: Role.PROPERTY_MANAGER },
        org: { orgId: 'org-1', orgRole: OrgRole.OWNER },
      } as any;

      const result = await controller.addNote('1', { body: 'Owner update: waiting for parts' }, req);

      expect(result).toBeDefined();
      expect(mockPrismaService.maintenanceNote.create).toHaveBeenCalled();
    });
  });

  describe('Owner operational restrictions', () => {
    it('blocks OWNER org role from status changes', async () => {
      await expect(
        service.updateStatusScoped(
          123,
          { status: Status.IN_PROGRESS },
          'owner-user-id',
          Role.PROPERTY_MANAGER,
          'org-1',
          OrgRole.OWNER,
        ),
      ).rejects.toThrow('Owners are read-only for maintenance status changes');
    });

    it('blocks OWNER org role from technician assignment', async () => {
      await expect(
        service.assignTechnicianScoped(
          123,
          { technicianId: 42 },
          'owner-user-id',
          Role.PROPERTY_MANAGER,
          'org-1',
          OrgRole.OWNER,
        ),
      ).rejects.toThrow('Owners are read-only for technician assignment');
    });
  });

  describe('Audit trail verification', () => {
    it('records audit log when owner creates request', async () => {
      const dto: CreateMaintenanceRequestDto = {
        title: 'Leaky faucet',
        description: 'Kitchen sink dripping',
        propertyId: 'prop-123',
      };

      const mockRequest = {
        id: 1,
        title: dto.title,
        description: dto.description,
        priority: MaintenancePriority.MEDIUM,
        status: Status.PENDING,
        propertyId: dto.propertyId,
      };

      mockAIMaintenanceService.assignPriorityWithAI.mockResolvedValue(MaintenancePriority.MEDIUM);
      mockPrismaService.maintenanceRequest.create.mockResolvedValue(mockRequest);
      mockPrismaService.maintenanceRequestHistory.create.mockResolvedValue({} as any);

      const req = {
        user: { userId: 'owner-1', username: 'owner@test.com', role: Role.PROPERTY_MANAGER },
        org: { orgId: 'org-1', orgRole: OrgRole.OWNER },
      } as any;

      await controller.create(req, dto);

      expect(mockAuditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({
          orgId: 'org-1',
          actorId: 'owner-1',
          module: 'MAINTENANCE',
          action: 'REQUEST_CREATED',
          entityType: 'MaintenanceRequest',
          entityId: 1,
          result: 'SUCCESS',
        }),
      );
    });
  });
});
