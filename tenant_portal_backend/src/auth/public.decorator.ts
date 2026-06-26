import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used to flag a route handler or controller as publicly
 * accessible (i.e. exempt from the global JWT auth guard).
 */
export const IS_PUBLIC_KEY = 'isPublic';

/**
 * Marks a route handler or controller as public so that the
 * GlobalJwtAuthGuard skips JWT authentication for it.
 *
 * Usage:
 *   @Public()
 *   @Post('login')
 *   login() { ... }
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
