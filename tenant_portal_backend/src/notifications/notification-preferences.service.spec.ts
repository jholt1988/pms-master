import { Test, TestingModule } from '@nestjs/testing';
import { NotificationPreferencesService } from './notification-preferences.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

describe('NotificationPreferencesService', () => {
  let service: NotificationPreferencesService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    notificationPreference: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPreferencesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<NotificationPreferencesService>(NotificationPreferencesService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      const mockPreferences = {
        id: 1,
        userId: 1,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        preferredChannel: 'PUSH',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        notificationTypes: { RENT_REMINDER: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(mockPreferences);

      const result = await service.getPreferences(1);

      expect(result).toEqual(mockPreferences);
      expect(mockPrismaService.notificationPreference.findUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
    });

    it('should create default preferences if none exist', async () => {
      const mockPreferences = {
        id: 1,
        userId: 1,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        preferredChannel: 'EMAIL',
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationTypes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.create.mockResolvedValue(mockPreferences);

      const result = await service.getPreferences(1);

      expect(result).toEqual(mockPreferences);
      expect(mockPrismaService.notificationPreference.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          emailEnabled: true,
          smsEnabled: false,
          pushEnabled: false,
          preferredChannel: 'EMAIL',
        },
      });
    });
  });

  describe('updatePreferences', () => {
    it('should update existing preferences', async () => {
      const existing = {
        id: 1,
        userId: 1,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        preferredChannel: 'EMAIL',
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationTypes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updated = {
        ...existing,
        smsEnabled: true,
        preferredChannel: 'SMS',
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(existing);
      mockPrismaService.notificationPreference.update.mockResolvedValue(updated);

      const result = await service.updatePreferences(1, {
        smsEnabled: true,
        preferredChannel: 'SMS',
      });

      expect(result).toEqual(updated);
      expect(mockPrismaService.notificationPreference.update).toHaveBeenCalledWith({
        where: { userId: 1 },
        data: {
          smsEnabled: true,
          preferredChannel: 'SMS',
        },
      });
    });

    it('should create preferences if they do not exist', async () => {
      const newPreferences = {
        id: 1,
        userId: 1,
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: false,
        preferredChannel: 'SMS',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        notificationTypes: { RENT_REMINDER: true },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(null);
      mockPrismaService.notificationPreference.create.mockResolvedValue(newPreferences);

      const result = await service.updatePreferences(1, {
        emailEnabled: true,
        smsEnabled: true,
        preferredChannel: 'SMS',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        notificationTypes: { RENT_REMINDER: true } as any,
      });

      expect(result).toEqual(newPreferences);
      expect(mockPrismaService.notificationPreference.create).toHaveBeenCalled();
    });
  });

  describe('isNotificationTypeEnabled', () => {
    it('should return true if type is enabled', async () => {
      const preferences = {
        id: 1,
        userId: 1,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        preferredChannel: 'EMAIL',
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationTypes: {
          RENT_REMINDER: true,
          RENT_OVERDUE: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(preferences);

      const result = await service.isNotificationTypeEnabled(1, NotificationType.RENT_REMINDER);

      expect(result).toBe(true);
    });

    it('should return false if type is disabled', async () => {
      const preferences = {
        id: 1,
        userId: 1,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        preferredChannel: 'EMAIL',
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationTypes: {
          RENT_REMINDER: true,
          RENT_OVERDUE: false,
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(preferences);

      const result = await service.isNotificationTypeEnabled(1, NotificationType.RENT_OVERDUE);

      expect(result).toBe(false);
    });

    it('should return true if no type preferences set (default enabled)', async () => {
      const preferences = {
        id: 1,
        userId: 1,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        preferredChannel: 'EMAIL',
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationTypes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(preferences);

      const result = await service.isNotificationTypeEnabled(1, NotificationType.RENT_REMINDER);

      expect(result).toBe(true);
    });
  });

  describe('isQuietHours', () => {
    it('should return true during quiet hours', async () => {
      const preferences = {
        id: 1,
        userId: 1,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        preferredChannel: 'EMAIL',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        notificationTypes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(preferences);

      // Mock current time to 23:00 (within quiet hours)
      const originalDate = Date;
      global.Date = jest.fn(() => ({
        getHours: () => 23,
        getMinutes: () => 0,
      })) as any;

      const result = await service.isQuietHours(1);

      expect(result).toBe(true);

      global.Date = originalDate;
    });

    it('should return false outside quiet hours', async () => {
      const preferences = {
        id: 1,
        userId: 1,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        preferredChannel: 'EMAIL',
        quietHoursStart: '22:00',
        quietHoursEnd: '08:00',
        notificationTypes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(preferences);

      // Mock current time to 14:00 (outside quiet hours)
      const originalDate = Date;
      global.Date = jest.fn(() => ({
        getHours: () => 14,
        getMinutes: () => 0,
      })) as any;

      const result = await service.isQuietHours(1);

      expect(result).toBe(false);

      global.Date = originalDate;
    });

    it('should return false if quiet hours not configured', async () => {
      const preferences = {
        id: 1,
        userId: 1,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: false,
        preferredChannel: 'EMAIL',
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationTypes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(preferences);

      const result = await service.isQuietHours(1);

      expect(result).toBe(false);
    });
  });

  describe('getPreferredChannel', () => {
    it('should return preferred channel if set', async () => {
      const preferences = {
        id: 1,
        userId: 1,
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        preferredChannel: 'SMS',
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationTypes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(preferences);

      const result = await service.getPreferredChannel(1);

      expect(result).toBe('SMS');
    });

    it('should return EMAIL if AUTO and no channels enabled', async () => {
      const preferences = {
        id: 1,
        userId: 1,
        emailEnabled: false,
        smsEnabled: false,
        pushEnabled: false,
        preferredChannel: 'AUTO',
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationTypes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(preferences);

      const result = await service.getPreferredChannel(1);

      expect(result).toBe('EMAIL');
    });

    it('should return PUSH if AUTO and push enabled', async () => {
      const preferences = {
        id: 1,
        userId: 1,
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: true,
        preferredChannel: 'AUTO',
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationTypes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(preferences);

      const result = await service.getPreferredChannel(1);

      expect(result).toBe('PUSH');
    });

    it('should return SMS if AUTO and SMS enabled but push not', async () => {
      const preferences = {
        id: 1,
        userId: 1,
        emailEnabled: true,
        smsEnabled: true,
        pushEnabled: false,
        preferredChannel: 'AUTO',
        quietHoursStart: null,
        quietHoursEnd: null,
        notificationTypes: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.notificationPreference.findUnique.mockResolvedValue(preferences);

      const result = await service.getPreferredChannel(1);

      expect(result).toBe('SMS');
    });
  });
});

