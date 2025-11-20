import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { PasswordPolicyService } from './password-policy.service';
import { SecurityEventsService } from '../security-events/security-events.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { UnauthorizedException, BadRequestException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { authenticator } from 'otplib';
import { SecurityEventType, Role } from '@prisma/client';

// Mock bcrypt
jest.mock('bcrypt');
const bcryptMock = bcrypt as jest.Mocked<typeof bcrypt>;

// Mock authenticator
jest.mock('otplib', () => ({
  authenticator: {
    generateSecret: jest.fn(),
    keyuri: jest.fn(),
    verify: jest.fn(),
  },
}));

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;
  let jwtService: JwtService;
  let passwordPolicy: PasswordPolicyService;
  let securityEvents: SecurityEventsService;
  let configService: ConfigService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  const mockUsersService = {
    findOne: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  };

  const mockJwtService = {
    sign: jest.fn(),
  };

  const mockPasswordPolicy = {
    validate: jest.fn(),
    policy: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
    },
  };

  const mockSecurityEvents = {
    logEvent: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockPrismaService = {
    passwordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    PasswordResetToken: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
  };

  const mockEmailService = {
    sendPasswordResetEmail: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: mockUsersService },
        { provide: JwtService, useValue: mockJwtService },
        { provide: PasswordPolicyService, useValue: mockPasswordPolicy },
        { provide: SecurityEventsService, useValue: mockSecurityEvents },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    usersService = module.get<UsersService>(UsersService);
    jwtService = module.get<JwtService>(JwtService);
    passwordPolicy = module.get<PasswordPolicyService>(PasswordPolicyService);
    securityEvents = module.get<SecurityEventsService>(SecurityEventsService);
    configService = module.get<ConfigService>(ConfigService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);

    // Reset all mocks
    jest.clearAllMocks();
    
    // Default config values
    mockConfigService.get.mockImplementation((key: string, defaultValue?: any) => {
      if (key === 'AUTH_MAX_FAILED_ATTEMPTS') return 5;
      if (key === 'AUTH_LOCKOUT_MINUTES') return 15;
      return defaultValue;
    });
  });

  describe('login', () => {
    const loginDto = { username: 'test@example.com', password: 'Password123!' };
    const context = { ipAddress: '127.0.0.1', userAgent: 'Jest Test' };

    it('should successfully login with valid credentials', async () => {
      const mockUser = {
        id: 1,
        username: 'test@example.com',
        password: 'hashedPassword',
        role: Role.TENANT,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        mfaEnabled: false,
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true as never);
      mockJwtService.sign.mockReturnValue('jwt-token');
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);
      mockUsersService.update.mockResolvedValue(mockUser);

      const result = await service.login(loginDto, context);

      expect(result).toEqual({ access_token: 'jwt-token' });
      expect(mockUsersService.findOne).toHaveBeenCalledWith(loginDto.username);
      expect(bcryptMock.compare).toHaveBeenCalledWith(loginDto.password, mockUser.password);
      expect(mockJwtService.sign).toHaveBeenCalledWith({
        username: mockUser.username,
        sub: mockUser.id,
        role: mockUser.role,
      });
      expect(mockUsersService.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          failedLoginAttempts: 0,
          lockoutUntil: null,
          lastLoginAt: expect.any(Date),
        })
      );
      expect(mockSecurityEvents.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityEventType.LOGIN_SUCCESS,
          success: true,
          userId: mockUser.id,
        })
      );
    });

    it('should throw UnauthorizedException when user not found', async () => {
      mockUsersService.findOne.mockResolvedValue(null);
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);

      await expect(service.login(loginDto, context)).rejects.toThrow(UnauthorizedException);
      
      expect(mockSecurityEvents.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityEventType.LOGIN_FAILURE,
          success: false,
          username: loginDto.username,
          metadata: { reason: 'USER_NOT_FOUND' },
        })
      );
    });

    it('should throw UnauthorizedException when account is locked', async () => {
      const lockedUser = {
        id: 1,
        username: 'test@example.com',
        password: 'hashedPassword',
        role: Role.TENANT,
        failedLoginAttempts: 5,
        lockoutUntil: new Date(Date.now() + 900000), // 15 minutes from now
        mfaEnabled: false,
      };

      mockUsersService.findOne.mockResolvedValue(lockedUser);
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);

      await expect(service.login(loginDto, context)).rejects.toThrow(
        'Account is locked. Please try again later.'
      );

      expect(mockSecurityEvents.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityEventType.LOGIN_LOCKED,
          success: false,
          userId: lockedUser.id,
        })
      );
    });

    it('should increment failed attempts on wrong password', async () => {
      const mockUser = {
        id: 1,
        username: 'test@example.com',
        password: 'hashedPassword',
        role: Role.TENANT,
        failedLoginAttempts: 2,
        lockoutUntil: null,
        mfaEnabled: false,
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(false as never);
      mockUsersService.update.mockResolvedValue(mockUser);
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);

      await expect(service.login(loginDto, context)).rejects.toThrow(UnauthorizedException);

      expect(mockUsersService.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          failedLoginAttempts: 3,
        })
      );
    });

    it('should lock account after max failed attempts', async () => {
      const mockUser = {
        id: 1,
        username: 'test@example.com',
        password: 'hashedPassword',
        role: Role.TENANT,
        failedLoginAttempts: 4,
        lockoutUntil: null,
        mfaEnabled: false,
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(false as never);
      mockUsersService.update.mockResolvedValue(mockUser);
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);

      await expect(service.login(loginDto, context)).rejects.toThrow(UnauthorizedException);

      expect(mockUsersService.update).toHaveBeenCalledWith(
        mockUser.id,
        expect.objectContaining({
          failedLoginAttempts: 0,
          lockoutUntil: expect.any(Date),
        })
      );
      expect(mockSecurityEvents.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityEventType.LOGIN_LOCKED,
          metadata: expect.objectContaining({
            reason: 'LOCKOUT_TRIGGERED',
          }),
        })
      );
    });

    it('should require MFA code when MFA is enabled', async () => {
      const mockUser = {
        id: 1,
        username: 'test@example.com',
        password: 'hashedPassword',
        role: Role.TENANT,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        mfaEnabled: true,
        mfaSecret: 'secret',
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true as never);
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);

      await expect(service.login(loginDto, context)).rejects.toThrow('MFA code required');

      expect(mockSecurityEvents.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityEventType.MFA_CHALLENGE_FAILED,
          metadata: { reason: 'CODE_REQUIRED' },
        })
      );
    });

    it('should successfully login with valid MFA code', async () => {
      const mockUser = {
        id: 1,
        username: 'test@example.com',
        password: 'hashedPassword',
        role: Role.TENANT,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        mfaEnabled: true,
        mfaSecret: 'secret',
      };

      const loginDtoWithMfa = { ...loginDto, mfaCode: '123456' };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true as never);
      (authenticator.verify as jest.Mock).mockReturnValue(true);
      mockJwtService.sign.mockReturnValue('jwt-token');
      mockUsersService.update.mockResolvedValue(mockUser);
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);

      const result = await service.login(loginDtoWithMfa, context);

      expect(result).toEqual({ access_token: 'jwt-token' });
      expect(authenticator.verify).toHaveBeenCalledWith({
        token: '123456',
        secret: 'secret',
      });
    });

    it('should reject invalid MFA code', async () => {
      const mockUser = {
        id: 1,
        username: 'test@example.com',
        password: 'hashedPassword',
        role: Role.TENANT,
        failedLoginAttempts: 0,
        lockoutUntil: null,
        mfaEnabled: true,
        mfaSecret: 'secret',
      };

      const loginDtoWithMfa = { ...loginDto, mfaCode: '000000' };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      bcryptMock.compare.mockResolvedValue(true as never);
      (authenticator.verify as jest.Mock).mockReturnValue(false);
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);

      await expect(service.login(loginDtoWithMfa, context)).rejects.toThrow('Invalid MFA code');

      expect(mockSecurityEvents.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityEventType.MFA_CHALLENGE_FAILED,
          metadata: { reason: 'CODE_INVALID' },
        })
      );
    });
  });

  describe('register', () => {
    it('should successfully register a new user', async () => {
      const registerDto = {
        username: 'newuser@example.com',
        password: 'SecurePass123!',
      };

      const mockUser = {
        id: 1,
        username: registerDto.username,
        role: Role.TENANT,
        password: 'hashedPassword',
      };

      mockPasswordPolicy.validate.mockReturnValue([]);
      mockUsersService.create.mockResolvedValue(mockUser);
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);

      const result = await service.register(registerDto);

      expect(result).toEqual({
        id: mockUser.id,
        username: mockUser.username,
        role: mockUser.role,
      });
      expect(mockPasswordPolicy.validate).toHaveBeenCalledWith(registerDto.password);
      expect(mockUsersService.create).toHaveBeenCalledWith({
        username: registerDto.username,
        password: registerDto.password,
        passwordUpdatedAt: expect.any(Date),
      });
      expect(mockSecurityEvents.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityEventType.PASSWORD_CHANGED,
          metadata: { source: 'REGISTER' },
        })
      );
    });

    it('should reject weak passwords', async () => {
      const registerDto = {
        username: 'newuser@example.com',
        password: 'weak',
      };

      mockPasswordPolicy.validate.mockReturnValue([
        'Password must be at least 8 characters',
        'Password must contain uppercase letter',
      ]);

      await expect(service.register(registerDto)).rejects.toThrow(BadRequestException);
      expect(mockUsersService.create).not.toHaveBeenCalled();
    });
  });

  describe('getPasswordPolicy', () => {
    it('should return password policy', () => {
      const policy = service.getPasswordPolicy();

      expect(policy).toEqual(mockPasswordPolicy.policy);
    });
  });

  describe('prepareMfa', () => {
    it('should generate MFA secret and QR code URL', async () => {
      const userId = 1;
      const context = {
        username: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
      };

      (authenticator.generateSecret as jest.Mock).mockReturnValue('newsecret');
      (authenticator.keyuri as jest.Mock).mockReturnValue('otpauth://totp/...');
      mockUsersService.update.mockResolvedValue({});
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);

      const result = await service.prepareMfa(userId, context);

      expect(result).toEqual({
        secret: 'newsecret',
        otpauthUrl: 'otpauth://totp/...',
      });
      expect(mockUsersService.update).toHaveBeenCalledWith(userId, {
        mfaTempSecret: 'newsecret',
      });
      expect(mockSecurityEvents.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityEventType.MFA_ENROLLMENT_STARTED,
        })
      );
    });
  });

  describe('activateMfa', () => {
    it('should activate MFA with valid code', async () => {
      const userId = 1;
      const code = '123456';
      const context = {
        username: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
      };

      const mockUser = {
        id: userId,
        mfaTempSecret: 'tempsecret',
      };

      mockUsersService.findById.mockResolvedValue(mockUser);
      (authenticator.verify as jest.Mock).mockReturnValue(true);
      mockUsersService.update.mockResolvedValue({});
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);

      await service.activateMfa(userId, code, context);

      expect(mockUsersService.update).toHaveBeenCalledWith(userId, {
        mfaSecret: 'tempsecret',
        mfaTempSecret: null,
        mfaEnabled: true,
      });
      expect(mockSecurityEvents.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityEventType.MFA_ENABLED,
        })
      );
    });

    it('should reject invalid activation code', async () => {
      const userId = 1;
      const code = '000000';
      const context = {
        username: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
      };

      const mockUser = {
        id: userId,
        mfaTempSecret: 'tempsecret',
      };

      mockUsersService.findById.mockResolvedValue(mockUser);
      (authenticator.verify as jest.Mock).mockReturnValue(false);
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);

      await expect(service.activateMfa(userId, code, context)).rejects.toThrow(
        'Invalid verification code.'
      );

      expect(mockSecurityEvents.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityEventType.MFA_CHALLENGE_FAILED,
          metadata: { reason: 'ACTIVATION_CODE_INVALID' },
        })
      );
    });

    it('should throw error when no MFA enrollment in progress', async () => {
      const userId = 1;
      const code = '123456';
      const context = {
        username: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
      };

      mockUsersService.findById.mockResolvedValue({ id: userId, mfaTempSecret: null });

      await expect(service.activateMfa(userId, code, context)).rejects.toThrow(
        'No MFA enrollment in progress.'
      );
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA with valid code', async () => {
      const userId = 1;
      const code = '123456';
      const context = {
        username: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
      };

      const mockUser = {
        id: userId,
        mfaEnabled: true,
        mfaSecret: 'secret',
      };

      mockUsersService.findById.mockResolvedValue(mockUser);
      (authenticator.verify as jest.Mock).mockReturnValue(true);
      mockUsersService.update.mockResolvedValue({});
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);

      await service.disableMfa(userId, code, context);

      expect(mockUsersService.update).toHaveBeenCalledWith(userId, {
        mfaSecret: null,
        mfaTempSecret: null,
        mfaEnabled: false,
      });
      expect(mockSecurityEvents.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityEventType.MFA_DISABLED,
        })
      );
    });

    it('should require verification code to disable MFA', async () => {
      const userId = 1;
      const context = {
        username: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
      };

      mockUsersService.findById.mockResolvedValue({
        id: userId,
        mfaEnabled: true,
        mfaSecret: 'secret',
      });

      await expect(service.disableMfa(userId, undefined, context)).rejects.toThrow(
        'Verification code required to disable MFA.'
      );
    });

    it('should throw error when MFA is not enabled', async () => {
      const userId = 1;
      const code = '123456';
      const context = {
        username: 'test@example.com',
        ipAddress: '127.0.0.1',
        userAgent: 'Jest Test',
      };

      mockUsersService.findById.mockResolvedValue({
        id: userId,
        mfaEnabled: false,
      });

      await expect(service.disableMfa(userId, code, context)).rejects.toThrow(
        'MFA is not enabled.'
      );
    });
  });

  describe('forgotPassword', () => {
    it('should generate reset token and send email', async () => {
      const username = 'test@example.com';
      const context = { ipAddress: '127.0.0.1', userAgent: 'Jest Test' };

      const mockUser = {
        id: 1,
        username,
      };

      mockUsersService.findOne.mockResolvedValue(mockUser);
      mockPrismaService.PasswordResetToken.updateMany.mockResolvedValue({ count: 0 });
      mockPrismaService.PasswordResetToken.create.mockResolvedValue({
        id: 1,
        token: 'reset-token',
        userId: 1,
        expiresAt: new Date(),
        used: false,
      });
      mockEmailService.sendPasswordResetEmail.mockResolvedValue(undefined);
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);

      await service.forgotPassword(username, context);

      expect(mockPrismaService.PasswordResetToken.updateMany).toHaveBeenCalledWith({
        where: { userId: mockUser.id, used: false },
        data: { used: true },
      });
      expect(mockPrismaService.PasswordResetToken.create).toHaveBeenCalledWith({
        data: {
          token: expect.any(String),
          userId: mockUser.id,
          expiresAt: expect.any(Date),
        },
      });
      expect(mockEmailService.sendPasswordResetEmail).toHaveBeenCalled();
    });

    it('should not reveal if user does not exist', async () => {
      const username = 'nonexistent@example.com';
      const context = { ipAddress: '127.0.0.1', userAgent: 'Jest Test' };

      mockUsersService.findOne.mockResolvedValue(null);

      // Should not throw error
      await expect(service.forgotPassword(username, context)).resolves.toBeUndefined();
      
      // Should not create token or send email
      expect(mockPrismaService.PasswordResetToken.create).not.toHaveBeenCalled();
      expect(mockEmailService.sendPasswordResetEmail).not.toHaveBeenCalled();
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const token = 'valid-token';
      const newPassword = 'NewSecure123!';
      const context = { ipAddress: '127.0.0.1', userAgent: 'Jest Test' };

      const mockResetToken = {
        id: 1,
        token,
        userId: 1,
        used: false,
        expiresAt: new Date(Date.now() + 86400000), // 24 hours from now
        user: {
          id: 1,
          username: 'test@example.com',
        },
      };

      mockPrismaService.PasswordResetToken.findUnique.mockResolvedValue(mockResetToken);
      mockPasswordPolicy.validate.mockReturnValue([]);
      mockPrismaService.PasswordResetToken.update.mockResolvedValue({});
      mockUsersService.update.mockResolvedValue({});
      mockSecurityEvents.logEvent.mockResolvedValue(undefined);

      await service.resetPassword(token, newPassword, context);

      expect(mockPrismaService.PasswordResetToken.update).toHaveBeenCalledWith({
        where: { id: mockResetToken.id },
        data: { used: true },
      });
      expect(mockUsersService.update).toHaveBeenCalledWith(
        mockResetToken.userId,
        {
          password: newPassword,
          passwordUpdatedAt: expect.any(Date),
        }
      );
      expect(mockSecurityEvents.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: SecurityEventType.PASSWORD_CHANGED,
          metadata: { source: 'PASSWORD_RESET' },
        })
      );
    });

    it('should reject expired token', async () => {
      const token = 'expired-token';
      const newPassword = 'NewSecure123!';
      const context = { ipAddress: '127.0.0.1', userAgent: 'Jest Test' };

      const mockResetToken = {
        id: 1,
        token,
        userId: 1,
        used: false,
        expiresAt: new Date(Date.now() - 1000), // Expired
        user: {
          id: 1,
          username: 'test@example.com',
        },
      };

      mockPrismaService.PasswordResetToken.findUnique.mockResolvedValue(mockResetToken);

      await expect(service.resetPassword(token, newPassword, context)).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });

    it('should reject already used token', async () => {
      const token = 'used-token';
      const newPassword = 'NewSecure123!';
      const context = { ipAddress: '127.0.0.1', userAgent: 'Jest Test' };

      const mockResetToken = {
        id: 1,
        token,
        userId: 1,
        used: true,
        expiresAt: new Date(Date.now() + 86400000),
        user: {
          id: 1,
          username: 'test@example.com',
        },
      };

      mockPrismaService.PasswordResetToken.findUnique.mockResolvedValue(mockResetToken);

      await expect(service.resetPassword(token, newPassword, context)).rejects.toThrow(
        'Invalid or expired reset token'
      );
    });

    it('should reject weak password during reset', async () => {
      const token = 'valid-token';
      const newPassword = 'weak';
      const context = { ipAddress: '127.0.0.1', userAgent: 'Jest Test' };

      const mockResetToken = {
        id: 1,
        token,
        userId: 1,
        used: false,
        expiresAt: new Date(Date.now() + 86400000),
        user: {
          id: 1,
          username: 'test@example.com',
        },
      };

      mockPrismaService.PasswordResetToken.findUnique.mockResolvedValue(mockResetToken);
      mockPasswordPolicy.validate.mockReturnValue(['Password too weak']);

      await expect(service.resetPassword(token, newPassword, context)).rejects.toThrow(
        BadRequestException
      );
    });

    it('should require token and password', async () => {
      const context = { ipAddress: '127.0.0.1', userAgent: 'Jest Test' };

      await expect(service.resetPassword('', 'password', context)).rejects.toThrow(
        'Token and new password are required'
      );

      await expect(service.resetPassword('token', '', context)).rejects.toThrow(
        'Token and new password are required'
      );
    });
  });
});
