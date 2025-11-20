
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './jwt.strategy';
import { PasswordPolicyService } from './password-policy.service';
import { SecurityEventsModule } from '../security-events/security-events.module';
import { EmailModule } from '../email/email.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    PassportModule,
    SecurityEventsModule,
    EmailModule,
    PrismaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('JWT_SECRET');
        if (!secret) {
          throw new Error('JWT_SECRET must be provided');
        }
        return {
          secret,
          signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '60m') as any },
        };
      },
    }),
  ],
  providers: [AuthService, JwtStrategy, PasswordPolicyService],
  controllers: [AuthController],
})
export class AuthModule {}
