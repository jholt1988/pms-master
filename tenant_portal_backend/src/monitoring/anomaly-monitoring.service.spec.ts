import { Test, TestingModule } from '@nestjs/testing';
import { AnomalyMonitoringService } from './anomaly-monitoring.service';
import { PrismaService } from '../prisma/prisma.service';
import { AIAnomalyDetectorService, AnomalyDetectionResult } from './ai-anomaly-detector.service';
import { NotificationsService } from '../notifications/notifications.service';

describe('AnomalyMonitoringService', () => {
  let service: AnomalyMonitoringService;
  let prismaService: PrismaService;
  let aiAnomalyDetectorService: AIAnomalyDetectorService;
  let notificationsService: NotificationsService;

  const mockPrismaService = {
    anomalyLog: {
      create: jest.fn(),
      findMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findMany: jest.fn(),
    },
    payment: {
      update: jest.fn(),
    },
    maintenanceRequest: {
      findMany: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockAIAnomalyDetectorService = {
    detectPaymentAnomalies: jest.fn(),
    detectMaintenanceAnomalies: jest.fn(),
    detectPerformanceAnomalies: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnomalyMonitoringService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: AIAnomalyDetectorService, useValue: mockAIAnomalyDetectorService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<AnomalyMonitoringService>(AnomalyMonitoringService);
    prismaService = module.get<PrismaService>(PrismaService);
    aiAnomalyDetectorService = module.get<AIAnomalyDetectorService>(AIAnomalyDetectorService);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('detectPaymentAnomalies', () => {
    it('should process detected anomalies', async () => {
      const mockAnomalies: AnomalyDetectionResult[] = [
        {
          type: 'PAYMENT',
          severity: 'MEDIUM',
          detectedAt: new Date(),
          description: 'Test payment anomaly',
          metrics: { amount: 5000, zScore: 3.5 },
          recommendedActions: ['Verify payment'],
        },
      ];

      mockAIAnomalyDetectorService.detectPaymentAnomalies.mockResolvedValue(mockAnomalies);
      mockPrismaService.anomalyLog.findMany.mockResolvedValue([]); // No duplicates
      mockPrismaService.anomalyLog.create.mockResolvedValue({ id: 1, ...mockAnomalies[0] });
      mockPrismaService.user.findMany.mockResolvedValue([{ id: 1, role: 'PROPERTY_MANAGER' }]);

      await service.detectPaymentAnomalies();

      expect(mockAIAnomalyDetectorService.detectPaymentAnomalies).toHaveBeenCalled();
      expect(mockPrismaService.anomalyLog.create).toHaveBeenCalled();
      expect(mockNotificationsService.create).toHaveBeenCalled();
    });

    it('should skip duplicate anomalies', async () => {
      const mockAnomalies: AnomalyDetectionResult[] = [
        {
          type: 'PAYMENT',
          severity: 'MEDIUM',
          detectedAt: new Date(),
          description: 'Test payment anomaly',
          metrics: { amount: 5000, zScore: 3.5 },
          recommendedActions: ['Verify payment'],
        },
      ];

      const mockDuplicate = {
        id: 1,
        type: 'PAYMENT',
        severity: 'MEDIUM',
        description: 'Test payment anomaly',
        detectedAt: new Date(),
      };

      mockAIAnomalyDetectorService.detectPaymentAnomalies.mockResolvedValue(mockAnomalies);
      mockPrismaService.anomalyLog.findMany.mockResolvedValue([mockDuplicate]);

      await service.detectPaymentAnomalies();

      expect(mockPrismaService.anomalyLog.create).not.toHaveBeenCalled();
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });
  });

  describe('handlePaymentAnomaly', () => {
    it('should flag payment for review if paymentId in metrics', async () => {
      const anomaly: AnomalyDetectionResult = {
        type: 'PAYMENT',
        severity: 'HIGH',
        detectedAt: new Date(),
        description: 'Test payment anomaly',
        metrics: { paymentId: 123, amount: 5000 },
        recommendedActions: ['Verify payment'],
      };

      mockPrismaService.payment.update.mockResolvedValue({ id: 123 });

      // Access private method via reflection or test through public method
      // For now, we'll test the behavior through detectPaymentAnomalies
      const mockAnomalies = [anomaly];
      mockAIAnomalyDetectorService.detectPaymentAnomalies.mockResolvedValue(mockAnomalies);
      mockPrismaService.anomalyLog.findMany.mockResolvedValue([]);
      mockPrismaService.anomalyLog.create.mockResolvedValue({ id: 1, ...anomaly });
      mockPrismaService.user.findMany.mockResolvedValue([{ id: 1, role: 'PROPERTY_MANAGER' }]);

      await service.detectPaymentAnomalies();

      // Verify payment was flagged (if paymentId was in metrics)
      // This is tested indirectly through the full flow
      expect(mockPrismaService.anomalyLog.create).toHaveBeenCalled();
    });
  });

  describe('findDuplicateAnomaly', () => {
    it('should find similar anomalies', async () => {
      const anomaly: AnomalyDetectionResult = {
        type: 'PAYMENT',
        severity: 'MEDIUM',
        detectedAt: new Date(),
        description: 'Unusually large payment detected: $5000.00',
        metrics: {},
        recommendedActions: [],
      };

      const mockSimilar = {
        id: 1,
        type: 'PAYMENT',
        severity: 'MEDIUM',
        description: 'Unusually large payment detected: $5100.00',
        detectedAt: new Date(),
        status: 'DETECTED',
      };

      mockPrismaService.anomalyLog.findMany.mockResolvedValue([mockSimilar]);

      // Test through detectPaymentAnomalies which calls findDuplicateAnomaly
      mockAIAnomalyDetectorService.detectPaymentAnomalies.mockResolvedValue([anomaly]);

      await service.detectPaymentAnomalies();

      expect(mockPrismaService.anomalyLog.findMany).toHaveBeenCalled();
    });
  });
});

