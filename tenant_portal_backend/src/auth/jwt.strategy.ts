
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private readonly configService: ConfigService) {
    const env = (configService.get<string>('NODE_ENV') || process.env.NODE_ENV || 'development').toLowerCase();
    let secret = configService.get<string>('JWT_SECRET');

    if (!secret) {
      if (env === 'production') {
        throw new Error('JWT_SECRET must be configured');
      }
      secret = 'dev-jwt-secret-change-me';
      // eslint-disable-next-line no-console
      console.warn('[JwtStrategy] JWT_SECRET not set; using insecure dev default. Set JWT_SECRET in .env for real usage.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    return { sub: payload.sub, userId: payload.sub, username: payload.username, role: payload.role };
  }
}
