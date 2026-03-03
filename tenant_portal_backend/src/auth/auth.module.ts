
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
import { DefaultApi as MilApiClient } from '../../../packages/mil-client';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    ConfigModule,
    UsersModule,
    PassportModule,
    SecurityEventsModule,
    EmailModule,
    PrismaModule,
    HttpModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const env = (configService.get<string>('NODE_ENV') || process.env.NODE_ENV || 'development').toLowerCase();
        let secret = configService.get<string>('JWT_SECRET');

        // Allow local/dev boot without a full .env.
        if (!secret) {
          if (env === 'production') {
            throw new Error('JWT_SECRET must be provided');
          }
          secret = 'dev-jwt-secret-change-me';
          // eslint-disable-next-line no-console
          console.warn('[AuthModule] JWT_SECRET not set; using insecure dev default. Set JWT_SECRET in .env for real usage.');
        }

        return {
          secret,
          signOptions: { expiresIn: configService.get<string>('JWT_EXPIRES_IN', '60m') as any },
        };
      },
    }),
  ],
  providers: [
    AuthService, 
    JwtStrategy, 
    PasswordPolicyService,
    {
      provide: MilApiClient,
      useFactory: (configService: ConfigService) => {
        const milServiceUrl = configService.get<string>('MIL_SERVICE_URL', 'http://localhost:8080');
        return new MilApiClient(undefined, milServiceUrl);
      },
      inject: [ConfigService],
    },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
