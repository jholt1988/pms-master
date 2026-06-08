import { BadRequestException, ForbiddenException, Injectable, Logger, UnauthorizedException, HttpException, HttpStatus } from '@nestjs/common';
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
import { randomBytes, randomUUID, createHash } from 'crypto';
import { DefaultApi as MilApiClient } from '@propertyos/mil-client';
import { TokenBlacklistService } from './revocation/token-blacklist.service';

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
    private readonly milApiClient: MilApiClient,
    private readonly tokenBlacklist: TokenBlacklistService,
  ) { }

  private readonly logger = new Logger(AuthService.name);

  private get maxFailedAttempts(): number {
    return Number(this.configService.get<number>('AUTH_MAX_FAILED_ATTEMPTS') ?? 5);
  }

  private get lockoutMinutes(): number {
    return Number(this.configService.get<number>('AUTH_LOCKOUT_MINUTES') ?? 15);
  }

  private get requireOperatorMfa(): boolean {
    const configured = this.configService.get<string>('AUTH_REQUIRE_OPERATOR_MFA');
    return String(configured ?? '').toLowerCase() === 'true';
  }

  private assertOperatorMfaEnrollment(user: { role?: string | null; mfaEnabled?: boolean | null }) {
    if (!this.requireOperatorMfa) return;
    const role = String(user.role ?? '').toUpperCase();
    const operatorRole = role === 'ADMIN' || role === 'PROPERTY_MANAGER';
    if (operatorRole && !user.mfaEnabled) {
      throw new ForbiddenException('MFA enrollment required for operator access');
    }
  }

  async login(
    dto: LoginRequestDto,
    context: { ipAddress?: string; userAgent?: string },
  ): Promise<{ accessToken: string; refreshToken: string; user?: { id: string; username: string; role: string } }> {
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
      throw new HttpException('Account is locked. Please try again later.', HttpStatus.LOCKED);
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

    this.assertOperatorMfaEnrollment(user);

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

    const jti = randomUUID();
    const payload = { username: user.username, sub: user.id, role: user.role, jti };
    const token = this.jwtService.sign(payload);

    const refreshToken = randomBytes(32).toString('hex');
    const refreshTokenHash = createHash('sha256').update(refreshToken).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    return {
      accessToken: token,
      refreshToken,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string): Promise<{ access_token: string; accessToken: string; refreshToken: string }> {
    const tokenHash = createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
      include: { user: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    this.assertOperatorMfaEnrollment(storedToken.user);

    const jti = randomUUID();
    const payload = { 
      username: storedToken.user.username, 
      sub: storedToken.user.id, 
      role: storedToken.user.role, 
      jti 
    };
    const token = this.jwtService.sign(payload);

    // Rotate refresh token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const newRefreshToken = randomBytes(32).toString('hex');
    const newRefreshTokenHash = createHash('sha256').update(newRefreshToken).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: newRefreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return { access_token: token, accessToken: token, refreshToken: newRefreshToken };
  }

  private async safeUpdateUser(userId: string | number, data: Prisma.UserUpdateInput) {
    const normalizedId = this.normalizeUserId(userId);
    try {
      await this.usersService.update(normalizedId, data);
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError?.code === 'P2025') {
        this.logger.warn(
          `User ${normalizedId} disappeared before user metadata update`,
        );
        return;
      }
      throw error;
    }
  }

  private normalizeUserId(userId: string | number): string {
    return String(userId);
  }

  async register(
    dto: RegisterRequestDto,
  ): Promise<{
    id: string;
    username: string;
    role: string;
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
  }> {
    const policyErrors = this.passwordPolicy.validate(dto.password);
    if (policyErrors.length) {
      throw new BadRequestException({ message: 'Password policy violation', errors: policyErrors });
    }

    const existingUser = await this.usersService.findOne(dto.username);
    if (existingUser) {
      throw new BadRequestException('Username already exists');
    }

    const existingEmail = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existingEmail) {
      throw new BadRequestException('Email already exists');
    }

    // Password hashing is now handled by UsersService
    let user;
    try {
      user = await this.usersService.create({
        username: dto.username,
        password: dto.password,
        passwordUpdatedAt: new Date(),
        role: dto.role ?? 'TENANT',
        email: dto.email,
        firstName: dto.firstName,
lastName: dto.lastName,
      });
    } catch (error: unknown) {
      const prismaError = error as { code?: string };
      if (prismaError?.code === 'P2002') {
        throw new BadRequestException('Username or email already exists');
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
    
    // ---- MIL Integration ----
    try {
        await this.milApiClient.milTenantTenantIdCryptoStatusGet(user.id);
        this.logger.log(`Provisioned tenant crypto keys in MIL for new user: ${user.id}`);
    } catch(error) {
        this.logger.error(`Failed to provision MIL crypto keys for new user ${user.id}`, error);
        // Do not fail the registration if MIL is down, just log the error.
        // A background job could retry this later.
    }
    // -------------------------

    return {
      id: user.id,
      username: user.username,
      role: user.role,
      email: user.email ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
    };
  }

  getPasswordPolicy() {
    return this.passwordPolicy.policy;
  }

  async prepareMfa(userId: string | number, context: { username: string; ipAddress?: string; userAgent?: string }) {
    const normalizedId = this.normalizeUserId(userId);
    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(context.username, 'PropertyManagementSuite', secret);

    await this.usersService.update(normalizedId, {
      mfaTempSecret: secret,
    });

    await this.securityEvents.logEvent({
      type: SecurityEventType.MFA_ENROLLMENT_STARTED,
      success: true,
      userId: normalizedId,
      username: context.username,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });

    return { secret, otpauthUrl, qrCodeUrl: otpauthUrl };
  }

  async activateMfa(
    userId: string | number,
    code: string,
    context: { username: string; ipAddress?: string; userAgent?: string },
  ) {
    const normalizedId = this.normalizeUserId(userId);
    const user = await this.usersService.findById(normalizedId);
    if (!user?.mfaTempSecret) {
      throw new BadRequestException('No MFA enrollment in progress.');
    }

    const valid = authenticator.verify({ token: code, secret: user.mfaTempSecret });
    if (!valid) {
      await this.securityEvents.logEvent({
        type: SecurityEventType.MFA_CHALLENGE_FAILED,
        success: false,
        userId: normalizedId,
        username: context.username,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
        metadata: { reason: 'ACTIVATION_CODE_INVALID' },
      });
      throw new BadRequestException('Invalid verification code.');
    }

      await this.usersService.update(normalizedId, {
      mfaSecret: user.mfaTempSecret,
      mfaTempSecret: null,
      mfaEnabled: true,
    });

    await this.securityEvents.logEvent({
      type: SecurityEventType.MFA_ENABLED,
      success: true,
      userId: normalizedId,
      username: context.username,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent,
    });
  }

  async disableMfa(
    userId: string | number,
    code: string | undefined,
    context: { username: string; ipAddress?: string; userAgent?: string },
  ) {
    const normalizedId = this.normalizeUserId(userId);
    const user = await this.usersService.findById(normalizedId);
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
        userId: normalizedId,
        username: context.username,
        ipAddress: context.ipAddress,
        userAgent: context.userAgent,
          metadata: { reason: 'DISABLE_CODE_INVALID' },
        });
        throw new BadRequestException('Invalid verification code.');
      }
    }

    await this.usersService.update(normalizedId, {
      mfaSecret: null,
      mfaTempSecret: null,
      mfaEnabled: false,
    });

    await this.securityEvents.logEvent({
      type: SecurityEventType.MFA_DISABLED,
      success: true,
      userId: normalizedId,
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
    const tokenModel = (this.prisma as any).PasswordResetToken || (this.prisma as any).passwordResetToken;

    await tokenModel.updateMany({
      where: { userId: user.id, used: false },
      data: { used: true },
    });


    // Create new token
    await tokenModel.create({
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
    const tokenModel = (this.prisma as any).PasswordResetToken || (this.prisma as any).passwordResetToken;

    const resetToken = await tokenModel.findUnique({
      where: { token },
      include: { user: true },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Invalid reset token');
    }

    if (resetToken.used) {
      throw new BadRequestException('Reset token has already been used');
    }

    if (resetToken.expiresAt < new Date()) {
      throw new BadRequestException('Reset token has expired');
    }

    // Validate password policy
    const policyErrors = this.passwordPolicy.validate(newPassword);
    if (policyErrors.length) {
      throw new BadRequestException({ message: 'Password policy violation', errors: policyErrors });
    }

    // Update password

    // Mark token as used

    await tokenModel.update({
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

  async logout(jti: string, tokenExpiresInSeconds: number): Promise<void> {
    if (jti) {
      await this.tokenBlacklist.blacklist(jti, tokenExpiresInSeconds);
    }
  }

  async isTokenRevoked(jti: string): Promise<boolean> {
    if (!jti) return false;
    return this.tokenBlacklist.isBlacklisted(jti);
  }

}
