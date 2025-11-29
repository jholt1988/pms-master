import { Test, TestingModule } from '@nestjs/testing';
import { SmsService } from './sms.service';
import { ConfigService } from '@nestjs/config';

describe('SmsService', () => {
  let service: SmsService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SmsService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<SmsService>(SmsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendSms', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        const config: Record<string, string> = {
          SMS_ENABLED: 'true',
          SMS_PROVIDER: 'MOCK',
        };
        return config[key] || defaultValue;
      });
    });

    it('should return error if phone number is empty', async () => {
      const result = await service.sendSms('', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('Phone number is required');
    });

    it('should return error if SMS is disabled', async () => {
      mockConfigService.get.mockImplementation((key: string, defaultValue?: string) => {
        if (key === 'SMS_ENABLED') return 'false';
        return defaultValue;
      });

      // Recreate service with new config
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SmsService,
          { provide: ConfigService, useValue: mockConfigService },
        ],
      }).compile();
      const newService = module.get<SmsService>(SmsService);

      const result = await newService.sendSms('+1234567890', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SMS service is disabled');
    });

    it('should return error for invalid phone number format', async () => {
      const result = await service.sendSms('1234567890', 'Test message');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Invalid phone number format');
    });

    it('should send SMS via MOCK provider', async () => {
      const result = await service.sendSms('+1234567890', 'Test message');

      expect(result.success).toBe(true);
      expect(result.messageId).toBeDefined();
      expect(result.messageId).toContain('mock-');
    });

    it('should validate phone number format', () => {
      expect(service.validatePhoneNumber('+1234567890')).toBe(true);
      expect(service.validatePhoneNumber('+11234567890')).toBe(true);
      expect(service.validatePhoneNumber('1234567890')).toBe(false);
      expect(service.validatePhoneNumber('+123')).toBe(false);
      expect(service.validatePhoneNumber('')).toBe(false);
    });
  });
});

