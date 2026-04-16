/**
 * Feature Flag Guard
 * 
 * Use to protect routes based on feature flags.
 * 
 * Usage:
 *   @UseGuards(JwtAuthGuard, FeatureFlagGuard)
 *   @RequiresFeature('dashboard_v2')
 *   @Get('dashboard')
 *   getDashboard() { ... }
 * 
 * Or use the decorator directly:
 *   @UseGuards(FeatureFlagGuard)
 *   @RequireFeatures(['dashboard_v2', 'maintenance_requests_v2'])
 *   getCombined() { ... }
 */

import {
  Injectable,
  CanActivate,
  ExecutionContext,
  SetMetadata,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagContext } from './feature-flag.types';

// Decorator metadata keys
export const FEATURE_FLAG_KEY = 'featureFlags';
export const FEATURE_FLAGS_ALL_KEY = 'featureFlagsAll';
export const FEATURE_FLAGS_ANY_KEY = 'featureFlagsAny';

/**
 * Decorator: Require a single feature flag
 */
export function RequiresFeature(featureKey: string) {
  return SetMetadata(FEATURE_FLAG_KEY, [featureKey]);
}

/**
 * Decorator: Require ALL of these feature flags
 */
export function RequireFeatures(featureKeys: string[]) {
  return SetMetadata(FEATURE_FLAGS_ALL_KEY, featureKeys);
}

/**
 * Decorator: Require ANY of these feature flags
 */
export function RequireAnyFeature(featureKeys: string[]) {
  return SetMetadata(FEATURE_FLAGS_ANY_KEY, featureKeys);
}

@Injectable()
export class FeatureFlagGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly featureFlagsService: FeatureFlagsService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Get the request object
    const request = context.switchToHttp().getRequest();
    
    // Extract context from user (if authenticated)
    const contextFromRequest = this.extractContext(request);

    // Check single feature requirement
    const requiredFeatures = this.reflector.get<string[]>(
      FEATURE_FLAG_KEY,
      context.getHandler(),
    );
    if (requiredFeatures && requiredFeatures.length > 0) {
      for (const feature of requiredFeatures) {
        if (!this.featureFlagsService.isEnabled(feature, contextFromRequest)) {
          return false;
        }
      }
    }

    // Check ALL features requirement
    const requireAll = this.reflector.get<string[]>(
      FEATURE_FLAGS_ALL_KEY,
      context.getHandler(),
    );
    if (requireAll && requireAll.length > 0) {
      if (!this.featureFlagsService.areAllEnabled(requireAll, contextFromRequest)) {
        return false;
      }
    }

    // Check ANY features requirement
    const requireAny = this.reflector.get<string[]>(
      FEATURE_FLAGS_ANY_KEY,
      context.getHandler(),
    );
    if (requireAny && requireAny.length > 0) {
      if (!this.featureFlagsService.areAnyEnabled(requireAny, contextFromRequest)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Extract user context from request
   */
  private extractContext(request: any): FeatureFlagContext {
    if (request.user) {
      return {
        userId: request.user.userId,
        tenantId: request.user.tenantId,
        roles: request.user.roles,
        email: request.user.email,
      };
    }
    return {};
  }
}