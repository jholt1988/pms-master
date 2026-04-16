/**
 * Feature Flags Module
 * 
 * Provides feature flag functionality throughout the application.
 * 
 * Usage:
 *   // In any service
 *   constructor(private readonly featureFlags: FeatureFlagsService) {}
 *   if (this.featureFlags.isEnabled('my-feature', context)) { ... }
 * 
 *   // Using decorator
 *   @RequiresFeature('dashboard_v2')
 *   async getDashboard() { ... }
 */

import { Module, Global } from '@nestjs/common';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlagsController } from './feature-flags.controller';
import { FeatureFlagGuard } from './feature-flag.guard';

@Global()
@Module({
  providers: [FeatureFlagsService, FeatureFlagGuard],
  controllers: [FeatureFlagsController],
  exports: [FeatureFlagsService, FeatureFlagGuard],
})
export class FeatureFlagsModule {}