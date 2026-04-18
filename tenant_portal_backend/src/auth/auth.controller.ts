// Story 12: Role-Based Authentication and Session Enforcement
// POST /auth/login, POST /auth/refresh, POST /auth/logout
// Dependencies: None | Estimate: Large

import { Controller, Post, Body, UseGuards, UnauthorizedException, Get, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

interface LoginDto {
  email: string;
  password: string;
}

interface RefreshDto {
  refreshToken: string;
}

// Simple JWT-like token generation (replace with proper JWT in production)
function generateToken(payload: any, secret: string, expiresIn: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const payloadB64 = Buffer.from(JSON.stringify({ ...payload, exp: Date.now() + 3600000 })).toString('base64url');
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${payloadB64}`).digest('base64url');
  return `${header}.${payloadB64}.${signature}`;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('login')
  async login(@Body() dto: LoginDto) {
    const { email, password } = dto;

    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (!user) {
      console.log('[AUTH] LoginFailed: user not found', email);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Verify password (in production, use bcrypt)
    const passwordHash = crypto.createHash('sha256').update(password).digest('hex');
    if (user.passwordHash !== passwordHash) {
      console.log('[AUTH] LoginFailed: wrong password', email);
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      console.log('[AUTH] LoginFailed: inactive user', email);
      throw new UnauthorizedException('Account is disabled');
    }

    // Generate tokens
    const accessToken = generateToken(
      { userId: user.id, email: user.email, role: user.role, orgId: user.organizationId },
      process.env.JWT_SECRET || 'dev-secret-key',
      '15m'
    );

    const refreshToken = crypto.randomBytes(32).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    // Store refresh token
    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: refreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    console.log('[AUTH] LoginSucceeded:', user.id);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    };
  }

  @Post('refresh')
  async refresh(@Body() dto: RefreshDto) {
    const { refreshToken } = dto;
    const tokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const storedToken = await this.prisma.refreshToken.findFirst({
      where: {
        tokenHash,
        expiresAt: { gt: new Date() },
        revokedAt: null,
      },
      include: { user: true },
    });

    if (!storedToken) {
      console.log('[AUTH] RefreshFailed: invalid token');
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Generate new access token
    const accessToken = generateToken(
      {
        userId: storedToken.user.id,
        email: storedToken.user.email,
        role: storedToken.user.role,
        orgId: storedToken.user.organizationId,
      },
      process.env.JWT_SECRET || 'dev-secret-key',
      '15m'
    );

    // Optionally rotate refresh token
    await this.prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    const newRefreshToken = crypto.randomBytes(32).toString('hex');
    const newRefreshTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId: storedToken.user.id,
        tokenHash: newRefreshTokenHash,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    console.log('[AUTH] TokenRefreshed:', storedToken.user.id);

    return {
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  async logout(@Req() req: any) {
    const userId = req.user.userId;

    // Revoke all refresh tokens for user
    await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Record logout in audit (if audit table exists)
    try {
      await this.prisma.auditLog?.create({
        data: {
          action: 'LOGOUT',
          domain: 'auth',
          userId,
          createdAt: new Date(),
        },
      });
    } catch {
      // Audit table may not exist
    }

    console.log('[AUTH] LoggedOut:', userId);

    return { success: true };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async getCurrentUser(@Req() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        isActive: true,
        lastLoginAt: true,
      },
    });

    return user;
  }
}

// Auth Guard for protected routes
export const JwtAuthGuard = AuthGuard('jwt');

// Role-based guard
export const RoleGuard = RolesGuard;

// Permission map for radial commands
export const PERMISSION_MAP = {
  ADMIN: ['*'],
  PROPERTY_MANAGER: [
    'tenant:create',
    'tenant:edit',
    'payment:send-notice',
    'screening:approve',
    'screening:deny',
    'maintenance:schedule',
    'maintenance:create',
    'financial:categorize',
    'financial:reconcile',
    'lease:create',
    'property:create',
    'report:view',
  ],
  OWNER: [
    'financial:view',
    'portfolio:view',
    'document:view',
    'report:view',
  ],
  TENANT: [
    'payment:view',
    'maintenance:create',
    'document:view',
  ],
};