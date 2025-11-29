import { Test, TestingModule } from '@nestjs/testing';
import { MaintenanceService } from './maintenance.service';
import { AIMaintenanceService } from './ai-maintenance.service';
import { SystemUserService } from '../shared/system-user.service';
import { AIMaintenanceMetricsService } from './ai-maintenance-metrics.service';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenancePriority, Status, Role } from '@prisma/client';
import { CreateMaintenanceRequestDto } from './dto/create-maintenance-request.dto';
import { AssignTechnicianDto } from './dto/assign-technician.dto';

describe('MaintenanceService - Metrics Integration', () => {
  let service: MaintenanceService;
  let aiMaintenanceService: AIMaintenanceService;
  let systemUserService: SystemUserService;
  let aiMetrics: AIMaintenanceMetricsService;
  let prismaService: PrismaService;

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

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MaintenanceService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AIMaintenanceService, useValue: mockAIMaintenanceService },
        { provide: SystemUserService, useValue: mockSystemUserService },
        { provide: AIMaintenanceMetricsService, useValue: mockAIMetrics },
      ],
    }).compile();

    service = module.get<MaintenanceService>(MaintenanceService);
    aiMaintenanceService = module.get<AIMaintenanceService>(AIMaintenanceService);
    systemUserService = module.get<SystemUserService>(SystemUserService);
    aiMetrics = module.get<AIMaintenanceMetricsService>(AIMaintenanceMetricsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('create - Metrics Integration', () => {
    it('should record metric when AI assigns priority successfully', async () => {
      const userId = 1;
      const dto: CreateMaintenanceRequestDto = {
        title: 'Water leak',
        description: 'Water leaking from ceiling',
      };

      const createdRequest = {
        id: 1,
        title: dto.title,
        description: dto.description,
        priority: MaintenancePriority.HIGH,
        status: Status.PENDING,
        authorId: userId,
      };

      mockAIMaintenanceService.assignPriorityWithAI.mockResolvedValue(MaintenancePriority.HIGH);
      mockPrismaService.maintenanceRequest.create.mockResolvedValue(createdRequest);
      mockPrismaService.maintenanceRequestHistory.create.mockResolvedValue({} as any);

      await service.create(userId, dto);

      expect(mockAIMetrics.recordMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'assignPriority',
          success: true,
          fallbackUsed: false,
        }),
      );
      expect(mockAIMetrics.recordMetric).toHaveBeenCalledTimes(1);
    });

    it('should record metric with fallback when AI priority assignment fails', async () => {
      const userId = 1;
      const dto: CreateMaintenanceRequestDto = {
        title: 'Water leak',
        description: 'Water leaking from ceiling',
      };

      const createdRequest = {
        id: 1,
        title: dto.title,
        description: dto.description,
        priority: MaintenancePriority.HIGH, // Fallback would assign HIGH for "leak"
        status: Status.PENDING,
        authorId: userId,
      };

      mockAIMaintenanceService.assignPriorityWithAI.mockRejectedValue(
        new Error('API timeout'),
      );
      mockPrismaService.maintenanceRequest.create.mockResolvedValue(createdRequest);
      mockPrismaService.maintenanceRequestHistory.create.mockResolvedValue({} as any);

      await service.create(userId, dto);

      expect(mockAIMetrics.recordMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'assignPriority',
          success: true, // Fallback succeeded
          fallbackUsed: true,
          error: 'API timeout',
        }),
      );
    });

    it('should not record metric when priority is provided', async () => {
      const userId = 1;
      const dto: CreateMaintenanceRequestDto = {
        title: 'Water leak',
        description: 'Water leaking from ceiling',
        priority: MaintenancePriority.HIGH,
      };

      const createdRequest = {
        id: 1,
        ...dto,
        status: Status.PENDING,
        authorId: userId,
      };

      mockPrismaService.maintenanceRequest.create.mockResolvedValue(createdRequest);
      mockPrismaService.maintenanceRequestHistory.create.mockResolvedValue({} as any);

      await service.create(userId, dto);

      expect(mockAIMetrics.recordMetric).not.toHaveBeenCalled();
      expect(mockAIMaintenanceService.assignPriorityWithAI).not.toHaveBeenCalled();
    });
  });

  describe('assignTechnician - Metrics Integration', () => {
    it('should record metric when AI assigns technician successfully', async () => {
      const requestId = 1;
      const actorId = 2;
      const dto: AssignTechnicianDto = {}; // No technicianId provided

      const existingRequest = {
        id: requestId,
        status: Status.PENDING,
        assigneeId: null,
        property: {
          latitude: 40.7128,
          longitude: -74.006,
        },
        asset: {
          category: 'PLUMBING',
        },
      };

      const aiMatch = {
        technician: {
          id: 5,
          name: 'John Plumber',
        },
        score: 87.5,
        reasons: ['Workload: 2 active requests', 'Success rate: 95%'],
      };

      const updatedRequest = {
        id: requestId,
        status: Status.IN_PROGRESS,
        assigneeId: 5,
      };

      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(existingRequest);
      mockAIMaintenanceService.assignTechnician.mockResolvedValue(aiMatch);
      mockPrismaService.maintenanceRequest.update.mockResolvedValue(updatedRequest);
      mockPrismaService.maintenanceRequestHistory.create.mockResolvedValue({} as any);

      await service.assignTechnician(requestId, dto, actorId);

      expect(mockAIMetrics.recordMetric).toHaveBeenCalledWith(
        expect.objectContaining({
          operation: 'assignTechnician',
          success: true,
          requestId: requestId,
          fallbackUsed: false,
        }),
      );
      expect(mockAIMetrics.recordMetric).toHaveBeenCalledTimes(1);
    });

    it('should not record metric when technicianId is provided', async () => {
      const requestId = 1;
      const actorId = 2;
      const dto: AssignTechnicianDto = { technicianId: 5 };

      const existingRequest = {
        id: requestId,
        status: Status.PENDING,
        assigneeId: null,
      };

      const updatedRequest = {
        id: requestId,
        status: Status.IN_PROGRESS,
        assigneeId: 5,
      };

      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(existingRequest);
      mockPrismaService.maintenanceRequest.update.mockResolvedValue(updatedRequest);
      mockPrismaService.maintenanceRequestHistory.create.mockResolvedValue({} as any);

      await service.assignTechnician(requestId, dto, actorId);

      expect(mockAIMetrics.recordMetric).not.toHaveBeenCalled();
      expect(mockAIMaintenanceService.assignTechnician).not.toHaveBeenCalled();
    });
  });

  describe('escalate - System User Integration', () => {
    it('should use system user for escalation notes', async () => {
      const requestId = 1;
      const systemUserId = 99;

      const existingRequest = {
        id: requestId,
        status: Status.PENDING,
        priority: MaintenancePriority.MEDIUM,
        authorId: 1,
      };

      const updatedRequest = {
        id: requestId,
        status: Status.PENDING,
        priority: MaintenancePriority.HIGH,
        authorId: 1,
      };

      mockPrismaService.maintenanceRequest.findUnique.mockResolvedValue(existingRequest);
      mockPrismaService.maintenanceRequest.update.mockResolvedValue(updatedRequest);
      mockPrismaService.maintenanceRequestHistory.create.mockResolvedValue({} as any);
      mockPrismaService.maintenanceNote.create.mockResolvedValue({} as any);
      mockSystemUserService.getSystemUserId.mockResolvedValue(systemUserId);

      await service.escalate(requestId, {
        reason: 'SLA breach risk',
        factors: ['High priority', 'No technician assigned'],
      });

      expect(mockSystemUserService.getSystemUserId).toHaveBeenCalled();
      expect(mockPrismaService.maintenanceNote.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            author: { connect: { id: systemUserId } },
          }),
        }),
      );
    });
  });
});

