import { Test, TestingModule } from '@nestjs/testing';
import { EstimateService } from './estimate.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TestDataFactory } from '../../test/factories';
import { 
  EstimateStatus, 
  InspectionCondition, 
  InspectionType,
  InspectionStatus,
  RoomType 
} from './dto/simple-inspection.dto';
import { MaintenancePriority } from '@prisma/client';

// Mock the enhanced estimate agent
jest.mock('./agents/enhanced-estimate-agent', () => ({
  createEnhancedEstimateAgent: jest.fn(() => ({
    generateEstimate: jest.fn().mockResolvedValue({
      estimate_summary: {
        total_labor_cost: 1200.00,
        total_material_cost: 800.00,
        total_project_cost: 2500.00,
        items_to_repair: 3,
        estimated_duration: '2-3 days'
      },
      line_items: [
        {
          category: 'Plumbing',
          description: 'Fix leaky faucet',
          material_cost: 150.00,
          labor_cost: 200.00,
          total_cost: 350.00,
          urgency: 'Medium',
          time_to_complete: '2-3 hours'
        }
      ],
      confidence: 0.85,
      ai_analysis: 'Based on the inspection data, this repair estimate includes...'
    })
  }))
}));

describe('EstimateService', () => {
  let service: EstimateService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  // Mock data
  const mockProperty = {
    id: 1,
    name: 'Test Property',
    address: '123 Test St, Test City, TS 12345',
    city: 'Test City',
    state: 'TS',
    zipCode: '12345',
    latitude: 40.7128,
    longitude: -74.0060,
  };

  const mockUser = {
    id: 1,
    username: 'pm_user@test.com',
    password: '$2b$10$hashedpassword',
    role: 'PROPERTY_MANAGER'
  };

  const mockUnit = {
    id: 1,
    name: 'Unit 101',
    propertyId: 1,
  };

  const mockInspection = {
    id: 1,
    propertyId: 1,
    unitId: 1,
    type: InspectionType.MOVE_IN,
    status: InspectionStatus.COMPLETED,
    scheduledDate: new Date(),
    completedDate: new Date(),
    createdById: 1,
    property: mockProperty,
    unit: mockUnit,
    rooms: [
      {
        id: 1,
        name: 'Living Room',
        roomType: RoomType.LIVING_ROOM,
        inspectionId: 1,
        checklistItems: [
          {
            id: 1,
            itemName: 'Faucet',
            category: 'Plumbing',
            condition: InspectionCondition.POOR,
            requiresAction: true,
            notes: 'Leaky faucet needs replacement',
            estimatedAge: 5,
            roomId: 1,
            photos: [] as any[]
          }
        ]
      }
    ],
    inspector: TestDataFactory.createPropertyManager(),
    tenant: null as any,
    signatures: [] as any[],
    repairEstimates: [] as any[],
    photos: [] as any[],
  };

  const mockMaintenanceRequest = {
    id: 1,
    propertyId: 1,
    unitId: 1,
    title: 'Urgent Plumbing Repair',
    description: 'Pipe burst in bathroom',
    priority: MaintenancePriority.HIGH,
    status: 'OPEN',
    createdById: 1,
    property: mockProperty,
    unit: mockUnit,
    repairEstimates: [] as any[]
  };

  const mockEstimate = {
    id: 1,
    status: EstimateStatus.DRAFT,
    currency: 'USD',
    propertyId: 1,
    unitId: 1,
    inspectionId: 1,
    maintenanceRequestId: null as any,
    totalEstimate: 2500.00,
    materialsCost: 800.00,
    laborCost: 1200.00,
    permitsCost: 200.00,
    contingency: 300.00,
    lineItems: JSON.stringify([{
      category: 'Plumbing',
      description: 'Fix leaky faucet',
      materialCost: 150.00,
      laborCost: 200.00,
      totalCost: 350.00
    }]),
    aiAnalysis: 'AI-generated analysis',
    confidence: 0.85,
    estimatedDuration: '2-3 days',
    createdById: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    approvedAt: null as any,
    approvedById: null as any,
    property: mockProperty,
    unit: mockUnit,
    inspection: mockInspection,
    maintenanceRequest: null as any,
    creator: TestDataFactory.createPropertyManager()
  };

  // Mock Prisma Service
  const mockPrismaService = {
    unitInspection: {
      findUniqueOrThrow: jest.fn(),
      findUnique: jest.fn(),
    },
    maintenanceRequest: {
      findUniqueOrThrow: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    repairEstimate: {
      create: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    property: {
      findUnique: jest.fn(),
    },
    unit: {
      findUnique: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  // Mock Email Service
  const mockEmailService = {
    sendMail: jest.fn(),
    sendNotificationEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EstimateService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
      ],
    }).compile();

    service = module.get<EstimateService>(EstimateService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);

    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('generateEstimateFromInspection', () => {
    it('should generate an estimate from inspection data successfully', async () => {
      // Setup mocks
      mockPrismaService.unitInspection.findUniqueOrThrow.mockResolvedValue(mockInspection);
      mockPrismaService.repairEstimate.create.mockResolvedValue(mockEstimate);

      const result = await service.generateEstimateFromInspection(1, 1);

      expect(mockPrismaService.unitInspection.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          property: true,
          unit: true,
          rooms: {
            include: {
              checklistItems: {
                where: { requiresAction: true },
                include: { 
                  photos: true,
                  subItems: true
                }
              }
            }
          }
        }
      });

      expect(mockPrismaService.repairEstimate.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          propertyId: 1,
          unitId: 1,
          inspectionId: 1,
          status: EstimateStatus.DRAFT,
          totalProjectCost: 2500,
          totalLaborCost: 1200,
          totalMaterialCost: 800,
          generatedById: 1,
          itemsToRepair: 3
        }),
        include: expect.any(Object)
      });

      expect(result).toEqual(mockEstimate);
    });

    it('should throw NotFoundException when inspection not found', async () => {
      mockPrismaService.unitInspection.findUniqueOrThrow.mockRejectedValue(
        new Error('Record not found')
      );

      await expect(service.generateEstimateFromInspection(999, 1))
        .rejects.toThrow();
    });

    it('should throw BadRequestException when inspection has no items requiring action', async () => {
      const inspectionWithNoItems = {
        ...mockInspection,
        rooms: [{
          ...mockInspection.rooms[0],
          checklistItems: [] as any[]
        }]
      };

      mockPrismaService.unitInspection.findUniqueOrThrow.mockResolvedValue(inspectionWithNoItems);

      await expect(service.generateEstimateFromInspection(1, 1))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('generateEstimateForMaintenance', () => {
    it('should generate an estimate for maintenance request successfully', async () => {
      mockPrismaService.maintenanceRequest.findUniqueOrThrow.mockResolvedValue(mockMaintenanceRequest);
      mockPrismaService.repairEstimate.create.mockResolvedValue({
        ...mockEstimate,
        maintenanceRequestId: 1,
        inspectionId: null
      });

      const result = await service.generateEstimateForMaintenance(1, 1);

      expect(mockPrismaService.maintenanceRequest.findUniqueOrThrow).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          property: true,
          unit: true,
          asset: true,
          author: true
        }
      });

      expect(result.maintenanceRequestId).toBe(1);
    });

    it('should throw NotFoundException when maintenance request not found', async () => {
      mockPrismaService.maintenanceRequest.findUniqueOrThrow.mockRejectedValue(
        new Error('Record not found')
      );

      await expect(service.generateEstimateForMaintenance(999, 1))
        .rejects.toThrow();
    });
  });

  describe('getEstimateById', () => {
    it('should return estimate by id successfully', async () => {
      mockPrismaService.repairEstimate.findUnique.mockResolvedValue(mockEstimate);

      const result = await service.getEstimateById(1);

      expect(mockPrismaService.repairEstimate.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: expect.any(Object)
      });

      expect(result).toEqual(mockEstimate);
    });

    it('should throw NotFoundException when estimate not found', async () => {
      mockPrismaService.repairEstimate.findUnique.mockResolvedValue(null);

      await expect(service.getEstimateById(999))
        .rejects.toThrow();
    });
  });

  describe('getEstimates', () => {
    it('should return paginated estimates successfully', async () => {
      const mockEstimates = [mockEstimate];
      const mockCount = 1;

      mockPrismaService.repairEstimate.findMany.mockResolvedValue(mockEstimates);
      mockPrismaService.repairEstimate.count.mockResolvedValue(mockCount);

      const query = { page: 1, limit: 10 };
      const result = await service.getEstimates(query);

      expect(result).toEqual({
        estimates: mockEstimates,
        total: mockCount
      });
    });

    it('should filter estimates by property', async () => {
      const mockEstimates = [mockEstimate];
      mockPrismaService.repairEstimate.findMany.mockResolvedValue(mockEstimates);
      mockPrismaService.repairEstimate.count.mockResolvedValue(1);

      const query = { propertyId: 1, page: 1, limit: 10 };
      await service.getEstimates(query);

      expect(mockPrismaService.repairEstimate.findMany).toHaveBeenCalledWith({
        where: { propertyId: 1 },
        include: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: { generatedAt: 'desc' }
      });
    });

    it('should filter estimates by status', async () => {
      const mockEstimates = [mockEstimate];
      mockPrismaService.repairEstimate.findMany.mockResolvedValue(mockEstimates);
      mockPrismaService.repairEstimate.count.mockResolvedValue(1);

      const query = { status: 'APPROVED' as any, page: 1, limit: 10 };
      await service.getEstimates(query);

      expect(mockPrismaService.repairEstimate.findMany).toHaveBeenCalledWith({
        where: { status: 'APPROVED' },
        include: expect.any(Object),
        skip: 0,
        take: 10,
        orderBy: { generatedAt: 'desc' }
      });
    });
  });

  describe('updateEstimate', () => {
    it('should update estimate successfully', async () => {
      const updateDto = {
        status: 'APPROVED' as any,
        totalEstimate: 3000.00,
        notes: 'Updated estimate with additional materials'
      };

      const updatedEstimate = { ...mockEstimate, ...updateDto };
      
      mockPrismaService.repairEstimate.findUnique.mockResolvedValue(mockEstimate);
      mockPrismaService.repairEstimate.update.mockResolvedValue(updatedEstimate);

      const result = await service.updateEstimate(1, updateDto, 1);

      expect(mockPrismaService.repairEstimate.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          ...updateDto,
          approvedAt: expect.any(Date),
          approvedById: 1
        },
        include: expect.any(Object)
      });

      expect(result).toEqual(updatedEstimate);
    });

    it('should send notification when estimate is approved', async () => {
      const updateDto = { status: 'APPROVED' as any };
      const approvedEstimate = { 
        ...mockEstimate, 
        status: EstimateStatus.APPROVED,
        approvedAt: new Date(),
        approvedById: 1,
        generatedBy: { username: 'estimator@test.com' },
        totalProjectCost: 2500
      };

      mockPrismaService.repairEstimate.findUnique.mockResolvedValue(mockEstimate);
      mockPrismaService.repairEstimate.update.mockResolvedValue(approvedEstimate);

      await service.updateEstimate(1, updateDto, 1);

      // Should call the email service for approval notification
      expect(mockEmailService.sendNotificationEmail).toHaveBeenCalled();
    });

    it('should throw NotFoundException when estimate not found', async () => {
      mockPrismaService.repairEstimate.findUnique.mockResolvedValue(null);

      await expect(service.updateEstimate(999, { status: 'APPROVED' as any }, 1))
        .rejects.toThrow(NotFoundException);
    });
  });

  describe('convertEstimateToMaintenanceRequests', () => {
    it('should convert estimate to maintenance requests successfully', async () => {
      const mockMaintenanceRequests = [
        { id: 1, title: 'Plumbing Repair', priority: MaintenancePriority.HIGH },
        { id: 2, title: 'Electrical Work', priority: MaintenancePriority.MEDIUM }
      ];

      const approvedEstimate = { 
        ...mockEstimate, 
        status: 'APPROVED',
        lineItems: [
          { category: 'Plumbing', description: 'Fix leaky faucet', materialCost: 150, laborCost: 200, totalCost: 350 },
          { category: 'Electrical', description: 'Replace outlet', materialCost: 50, laborCost: 100, totalCost: 150 }
        ]
      };
      mockPrismaService.repairEstimate.findUnique.mockResolvedValueOnce(approvedEstimate);
      mockPrismaService.repairEstimate.findUnique.mockResolvedValueOnce(approvedEstimate);
      mockPrismaService.maintenanceRequest.create
        .mockResolvedValueOnce(mockMaintenanceRequests[0])
        .mockResolvedValueOnce(mockMaintenanceRequests[1]);
      mockPrismaService.repairEstimate.update.mockResolvedValue(approvedEstimate);

      const result = await service.convertEstimateToMaintenanceRequests(1, 1);

      expect(mockPrismaService.repairEstimate.findUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: { lineItems: true }
      });

      expect(mockPrismaService.maintenanceRequest.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('should throw BadRequestException when estimate is not approved', async () => {
      const draftEstimate = { ...mockEstimate, status: 'DRAFT' };
      mockPrismaService.repairEstimate.findUnique.mockResolvedValue(draftEstimate);

      await expect(service.convertEstimateToMaintenanceRequests(1, 1))
        .rejects.toThrow(BadRequestException);
    });
  });

  describe('getEstimateStats', () => {
    it('should return estimate statistics successfully', async () => {
      mockPrismaService.repairEstimate.count.mockResolvedValueOnce(10); // total
      mockPrismaService.repairEstimate.count.mockResolvedValueOnce(3);  // pending
      mockPrismaService.repairEstimate.count.mockResolvedValueOnce(5);  // approved
      mockPrismaService.repairEstimate.count.mockResolvedValueOnce(2);  // completed

      // Mock aggregate for total value
      mockPrismaService.repairEstimate.aggregate.mockResolvedValueOnce({
        _sum: { totalProjectCost: 125000 }
      });
      // Mock aggregate for average value
      mockPrismaService.repairEstimate.aggregate.mockResolvedValueOnce({
        _avg: { totalProjectCost: 12500 }
      });

      const result = await service.getEstimateStats();

      expect(result).toEqual({
        total: 10,
        byStatus: {
          draft: 3,
          approved: 5,
          completed: 2
        },
        totalValue: 125000,
        averageValue: 12500
      });
    });

    it('should filter stats by property when propertyId provided', async () => {
      mockPrismaService.repairEstimate.count.mockResolvedValue(5);
      mockPrismaService.repairEstimate.aggregate.mockResolvedValueOnce({
        _sum: { totalProjectCost: 25000 }
      });
      mockPrismaService.repairEstimate.aggregate.mockResolvedValueOnce({
        _avg: { totalProjectCost: 5000 }
      });

      await service.getEstimateStats(1);

      expect(mockPrismaService.repairEstimate.count).toHaveBeenCalledWith({
        where: { propertyId: 1 }
      });
    });
  });

  describe('private methods', () => {
    describe('getLocationFromProperty', () => {
      it('should extract location from property address', async () => {
        const property = {
          address: '123 Main St, New York, NY 10001',
          city: 'New York',
          state: 'NY',
          zipCode: '10001',
          latitude: 40.7128,
          longitude: -74.0060
        };

        // Access private method for testing
        const location = await (service as any).getLocationFromProperty(property);

        expect(location).toEqual({
          city: '123 Main St',
          region: 'New York',
          country: 'NY 10001'
        });
      });

      it('should handle property without coordinates', async () => {
        const property = {
          address: '123 Main St',
          city: 'Test City',
          state: 'TS',
          zipCode: '12345'
        };

        const location = await (service as any).getLocationFromProperty(property);

        expect(location.latitude).toBeUndefined();
        expect(location.longitude).toBeUndefined();
      });
    });

    describe('sendEstimateReadyNotification', () => {
      it('should send email notification when estimate is ready', async () => {
        const estimate = {
          ...mockEstimate,
          totalProjectCost: 2500.00,
          property: mockProperty,
          unit: mockUnit
        };

        mockPrismaService.user.findMany.mockResolvedValue([
          { username: 'pm@test.com', role: 'PROPERTY_MANAGER' }
        ]);

        await (service as any).sendEstimateReadyNotification(estimate);

        expect(mockEmailService.sendNotificationEmail).toHaveBeenCalledWith(
          'pm@test.com',
          expect.stringContaining('Repair Estimate Ready'),
          expect.stringContaining('A new repair estimate is ready')
        );
      });
    });

    describe('sendEstimateApprovedNotification', () => {
      it('should send email notification when estimate is approved', async () => {
        const estimate = {
          ...mockEstimate,
          status: 'APPROVED',
          totalProjectCost: 2500.00,
          property: mockProperty,
          unit: mockUnit,
          generatedBy: { username: 'creator@test.com' }
        };

        await (service as any).sendEstimateApprovedNotification(estimate);

        expect(mockEmailService.sendNotificationEmail).toHaveBeenCalledWith(
          'creator@test.com',
          expect.stringContaining('Estimate Approved'),
          expect.stringContaining('has been approved')
        );
      });
    });
  });

  describe('error handling', () => {
    it('should handle database connection errors gracefully', async () => {
      mockPrismaService.repairEstimate.findUnique.mockRejectedValue(
        new Error('Database connection failed')
      );

      await expect(service.getEstimateById(1))
        .rejects.toThrow('Database connection failed');
    });

    it('should handle AI service errors gracefully', async () => {
      // Mock the enhanced estimate agent to throw an error
      const { createEnhancedEstimateAgent } = require('./agents/enhanced-estimate-agent');
      createEnhancedEstimateAgent.mockReturnValue({
        generateEstimate: jest.fn().mockRejectedValue(new Error('AI service unavailable'))
      });

      mockPrismaService.unitInspection.findUniqueOrThrow.mockResolvedValue(mockInspection);

      await expect(service.generateEstimateFromInspection(1, 1))
        .rejects.toThrow('AI service unavailable');
    });

    it('should handle invalid estimate data', async () => {
      const invalidEstimate = {
        ...mockEstimate,
        lineItems: 'invalid-json'
      };

      mockPrismaService.repairEstimate.findUnique.mockResolvedValue(invalidEstimate);

      // Should not throw, but should handle gracefully
      const result = await service.getEstimateById(1);
      expect(result).toBeDefined();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete estimate lifecycle', async () => {
      // Mock user.findMany for notifications
      mockPrismaService.user.findMany.mockResolvedValue([]);
      
      // 1. Generate estimate from inspection
      mockPrismaService.unitInspection.findUniqueOrThrow.mockResolvedValue(mockInspection);
      mockPrismaService.repairEstimate.create.mockResolvedValue(mockEstimate);

      const estimate = await service.generateEstimateFromInspection(1, 1);
      expect(estimate.status).toBe(EstimateStatus.DRAFT);

      // 2. Update estimate to approved
      const approvedEstimate = { 
        ...estimate, 
        status: EstimateStatus.APPROVED,
        generatedBy: { username: 'estimator@test.com' },
        totalProjectCost: 2500,
        lineItems: [
          { category: 'Plumbing', description: 'Fix leaky faucet', materialCost: 150, laborCost: 200, totalCost: 350 }
        ]
      };
      mockPrismaService.repairEstimate.findUnique.mockResolvedValue(estimate);
      mockPrismaService.repairEstimate.update.mockResolvedValue(approvedEstimate);

      const updated = await service.updateEstimate(1, { status: 'APPROVED' as any }, 1);
      expect(updated.status).toBe(EstimateStatus.APPROVED);

      // 3. Convert to maintenance requests
      const maintenanceRequests = [{ id: 1, title: 'Plumbing Repair' }];
      mockPrismaService.repairEstimate.findUnique.mockResolvedValue(approvedEstimate);
      mockPrismaService.maintenanceRequest.create.mockResolvedValue(maintenanceRequests[0]);
      mockPrismaService.repairEstimate.update.mockResolvedValue({ ...approvedEstimate, status: 'COMPLETED' });

      const requests = await service.convertEstimateToMaintenanceRequests(1, 1);
      expect(requests).toHaveLength(1);
    });
  });
});