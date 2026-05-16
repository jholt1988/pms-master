import { Controller, Post, Body, UseGuards, Get, Req, HttpCode, HttpStatus } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from './roles.guard';
import { AuthService } from './auth.service';
import { LoginRequestDto } from './dto/login-request.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { RefreshRequestDto } from './dto/refresh-request.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { MfaActivateDto, MfaDisableDto } from './dto/mfa.dto';
import { Request } from 'express';

function getIpAddress(req: any): string {
  if (req.headers && req.headers['x-forwarded-for']) {
    return req.headers['x-forwarded-for'].split(',')[0].trim();
  }
  return req.ip;
}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  async register(@Body() dto: RegisterRequestDto) {
    const user = await this.authService.register(dto);
    return { user };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginRequestDto,
    @Req() req: any,
  ) {
    const ipAddress = getIpAddress(req);
    const userAgent = req.headers ? req.headers['user-agent'] : undefined;
    const context = { ipAddress, userAgent };
    return this.authService.login(dto, context);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() dto: RefreshRequestDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: any) {
    const jti = req.user.jti;
    const exp = req.user.exp;
    const expiresInSeconds = exp ? exp - Math.floor(Date.now() / 1000) : 3600;
    await this.authService.logout(jti, Math.max(expiresInSeconds, 0));
    return { success: true };
  }

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(
    @Body() dto: ForgotPasswordDto,
    @Req() req: any,
  ) {
    const ipAddress = getIpAddress(req);
    const userAgent = req.headers ? req.headers['user-agent'] : undefined;
    const context = { ipAddress, userAgent };
    await this.authService.forgotPassword(dto.username, context);
    return { message: 'If a matching account was found, a password reset email has been sent.' };
  }

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(
    @Body() dto: ResetPasswordDto,
    @Req() req: any,
  ) {
    const ipAddress = getIpAddress(req);
    const userAgent = req.headers ? req.headers['user-agent'] : undefined;
    const context = { ipAddress, userAgent };
    await this.authService.resetPassword(dto.token, dto.newPassword, context);
    return { message: 'Password has been reset successfully.' };
  }

  @Post('mfa/prepare')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async prepareMfa(
    @Req() req: any,
  ) {
    const ipAddress = getIpAddress(req);
    const userAgent = req.headers ? req.headers['user-agent'] : undefined;
    const context = { username: req.user.username, ipAddress, userAgent };
    return this.authService.prepareMfa(req.user.sub, context);
  }

  @Post('mfa/activate')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async activateMfa(
    @Req() req: any,
    @Body() dto: MfaActivateDto,
  ) {
    const ipAddress = getIpAddress(req);
    const userAgent = req.headers ? req.headers['user-agent'] : undefined;
    const context = { username: req.user.username, ipAddress, userAgent };
    await this.authService.activateMfa(req.user.sub, dto.code, context);
    return { success: true };
  }

  @Post('mfa/disable')
  @UseGuards(AuthGuard('jwt'))
  @HttpCode(HttpStatus.OK)
  async disableMfa(
    @Req() req: any,
    @Body() dto: MfaDisableDto,
  ) {
    const ipAddress = getIpAddress(req);
    const userAgent = req.headers ? req.headers['user-agent'] : undefined;
    const context = { username: req.user.username, ipAddress, userAgent };
    await this.authService.disableMfa(req.user.sub, dto.code, context);
    return { success: true };
  }

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  getProfile(@Req() req: any) {
    return {
      sub: req.user.sub,
      username: req.user.username,
    };
  }

  @Get('password-policy')
  getPasswordPolicy() {
    return this.authService.getPasswordPolicy();
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