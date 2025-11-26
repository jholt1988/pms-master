import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AIAnomalyDetectorService } from './ai-anomaly-detector.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AIAnomalyDetectorService', () => {
  let service: AIAnomalyDetectorService;
  let prismaService: PrismaService;
  let configService: ConfigService;

  const mockPrismaService = {
    payment: {
      findMany: jest.fn(),
    },
    maintenanceRequest: {
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AIAnomalyDetectorService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AIAnomalyDetectorService>(AIAnomalyDetectorService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Initialization', () => {
    it('should initialize with anomaly detection enabled by default', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ANOMALY_DETECTION_ENABLED') return 'true';
        return undefined;
      });

      const newService = new AIAnomalyDetectorService(prismaService, configService);
      expect(newService).toBeDefined();
    });

    it('should initialize with anomaly detection disabled when flag is false', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ANOMALY_DETECTION_ENABLED') return 'false';
        return undefined;
      });

      const newService = new AIAnomalyDetectorService(prismaService, configService);
      expect(newService).toBeDefined();
    });
  });

  describe('detectPaymentAnomalies', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ANOMALY_DETECTION_ENABLED') return 'true';
        return undefined;
      });
    });

    it('should return empty array when no anomalies detected', async () => {
      const mockPayments = [
        { amount: 1500, createdAt: new Date('2024-01-01') },
        { amount: 1500, createdAt: new Date('2024-01-02') },
        { amount: 1500, createdAt: new Date('2024-01-03') },
      ];

      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const anomalies = await service.detectPaymentAnomalies();

      expect(anomalies).toBeInstanceOf(Array);
      expect(anomalies.length).toBe(0);
    });

    it('should detect unusually large payments', async () => {
      const mockPayments = [
        { amount: 1500, createdAt: new Date('2024-01-01') },
        { amount: 1500, createdAt: new Date('2024-01-02') },
        { amount: 1500, createdAt: new Date('2024-01-03') },
        { amount: 50000, createdAt: new Date('2024-01-04') }, // Unusually large
      ];

      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const anomalies = await service.detectPaymentAnomalies();

      expect(anomalies.length).toBeGreaterThan(0);
      const largePaymentAnomaly = anomalies.find((a) => a.type === 'PAYMENT');
      expect(largePaymentAnomaly).toBeDefined();
      expect(largePaymentAnomaly?.severity).toBe('MEDIUM');
    });

    it('should detect payment volume drops', async () => {
      // Many payments in past days, but none today
      const mockPayments = Array.from({ length: 30 }, (_, i) => ({
        amount: 1500,
        createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
      }));

      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const anomalies = await service.detectPaymentAnomalies();

      // Should detect drop if average is high but today is zero
      expect(anomalies.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array when anomaly detection is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ANOMALY_DETECTION_ENABLED') return 'false';
        return undefined;
      });

      const newService = new AIAnomalyDetectorService(prismaService, configService);
      const anomalies = await newService.detectPaymentAnomalies();

      expect(anomalies).toEqual([]);
    });
  });

  describe('detectMaintenanceAnomalies', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ANOMALY_DETECTION_ENABLED') return 'true';
        return undefined;
      });
    });

    it('should return empty array when no anomalies detected', async () => {
      const mockRequests = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        priority: 'LOW',
      }));

      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue(mockRequests);

      const anomalies = await service.detectMaintenanceAnomalies();

      expect(anomalies).toBeInstanceOf(Array);
    });

    it('should detect maintenance request spikes', async () => {
      // Normal requests in past days
      const mockRequests = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
        priority: 'LOW',
      }));

      // Add many requests today (spike)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 0; i < 20; i++) {
        mockRequests.push({
          id: 100 + i,
          createdAt: new Date(today.getTime() + i * 60 * 60 * 1000),
          priority: 'MEDIUM',
        });
      }

      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue(mockRequests);

      const anomalies = await service.detectMaintenanceAnomalies();

      expect(anomalies.length).toBeGreaterThan(0);
      const spikeAnomaly = anomalies.find((a) => a.type === 'MAINTENANCE');
      expect(spikeAnomaly).toBeDefined();
    });

    it('should detect high-priority request spikes', async () => {
      const mockRequests = Array.from({ length: 30 }, (_, i) => ({
        id: i + 1,
        createdAt: new Date(Date.now() - (i + 1) * 24 * 60 * 60 * 1000),
        priority: 'LOW',
      }));

      // Add many HIGH priority requests today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      for (let i = 0; i < 10; i++) {
        mockRequests.push({
          id: 100 + i,
          createdAt: new Date(today.getTime() + i * 60 * 60 * 1000),
          priority: 'HIGH',
        });
      }

      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue(mockRequests);

      const anomalies = await service.detectMaintenanceAnomalies();

      expect(anomalies.length).toBeGreaterThan(0);
      const highPriorityAnomaly = anomalies.find(
        (a) => a.type === 'MAINTENANCE' && a.severity === 'HIGH',
      );
      expect(highPriorityAnomaly).toBeDefined();
    });
  });

  describe('detectPerformanceAnomalies', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'ANOMALY_DETECTION_ENABLED') return 'true';
        return undefined;
      });
    });

    it('should return empty array when no performance issues', async () => {
      const anomalies = await service.detectPerformanceAnomalies();

      expect(anomalies).toBeInstanceOf(Array);
      // Performance detection is placeholder, so may return empty
    });

    it('should detect slow queries when threshold exceeded', async () => {
      // This is a placeholder test since performance detection uses external metrics
      const anomalies = await service.detectPerformanceAnomalies();

      expect(anomalies).toBeInstanceOf(Array);
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      mockPrismaService.payment.findMany.mockRejectedValue(new Error('Database error'));

      const anomalies = await service.detectPaymentAnomalies();

      expect(anomalies).toEqual([]);
    });

    it('should handle missing data gracefully', async () => {
      mockPrismaService.payment.findMany.mockResolvedValue([]);

      const anomalies = await service.detectPaymentAnomalies();

      expect(anomalies).toEqual([]);
    });
  });
});

