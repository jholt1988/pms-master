import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { AINotificationService } from './ai-notification.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';
import OpenAI from 'openai';

jest.mock('openai');

describe('AINotificationService', () => {
  let service: AINotificationService;
  let prismaService: PrismaService;
  let configService: ConfigService;
  let mockOpenAI: jest.Mocked<OpenAI>;

  const mockPrismaService = {
    user: {
      findUnique: jest.fn(),
    },
    notification: {
      findMany: jest.fn(),
    },
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const mockChatCompletions = {
      create: jest.fn(),
    };
    mockOpenAI = {
      chat: {
        completions: mockChatCompletions,
      } as any,
    } as jest.Mocked<OpenAI>;

    (OpenAI as jest.MockedClass<typeof OpenAI>).mockImplementation(() => mockOpenAI);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AINotificationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<AINotificationService>(AINotificationService);
    prismaService = module.get<PrismaService>(PrismaService);
    configService = module.get<ConfigService>(ConfigService);
  });

  describe('Initialization', () => {
    it('should initialize with OpenAI when API key and AI are enabled', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_NOTIFICATION_ENABLED') return 'true';
        return undefined;
      });

      const newService = new AINotificationService(prismaService, configService);
      expect(OpenAI).toHaveBeenCalledWith({ apiKey: 'sk-test-key' });
    });

    it('should initialize in mock mode when API key is missing', () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_NOTIFICATION_ENABLED') return 'true';
        return undefined;
      });

      const newService = new AINotificationService(prismaService, configService);
      expect(OpenAI).not.toHaveBeenCalled();
    });
  });

  describe('determineOptimalTiming', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_NOTIFICATION_ENABLED') return 'true';
        return undefined;
      });
    });

    it('should determine optimal timing for notification', async () => {
      const mockUser = {
        id: 1,
        username: 'user@test.com',
        notifications: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const timing = await service.determineOptimalTiming(1, NotificationType.PAYMENT_DUE, 'MEDIUM');

      expect(timing).toBeDefined();
      expect(timing.sendAt).toBeInstanceOf(Date);
      expect(['EMAIL', 'SMS', 'PUSH']).toContain(timing.channel);
      expect(['LOW', 'MEDIUM', 'HIGH']).toContain(timing.priority);
    });

    it('should use SMS for high urgency notifications', async () => {
      const mockUser = {
        id: 1,
        username: 'user@test.com',
        notifications: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const timing = await service.determineOptimalTiming(
        1,
        NotificationType.PAYMENT_OVERDUE,
        'HIGH',
      );

      expect(timing.channel).toBe('SMS');
      expect(timing.priority).toBe('HIGH');
    });

    it('should respect quiet hours', async () => {
      const mockUser = {
        id: 1,
        username: 'user@test.com',
        notifications: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Set current time to 11 PM (quiet hours)
      const now = new Date();
      now.setHours(23, 0, 0, 0);
      jest.spyOn(global, 'Date').mockImplementation(() => now as any);

      const timing = await service.determineOptimalTiming(1, NotificationType.PAYMENT_DUE, 'LOW');

      // Should schedule for after quiet hours
      expect(timing.sendAt.getHours()).toBeGreaterThanOrEqual(8);
    });
  });

  describe('customizeNotificationContent', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_NOTIFICATION_ENABLED') return 'true';
        return undefined;
      });
    });

    it('should personalize notification content', async () => {
      const mockUser = {
        id: 1,
        username: 'user@test.com',
        notifications: [],
      };

      mockOpenAI.chat.completions.create.mockResolvedValue({
        choices: [
          {
            message: {
              content: 'Personalized message for user@test.com',
              role: 'assistant',
            },
          },
        ],
      } as any);

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const personalized = await service.customizeNotificationContent(
        1,
        NotificationType.PAYMENT_DUE,
        'Default message',
      );

      expect(personalized).toBeDefined();
      expect(personalized).not.toBe('Default message');
      expect(mockOpenAI.chat.completions.create).toHaveBeenCalled();
    });

    it('should return original content when AI fails', async () => {
      const mockUser = {
        id: 1,
        username: 'user@test.com',
        notifications: [],
      };

      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const personalized = await service.customizeNotificationContent(
        1,
        NotificationType.PAYMENT_DUE,
        'Default message',
      );

      expect(personalized).toBe('Default message');
    });
  });

  describe('selectOptimalChannel', () => {
    beforeEach(() => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_NOTIFICATION_ENABLED') return 'true';
        return undefined;
      });
    });

    it('should select optimal channel for notification', async () => {
      const mockUser = {
        id: 1,
        username: 'user@test.com',
        notifications: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const channel = await service.selectOptimalChannel(
        1,
        NotificationType.PAYMENT_DUE,
        'MEDIUM',
      );

      expect(['EMAIL', 'SMS', 'PUSH']).toContain(channel);
    });

    it('should select SMS for high urgency', async () => {
      const mockUser = {
        id: 1,
        username: 'user@test.com',
        notifications: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      const channel = await service.selectOptimalChannel(
        1,
        NotificationType.PAYMENT_OVERDUE,
        'HIGH',
      );

      expect(channel).toBe('SMS');
    });
  });

  describe('Error Handling', () => {
    it('should handle missing user gracefully', async () => {
      mockPrismaService.user.findUnique.mockResolvedValue(null);

      await expect(
        service.determineOptimalTiming(999, NotificationType.PAYMENT_DUE, 'MEDIUM'),
      ).rejects.toThrow();
    });

    it('should handle API errors gracefully', async () => {
      mockConfigService.get.mockImplementation((key: string) => {
        if (key === 'OPENAI_API_KEY') return 'sk-test-key';
        if (key === 'AI_ENABLED') return 'true';
        if (key === 'AI_NOTIFICATION_ENABLED') return 'true';
        return undefined;
      });

      mockOpenAI.chat.completions.create.mockRejectedValue(new Error('API Error'));

      const mockUser = {
        id: 1,
        username: 'user@test.com',
        notifications: [],
      };

      mockPrismaService.user.findUnique.mockResolvedValue(mockUser);

      // Should use fallback logic
      const timing = await service.determineOptimalTiming(1, NotificationType.PAYMENT_DUE, 'MEDIUM');
      expect(timing).toBeDefined();
      expect(timing.channel).toBeDefined();
    });
  });
});

