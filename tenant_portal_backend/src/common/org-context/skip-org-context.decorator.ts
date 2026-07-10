import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key used to flag a route handler or controller as exempt from the
 * global OrgContextGuard.
 */
export const SKIP_ORG_CONTEXT_KEY = 'skipOrgContext';

/**
 * Marks a route handler or controller to bypass the global OrgContextGuard.
 *
 * OrgContextGuard is registered application-wide via APP_GUARD, so by default
 * every authenticated non-tenant request must resolve to exactly one
 * Organization. Use @SkipOrgContext() for the rare authenticated endpoints that
 * intentionally operate without an organization scope (e.g. platform-admin or
 * cross-org utilities).
 *
 * Note: @Public() routes are already exempt automatically — you do not need
 * @SkipOrgContext() on them.
 */
export const SkipOrgContext = () => SetMetadata(SKIP_ORG_CONTEXT_KEY, true);
