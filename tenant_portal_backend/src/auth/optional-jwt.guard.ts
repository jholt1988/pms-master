import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Allows endpoints to accept an Authorization header if present
 * but continue anonymously when no token is provided.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: unknown, user: any, _info?: unknown, _context?: ExecutionContext) {
    if (err) {
      throw err;
    }
    return user ?? null;
  }
}

