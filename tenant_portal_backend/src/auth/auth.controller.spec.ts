import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { testData } from '../../test/factories';
import { Role } from '@prisma/client';

describe('AuthController', () => {
  let controller: AuthController;
  let service: AuthService;

  const mockAuthService = {
    login: jest.fn(),
    register: jest.fn(),
    getPasswordPolicy: jest.fn(),
    prepareMfa: jest.fn(),
    activateMfa: jest.fn(),
    disableMfa: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
  };

  const mockRequest = {
    user: {
      sub: 1,
      username: 'testuser',
    },
    headers: {
      'user-agent': 'Mozilla/5.0 Test Browser',
      'x-forwarded-for': '192.168.1.100',
    },
    ip: '10.0.0.1',
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    service = module.get<AuthService>(AuthService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('should login successfully with credentials', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'Test@1234',
      };

      const mockLoginResponse = {
        access_token: 'jwt_token_12345',
      };

      mockAuthService.login.mockResolvedValue(mockLoginResponse);

      const result = await controller.login(loginDto, mockRequest);

      expect(result).toEqual(mockLoginResponse);
      expect(service.login).toHaveBeenCalledWith(loginDto, {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
      });
    });

    it('should extract IP from x-forwarded-for header', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'Test@1234',
      };

      const requestWithForwardedIp = {
        ...mockRequest,
        headers: {
          ...mockRequest.headers,
          'x-forwarded-for': '203.0.113.195, 192.168.1.100, 172.16.0.1',
        },
      };

      mockAuthService.login.mockResolvedValue({ access_token: 'token' });

      await controller.login(loginDto, requestWithForwardedIp);

      expect(service.login).toHaveBeenCalledWith(loginDto, {
        ipAddress: '203.0.113.195',
        userAgent: 'Mozilla/5.0 Test Browser',
      });
    });

    it('should use req.ip when x-forwarded-for is not present', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'Test@1234',
      };

      const requestWithoutForwarded = {
        user: mockRequest.user,
        headers: {
          'user-agent': 'Mozilla/5.0 Test Browser',
        },
        ip: '10.0.0.1',
      } as any;

      mockAuthService.login.mockResolvedValue({ access_token: 'token' });

      await controller.login(loginDto, requestWithoutForwarded);

      expect(service.login).toHaveBeenCalledWith(loginDto, {
        ipAddress: '10.0.0.1',
        userAgent: 'Mozilla/5.0 Test Browser',
      });
    });

    it('should handle missing user-agent', async () => {
      const loginDto = {
        username: 'testuser',
        password: 'Test@1234',
      };

      const requestWithoutUserAgent = {
        ...mockRequest,
        headers: {},
        ip: '10.0.0.1',
      } as any;

      mockAuthService.login.mockResolvedValue({ access_token: 'token' });

      await controller.login(loginDto, requestWithoutUserAgent);

      expect(service.login).toHaveBeenCalledWith(loginDto, {
        ipAddress: '10.0.0.1', // Falls back to req.ip
        userAgent: undefined,
      });
    });
  });

  describe('register', () => {
    it('should register a new user successfully', async () => {
      const registerDto = {
        username: testData.email(),
        password: 'SecurePass@123',
        role: Role.TENANT,
      };

      const mockRegisterResponse = {
        id: 5,
        username: registerDto.username,
        role: registerDto.role,
      };

      mockAuthService.register.mockResolvedValue(mockRegisterResponse);

      const result = await controller.register(registerDto);

      expect(result).toEqual({ user: mockRegisterResponse });
      expect(service.register).toHaveBeenCalledWith(registerDto);
      expect(service.register).toHaveBeenCalledTimes(1);
    });
  });

  describe('getPasswordPolicy', () => {
    it('should return password policy', () => {
      const mockPolicy = {
        minLength: 8,
        requireUppercase: true,
        requireLowercase: true,
        requireNumbers: true,
        requireSpecialChars: true,
      };

      mockAuthService.getPasswordPolicy.mockReturnValue(mockPolicy);

      const result = controller.getPasswordPolicy();

      expect(result).toEqual(mockPolicy);
      expect(service.getPasswordPolicy).toHaveBeenCalled();
    });
  });

  describe('getProfile', () => {
    it('should return user profile from request', () => {
      const result = controller.getProfile(mockRequest);

      expect(result).toEqual({
        sub: 1,
        username: 'testuser',
      });
    });
  });

  describe('prepareMfa', () => {
    it('should prepare MFA enrollment', async () => {
      const mockMfaResponse = {
        secret: 'JBSWY3DPEHPK3PXP',
        qrCodeUrl: 'otpauth://totp/PropertyManagement:testuser?secret=JBSWY3DPEHPK3PXP&issuer=PropertyManagement',
      };

      mockAuthService.prepareMfa.mockResolvedValue(mockMfaResponse);

      const result = await controller.prepareMfa(mockRequest);

      expect(result).toEqual(mockMfaResponse);
      expect(service.prepareMfa).toHaveBeenCalledWith(1, {
        username: 'testuser',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
      });
    });
  });

  describe('activateMfa', () => {
    it('should activate MFA with valid code', async () => {
      const mfaDto = { code: '123456' };

      mockAuthService.activateMfa.mockResolvedValue(undefined);

      const result = await controller.activateMfa(mockRequest, mfaDto);

      expect(result).toEqual({ success: true });
      expect(service.activateMfa).toHaveBeenCalledWith(1, '123456', {
        username: 'testuser',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
      });
    });
  });

  describe('disableMfa', () => {
    it('should disable MFA with valid code', async () => {
      const mfaDto = { code: '654321' };

      mockAuthService.disableMfa.mockResolvedValue(undefined);

      const result = await controller.disableMfa(mockRequest, mfaDto);

      expect(result).toEqual({ success: true });
      expect(service.disableMfa).toHaveBeenCalledWith(1, '654321', {
        username: 'testuser',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
      });
    });
  });

  describe('forgotPassword', () => {
    it('should send password reset email', async () => {
      const forgotPasswordDto = { username: 'testuser' };

      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      const result = await controller.forgotPassword(forgotPasswordDto, mockRequest);

      expect(result).toEqual({
        message: 'If a matching account was found, a password reset email has been sent.',
      });
      expect(service.forgotPassword).toHaveBeenCalledWith('testuser', {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
      });
    });

    it('should return same message for non-existent users', async () => {
      const forgotPasswordDto = { username: 'nonexistent@example.com' };

      mockAuthService.forgotPassword.mockResolvedValue(undefined);

      const result = await controller.forgotPassword(forgotPasswordDto, mockRequest);

      expect(result).toEqual({
        message: 'If a matching account was found, a password reset email has been sent.',
      });
      expect(service.forgotPassword).toHaveBeenCalledWith('nonexistent@example.com', {
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 Test Browser',
      });
    });
  });

  describe('resetPassword', () => {
    it('should reset password with valid token', async () => {
      const resetPasswordDto = {
        token: 'reset_token_abc123',
        newPassword: 'NewSecure@Pass123',
      };

      mockAuthService.resetPassword.mockResolvedValue(undefined);

      const result = await controller.resetPassword(resetPasswordDto, mockRequest);

      expect(result).toEqual({
        message: 'Password has been reset successfully.',
      });
      expect(service.resetPassword).toHaveBeenCalledWith(
        'reset_token_abc123',
        'NewSecure@Pass123',
        {
          ipAddress: '192.168.1.100',
          userAgent: 'Mozilla/5.0 Test Browser',
        },
      );
    });
  });
});
