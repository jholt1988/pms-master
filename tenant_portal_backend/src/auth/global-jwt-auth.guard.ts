import { ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from './public.decorator';

/**
 * Global JWT authentication guard.
 *
 * Registered application-wide via APP_GUARD so that, by default, EVERY route
 * requires a valid JWT. Routes (or whole controllers) explicitly annotated
 * with @Public() are exempted: canActivate short-circuits to `true` before
 * passport runs, allowing anonymous access (e.g. login, inbound webhooks,
 * health/metrics).
 *
 * This is intentionally additive to the existing per-controller
 * @UseGuards(AuthGuard('jwt'), RolesGuard) usage and the ThrottlerGuard
 * APP_GUARD. RolesGuard behaviour is unchanged.
 */
@Injectable()
export class GlobalJwtAuthGuard extends AuthGuard('jwt') {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    return super.canActivate(context);
  }
}
