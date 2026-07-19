import { Test, TestingModule } from '@nestjs/testing';
import { SystemUserService } from './system-user.service';
import { PrismaService } from '../prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Mock bcrypt
jest.mock('bcrypt');
const mockedBcrypt = bcrypt as jest.Mocked<typeof bcrypt>;

describe('SystemUserService', () => {
  let service: SystemUserService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    // Mock bcrypt.hash
    mockedBcrypt.hash.mockResolvedValue('hashed-password' as never);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemUserService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<SystemUserService>(SystemUserService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('getSystemUserId', () => {
    it('should return existing system user ID if found', async () => {
      const existingSystemUser = {
        id: 1,
        username: 'system',
        role: Role.PROPERTY_MANAGER,
        password: 'hashed',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(existingSystemUser);

      const userId = await service.getSystemUserId();

      expect(userId).toBe(1);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledWith({
        where: {
          username: 'system',
          role: Role.PROPERTY_MANAGER,
        },
      });
      expect(mockPrismaService.user.create).not.toHaveBeenCalled();
    });

    it('should create system user if not found', async () => {
      const newSystemUser = {
        id: 2,
        username: 'system',
        role: Role.PROPERTY_MANAGER,
        password: 'hashed-password',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(null);
      mockPrismaService.user.create.mockResolvedValue(newSystemUser);

      const userId = await service.getSystemUserId();

      expect(userId).toBe(2);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalled();
      expect(mockPrismaService.user.create).toHaveBeenCalledWith({
        data: {
          username: 'system',
          password: 'hashed-password',
          role: Role.PROPERTY_MANAGER,
        },
      });
      expect(mockedBcrypt.hash).toHaveBeenCalled();
    });

    it('should use cached system user ID on subsequent calls', async () => {
      const existingSystemUser = {
        id: 3,
        username: 'system',
        role: Role.PROPERTY_MANAGER,
        password: 'hashed',
      };

      mockPrismaService.user.findFirst.mockResolvedValueOnce(existingSystemUser);

      const userId1 = await service.getSystemUserId();
      const userId2 = await service.getSystemUserId();

      expect(userId1).toBe(3);
      expect(userId2).toBe(3);
      // Should only call findFirst once (first call), then use cache
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledTimes(1);
    });

    it('should fallback to admin user if system user creation fails', async () => {
      const fallbackAdmin = {
        id: 5,
        username: 'admin',
        role: Role.PROPERTY_MANAGER,
        password: 'hashed',
      };

      mockPrismaService.user.findFirst
        .mockResolvedValueOnce(null) // System user not found
        .mockResolvedValueOnce(fallbackAdmin); // Fallback admin found
      mockPrismaService.user.create.mockRejectedValue(new Error('Database error'));

      const userId = await service.getSystemUserId();

      expect(userId).toBe(5);
      expect(mockPrismaService.user.findFirst).toHaveBeenCalledTimes(2);
      expect(mockPrismaService.user.findFirst).toHaveBeenNthCalledWith(2, {
        where: { role: Role.PROPERTY_MANAGER },
      });
    });
  });

  describe('isSystemUser', () => {
    it('should return true if user ID matches system user', async () => {
      const systemUser = {
        id: 10,
        username: 'system',
        role: Role.PROPERTY_MANAGER,
        password: 'hashed',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(systemUser);

      const isSystem = await service.isSystemUser(10);

      expect(isSystem).toBe(true);
    });

    it('should return false if user ID does not match system user', async () => {
      const systemUser = {
        id: 10,
        username: 'system',
        role: Role.PROPERTY_MANAGER,
        password: 'hashed',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(systemUser);

      const isSystem = await service.isSystemUser(99);

      expect(isSystem).toBe(false);
    });
  });

  describe('onModuleInit', () => {
    it('should initialize system user on module startup', async () => {
      const systemUser = {
        id: 7,
        username: 'system',
        role: Role.PROPERTY_MANAGER,
        password: 'hashed',
      };

      mockPrismaService.user.findFirst.mockResolvedValue(systemUser);

      await service.onModuleInit();

      expect(mockPrismaService.user.findFirst).toHaveBeenCalled();
      const userId = await service.getSystemUserId();
      expect(userId).toBe(7);
    });
  });
});

