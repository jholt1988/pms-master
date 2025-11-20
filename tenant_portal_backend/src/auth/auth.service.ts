
import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PasswordPolicyService } from './password-policy.service';
import { SecurityEventsService } from '../security-events/security-events.service';
import { ConfigService } from '@nestjs/config';
import { LoginRequestDto } from './dto/login-request.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { Prisma, SecurityEventType } from '@prisma/client';
import { authenticator } from 'otplib';
import { addHours, addMinutes } from 'date-fns';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { randomBytes } from 'crypto';
@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly passwordPolicy: PasswordPolicyService,
    private readonly securityEvents: SecurityEventsService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly emailService: EmailService,
  ) {}

  private readonly logger = new Logger(AuthService.name);

  private get maxFailedAttempts(): number {
    return Number(this.configService.get<number>('AUTH_MAX_FAILED_ATTEMPTS') ?? 5);
  }

  private get lockoutMinutes(): number {
    return Number(this.configService.get<number>('AUTH_LOCKOUT_MINUTES') ?? 15);
  }

  async login(
    dto: LoginRequestDto,
    context: { ipAddress?: string; userAgent?: string },
  ): Promise<{ access_token: string }> {
    const user = await this.usersService.findOne(dto.username);
    if (!user) {
      await this.securityEvents.logEvent({
        type: SecurityEventType.LOGIN_FAILURE,
        success: false,
        username: dto.username,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { reason: 'USER_NOT_FOUND' },
      });
      throw new UnauthorizedException('Invalid credentials');
    }

    const now = new Date();
    if (user.lockoutUntil && user.lockoutUntil > now) {
      await this.securityEvents.logEvent({
        type: SecurityEventType.LOGIN_LOCKED,
        success: false,
        userId: user.id,
        username: user.username,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { lockoutUntil: user.lockoutUntil.toISOString() },
      });
      throw new UnauthorizedException('Account is locked. Please try again later.');
    }

const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) {
      const failedAttempts = (user.failedLoginAttempts ?? 0) + 1;
      const update: any = { failedLoginAttempts: failedAttempts };
      let lockoutUntil = user.lockoutUntil;

      if (failedAttempts >= this.maxFailedAttempts) {
        lockoutUntil = addMinutes(now, this.lockoutMinutes);
        update.lockoutUntil = lockoutUntil;
        update.failedLoginAttempts = 0;
      }

      await this.safeUpdateUser(user.id, update);

      await this.securityEvents.logEvent({
        type: lockoutUntil ? SecurityEventType.LOGIN_LOCKED : SecurityEventType.LOGIN_FAILURE,
        success: false,
        userId: user.id,
        username: user.username,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: lockoutUntil
          ? { reason: 'LOCKOUT_TRIGGERED', lockoutUntil: lockoutUntil.toISOString() }
          : { reason: 'PASSWORD_MISMATCH', failedAttempts },
      });

      throw new UnauthorizedException('Invalid credentials');
    }

    if (user.mfaEnabled) {
      if (!dto.mfaCode) {
        await this.securityEvents.logEvent({
          type: SecurityEventType.MFA_CHALLENGE_FAILED,
          success: false,
          userId: user.id,
          username: user.username,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: { reason: 'CODE_REQUIRED' },
        });
        throw new UnauthorizedException('MFA code required');
      }

      if (!user.mfaSecret || !authenticator.verify({ token: dto.mfaCode, secret: user.mfaSecret })) {
        await this.securityEvents.logEvent({
          type: SecurityEventType.MFA_CHALLENGE_FAILED,
          success: false,
          userId: user.id,
          username: user.username,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: { reason: 'CODE_INVALID' },
        });
        throw new UnauthorizedException('Invalid MFA code');
      }
    }

    await this.safeUpdateUser(user.id, {
      failedLoginAttempts: 0,
      lockoutUntil: null,
      lastLoginAt: now,
    });

    await this.securityEvents.logEvent({
      type: SecurityEventType.LOGIN_SUCCESS,
      success: true,
      userId: user.id,
      username: user.username,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    const payload = { username: user.username, sub: user.id, role: user.role };
    return { access_token: this.jwtService.sign(payload) };
  }

  private async safeUpdateUser(userId: number, data: Prisma.UserUpdateInput) {
    try {
      await this.usersService.update(userId, data);
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError?.code === 'P2025') {
        this.logger.warn(
          `User ${userId} disappeared before user metadata update`,
        );
        return;
      }
      throw error;
    }
  }

  async register(dto: RegisterRequestDto): Promise<{ id: number; username: string; role: string }> {
    const policyErrors = this.passwordPolicy.validate(dto.password);
    if (policyErrors.length) {
      throw new BadRequestException({ message: 'Password policy violation', errors: policyErrors });
    }
    
    // Security: Prevent self-registration as PROPERTY_MANAGER
    // Only TENANT role is allowed during public registration
    if (dto.role && dto.role !== 'TENANT') {
      throw new BadRequestException('Self-registration is only allowed for tenant accounts. Contact an administrator to create a property manager account.');
    }
    
    // Password hashing is now handled by UsersService
    let user;
    try {
      user = await this.usersService.create({
        username: dto.username,
        password: dto.password,
        passwordUpdatedAt: new Date(),
        role: 'TENANT', // Force TENANT role for all public registrations
      });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError?.code === 'P2002') {
        throw new BadRequestException('Username already exists');
      }
      throw error;
    }

    await this.securityEvents.logEvent({
      type: SecurityEventType.PASSWORD_CHANGED,
      success: true,
      userId: user.id,
      username: user.username,
      metadata: { source: 'REGISTER' },
    });

    return { id: user.id, username: user.username, role: user.role };
  }

  getPasswordPolicy() {
    return this.passwordPolicy.policy;
  }

  async prepareMfa(userId: number, context: { username: string; ipAddress?: string; userAgent?: string }) {
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(context.username, 'PropertyManagementSuite', secret);

    await this.usersService.update(userId, {
      mfaTempSecret: secret,
    });

    await this.securityEvents.logEvent({
      type: SecurityEventType.MFA_ENROLLMENT_STARTED,
      success: true,
      userId,
      username: context.username,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return { secret, otpauthUrl };
  }

  async activateMfa(
    userId: number,
    code: string,
    context: { username: string; ipAddress?: string; userAgent?: string },
  ) {
    const user = await this.usersService.findById(userId);
    if (!user?.mfaTempSecret) {
      throw new BadRequestException('No MFA enrollment in progress.');
    }

    const valid = authenticator.verify({ token: code, secret: user.mfaTempSecret });
    if (!valid) {
      await this.securityEvents.logEvent({
        type: SecurityEventType.MFA_CHALLENGE_FAILED,
        success: false,
        userId,
        username: context.username,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { reason: 'ACTIVATION_CODE_INVALID' },
      });
      throw new BadRequestException('Invalid verification code.');
    }

    await this.usersService.update(userId, {
      mfaSecret: user.mfaTempSecret,
      mfaTempSecret: null,
      mfaEnabled: true,
    });

    await this.securityEvents.logEvent({
      type: SecurityEventType.MFA_ENABLED,
      success: true,
      userId,
      username: context.username,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  async disableMfa(
    userId: number,
    code: string | undefined,
    context: { username: string; ipAddress?: string; userAgent?: string },
  ) {
    const user = await this.usersService.findById(userId);
    if (!user?.mfaEnabled) {
      throw new BadRequestException('MFA is not enabled.');
    }

    if (user.mfaSecret) {
      if (!code) {
        throw new BadRequestException('Verification code required to disable MFA.');
      }
      const valid = authenticator.verify({ token: code, secret: user.mfaSecret });
      if (!valid) {
        await this.securityEvents.logEvent({
          type: SecurityEventType.MFA_CHALLENGE_FAILED,
          success: false,
          userId,
          username: context.username,
          ipAddress: context.ipAddress,
          userAgent: context.userAgent,
          metadata: { reason: 'DISABLE_CODE_INVALID' },
        });
        throw new BadRequestException('Invalid verification code.');
      }
    }

    await this.usersService.update(userId, {
      mfaSecret: null,
      mfaTempSecret: null,
      mfaEnabled: false,
    });

    await this.securityEvents.logEvent({
      type: SecurityEventType.MFA_DISABLED,
      success: true,
      userId,
      username: context.username,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  async forgotPassword(username: string, context: { ipAddress?: string; userAgent?: string }): Promise<void> {
    const user = await this.usersService.findOne(username);
    if (!user) {
      // Don't reveal if user exists for security
      return;
    }

    // Generate reset token
    const token = randomBytes(32).toString('hex');
    const expiresAt = addHours(new Date(), 24);

    // Invalidate any existing tokens for this user
    await this.prisma.PasswordResetToken.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });


    // Create new token
    await this.prisma.PasswordResetToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt,
      },
    });

    // Send email (using username as email for now - in production, add email field to User)
    // Note: This assumes username is an email. In production, add separate email field.
    try {
      await this.emailService.sendPasswordResetEmail(user.username, token, '');
    } catch (error) {
      // Log error but don't fail the request
      this.logger.error(`Failed to send password reset email: ${error}`);
    }

    await this.securityEvents.logEvent({
      type: SecurityEventType.PASSWORD_CHANGED,
      success: true,
      userId: user.id,
      username: user.username,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { source: 'FORGOT_PASSWORD_REQUEST' },
    });
  }

  async resetPassword(token: string, newPassword: string, context: { ipAddress?: string; userAgent?: string }): Promise<void> {
    if (!token || !newPassword) {
      throw new BadRequestException('Token and new password are required');
    }

    // Find valid token, include the related user
    const resetToken = await this.prisma.PasswordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken || resetToken.used || resetToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    // Validate password policy
    const policyErrors = this.passwordPolicy.validate(newPassword);
    if (policyErrors.length) {
      throw new BadRequestException({ message: 'Password policy violation', errors: policyErrors });
    }

    // Update password

    // Mark token as used
    
    await this.prisma.PasswordResetToken.update({
      where: { id: resetToken.id },
      data: { used: true },
    });

    await this.usersService.update(resetToken.userId, { password: newPassword, passwordUpdatedAt: new Date() });

    await this.securityEvents.logEvent({
      type: SecurityEventType.PASSWORD_CHANGED,
      success: true,
      userId: resetToken.userId,
      username: resetToken.user.username,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
      metadata: { source: 'PASSWORD_RESET' },
    });
  }

}
