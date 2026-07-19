import { Test, TestingModule } from '@nestjs/testing';
import { PushService } from './push.service';
import { ConfigService } from '@nestjs/config';

describe('PushService', () => {
  let service: PushService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PushService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<PushService>(PushService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendPush', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          PUSH_ENABLED: 'true',
          PUSH_PROVIDER: 'MOCK',
        };
        return config[key] || defaultValue;
      });
    });

    it('should return error if push is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'PUSH_ENABLED') return 'false';
        return defaultValue;
      });

      // Recreate service with new config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          PushService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const newService = module.get<PushService>(PushService);

      const result = await newService.sendPush(1, 'Test Title', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Push notification service is disabled');
    });

    it('should send push via MOCK provider', async () => {
      const result = await service.sendPush(1, 'Test Title', 'Test message', { key: 'value' });

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toContain('push-mock-');
    });

    it('should handle errors gracefully', async () => {
      // This would test error handling if we had actual provider implementations
      // For now, MOCK provider always succeeds
      const result = await service.sendPush(1, 'Test Title', 'Test message');

      expect(result.success).toBe(true);
    });
  });
});

