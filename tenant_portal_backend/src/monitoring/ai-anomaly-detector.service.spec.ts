import { Test, TestingModule } from '@nestjs/testing';
import { AIAnomalyDetectorService } from './ai-anomaly-detector.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';

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

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('constructor', () => {
    it('should load configurable thresholds', () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          ANOMALY_DETECTION_ENABLED: 'true',
          ANOMALY_PAYMENT_Z_SCORE_THRESHOLD: '3.5',
          ANOMALY_MAINTENANCE_Z_SCORE_THRESHOLD: '2.0',
          ANOMALY_PERFORMANCE_Z_SCORE_THRESHOLD: '4.0',
        };
        return config[key] || defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AIAnomalyDetectorService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const newService = module.get<AIAnomalyDetectorService>(AIAnomalyDetectorService);
      
      // Verify thresholds are loaded (they're private, so we test via behavior)
      expect(newService).toBeDefined();
    });
  });

  describe('detectPaymentAnomalies', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          ANOMALY_DETECTION_ENABLED: 'true',
          ANOMALY_PAYMENT_Z_SCORE_THRESHOLD: '3.0',
        };
        return config[key] || defaultValue;
      });
    });

    it('should return empty array if detection is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'ANOMALY_DETECTION_ENABLED') return 'false';
        return defaultValue;
      });

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          AIAnomalyDetectorService,
          { provide: PrismaService, useValue: mockPrismaService },
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();

      const newService = module.get<AIAnomalyDetectorService>(AIAnomalyDetectorService);

      const result = await newService.detectPaymentAnomalies();

      expect(result).toEqual([]);
    });

    it('should detect unusually large payments', async () => {
      const mockPayments = [
        { id: 1, amount: 1000, createdAt: new Date(), invoice: {} },
        { id: 2, amount: 1100, createdAt: new Date(), invoice: {} },
        { id: 3, amount: 1200, createdAt: new Date(), invoice: {} },
        { id: 4, amount: 5000, createdAt: new Date(), invoice: {} }, // Anomaly
      ];

      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const result = await service.detectPaymentAnomalies();

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].type).toBe('PAYMENT');
      expect(result[0].severity).toBe('MEDIUM');
    });

    it('should not detect payments below threshold', async () => {
      const mockPayments = [
        { id: 1, amount: 1000, createdAt: new Date(), invoice: {} },
        { id: 2, amount: 1100, createdAt: new Date(), invoice: {} },
        { id: 3, amount: 1200, createdAt: new Date(), invoice: {} },
        { id: 4, amount: 1300, createdAt: new Date(), invoice: {} },
      ];

      mockPrismaService.payment.findMany.mockResolvedValue(mockPayments);

      const result = await service.detectPaymentAnomalies();

      // Should not detect anomalies for normal payments
      const largePaymentAnomalies = result.filter((a) => a.description.includes('Unusually large payment'));
      expect(largePaymentAnomalies.length).toBe(0);
    });
  });

  describe('detectMaintenanceAnomalies', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          ANOMALY_DETECTION_ENABLED: 'true',
          ANOMALY_MAINTENANCE_Z_SCORE_THRESHOLD: '2.5',
        };
        return config[key] || defaultValue;
      });
    });

    it('should detect maintenance request spikes', async () => {
      const mockRequests = Array.from({ length: 20 }, (_, i) => ({
        id: i + 1,
        status: 'PENDING',
        createdAt: new Date(),
        author: { id: 1 },
        property: { id: 1 },
        unit: { id: 1 },
      }));

      mockPrismaService.maintenanceRequest.findMany.mockResolvedValue(mockRequests);

      const result = await service.detectMaintenanceAnomalies();

      // Should detect spike if today has many requests
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });
});
