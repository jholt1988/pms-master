import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthGuard } from '@nestjs/passport';
import { LoginRequestDto } from './dto/login-request.dto';
import { RegisterRequestDto } from './dto/register-request.dto';
import { MfaActivateDto, MfaDisableDto } from './dto/mfa.dto';
import { Request } from 'express';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';



@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(@Body() loginDto: LoginRequestDto, @Req() req: Request) {
    return this.authService.login(loginDto, {
      ipAddress: this.getRequestIp(req),
      userAgent: req.headers['user-agent'] ?? undefined,
    });
  }

  @Post('register')
  async register(@Body() registerDto: RegisterRequestDto) {
    const result = await this.authService.register(registerDto);
    return { user: result };
  }

  @Get('password-policy')
  getPasswordPolicy() {
    return this.authService.getPasswordPolicy();
  }

  @UseGuards(AuthGuard('jwt'))
  @Get('profile')
  getProfile(@Req() req: Request) {
    return req.user;
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('mfa/prepare')
  async prepareMfa(@Req() req: Request) {
    const authUser = req.user as { sub: number; username: string };
    return this.authService.prepareMfa(authUser.sub, {
      username: authUser.username,
      ipAddress: this.getRequestIp(req),
      userAgent: req.headers['user-agent'] ?? undefined,
    });
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('mfa/activate')
  async activateMfa(@Req() req: Request, @Body() dto: MfaActivateDto) {
    const authUser = req.user as { sub: number; username: string };
    await this.authService.activateMfa(authUser.sub, dto.code, {
      username: authUser.username,
      ipAddress: this.getRequestIp(req),
      userAgent: req.headers['user-agent'] ?? undefined,
    });
    return { success: true };
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('mfa/disable')
  async disableMfa(@Req() req: Request, @Body() dto: MfaDisableDto) {
    const authUser = req.user as { sub: number; username: string };
    await this.authService.disableMfa(authUser.sub, dto.code, {
      username: authUser.username,
      ipAddress: this.getRequestIp(req),
      userAgent: req.headers['user-agent'] ?? undefined,
    });
    return { success: true };
  }

  private getRequestIp(req: Request): string | undefined {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string' && forwarded.length > 0) {
      return forwarded.split(',')[0]?.trim();
    }
    if (Array.isArray(forwarded) && forwarded.length > 0) {
      return forwarded[0];
    }
    return req.ip;
    }
    
@Post('forgot-password')
async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
  await this.authService.forgotPassword(dto.username, {
    ipAddress: this.getRequestIp(req),
    userAgent: req.headers['user-agent'] ?? undefined,
  });
  return { message: 'If a matching account was found, a password reset email has been sent.' };
}

@Post('reset-password')
async resetPassword(@Body() dto: ResetPasswordDto, @Req() req: Request) {
  await this.authService.resetPassword(dto.token, dto.newPassword, {
    ipAddress: this.getRequestIp(req),
    userAgent: req.headers['user-agent'] ?? undefined,
  });
  return { message: 'Password has been reset successfully.' };
}
}
