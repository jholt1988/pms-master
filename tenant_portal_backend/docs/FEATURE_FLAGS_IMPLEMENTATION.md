# Feature Flags Implementation Guide

## Overview

This module provides a flexible feature flag system for the tenant_portal_backend. It supports:
- **Rollout strategies**: global percentage, per-tenant, per-user, admin-only, safe-mode
- **Dependencies**: features can depend on other features
- **Categories**: production, beta, experimental, deprecated
- **Environment targeting**: development, production, test

## Installation

### 1. Add the Module to AppModule

In `src/app.module.ts`, add the import:

```typescript
import { FeatureFlagsModule } from './feature-flags/feature-flags.module';

@Module({
  imports: [
    // ... other imports
    FeatureFlagsModule,  // Add this - it's @Global() so only needs to be imported once
  ],
})
export class AppModule {}
```

### 2. Define Your Feature Flags

Edit `src/feature-flags/feature-flags.config.ts` to add new features:

```typescript
export const FEATURE_FLAGS: FeatureFlag[] = [
  {
    key: 'my_new_feature',
    name: 'My New Feature',
    description: 'Description of what it does',
    enabled: true,                    // Global toggle
    rolloutPercentage: 50,            // 0-100, applies when enabled=true
    category: 'beta',                 // production | beta | experimental | deprecated
    strategy: 'all',                  // all | tenant | user | admin | safe-mode
    tenantIds: ['tenant-123'],        // For tenant strategy
    userIds: ['user-456'],            // For user strategy
    environments: ['development', 'production'], // Environments where flag is active
    dependencies: [],                 // Keys of features that must be enabled first
  },
];
```

## Usage Patterns

### Pattern 1: In Services

```typescript
import { FeatureFlagsService } from './feature-flags/feature-flags.service';

@Injectable()
export class MyService {
  constructor(private readonly featureFlags: FeatureFlagsService) {}

  async doSomething() {
    if (this.featureFlags.isEnabled('my_feature')) {
      // New behavior
    } else {
      // Fallback behavior
    }
  }
}
```

### Pattern 2: Guard Protection (Routes)

```typescript
import { UseGuards } from '@nestjs/common';
import { FeatureFlagGuard, RequiresFeature } from './feature-flags/feature-flag.guard';

@Controller('dashboard')
export class DashboardController {
  // Single feature requirement
  @UseGuards(FeatureFlagGuard)
  @RequiresFeature('dashboard_v2')
  @Get()
  getDashboard() { ... }

  // Multiple features (ALL must be enabled)
  @UseGuards(FeatureFlagGuard)
  @RequireFeatures(['dashboard_v2', 'analytics_module'])
  @Get('analytics')
  getAnalytics() { ... }

  // Multiple features (ANY must be enabled)
  @UseGuards(FeatureFlagGuard)
  @RequireAnyFeature(['dashboard_v2', 'legacy_dashboard'])
  @Get('fallback')
  getFallback() { ... }
}
```

### Pattern 3: Context-Aware Evaluation

```typescript
import { FeatureFlagsService } from './feature-flags/feature-flags.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly featureFlags: FeatureFlagsService) {}

  @Get()
  getReports(@Req() req: any) {
    // Context from JWT
    const context = {
      userId: req.user.userId,
      tenantId: req.user.tenantId,
      roles: req.user.roles,
    };

    // This will evaluate based on user/tenant
    const enabled = this.featureFlags.isEnabled('ai_reporting', context);
    
    // ...
  }
}
```

### Pattern 4: Batch Check for Frontend

```typescript
// Get all flags with status
const allFlags = featureFlagsService.getAllFlags(context);

// Get lightweight enabled-only map
const enabledFlags = featureFlagsService.getEnabledFlags(context);
// Returns: { dashboard_v2: true, maintenance_v2: true, ... }
```

## API Endpoints

After mounting in AppModule, these endpoints are available:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/feature-flags` | All flags with evaluation |
| `GET` | `/feature-flags/enabled` | Lightweight enabled-only map |
| `GET` | `/feature-flags/check/:key` | Single flag evaluation |
| `GET` | `/feature-flags/categories/:category` | Flags filtered by category |

### Response Examples

```json
// GET /feature-flags/check/dashboard_v2
{
  "key": "dashboard_v2",
  "enabled": true,
  "reason": "Rollout 100% (hash: 42)",
  "metadata": {
    "rolloutPercentage": 100,
    "strategy": "all"
  }
}

// GET /feature-flags/enabled
{
  "dashboard_v2": true,
  "maintenance_requests_v2": true,
  "ai_chatbot_assistant": true,
  "legacy_maintenance_portal": false
}
```

## Rollout Strategies Explained

| Strategy | Description | Use Case |
|----------|-------------|----------|
| `all` | Percentage rollout to all users | General releases |
| `tenant` | Per-tenant allowlist + percentage | B2B gradual rollout |
| `user` | Per-user allowlist + percentage | Beta testers |
| `admin` | Admin users only | Admin-only features |
| `safe-mode` | Exclude percentage from access | Quick rollback capability |

## Adding New Feature Flags

1. **Define flag**: Add entry to `feature-flags.config.ts`
2. **Use in code**: Import and use `FeatureFlagsService`
3. **Protect routes**: Use `FeatureFlagGuard` + decorators
4. **Frontend integration**: Call `/feature-flags/enabled` on app load

## Testing

Run the service tests:

```bash
npm test -- src/feature-flags/feature-flags.service.spec.ts
```

## Production Considerations

1. **Caching**: The service includes in-memory caching (1 min TTL). For production with multiple instances, consider Redis-backed caching.

2. **Monitoring**: Add logging/metrics around feature flag evaluations for rollout监控

3. **Database**: For mutable flags (toggleable at runtime), consider persisting to Prisma with a dedicated model.

4. **Safe rollout**: Always start with `enabled: false` or low `rolloutPercentage` for new features.