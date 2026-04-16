/**
 * Feature Flags Controller
 * 
 * REST API for frontend to query feature flags.
 * Endpoints:
 *   GET /feature-flags - Get all flags with status
 *   GET /feature-flags/enabled - Get only enabled flags (lightweight)
 *   GET /feature-flags/:key - Check single flag status
 *   GET /feature-flags/categories/:category - Get flags by category
 */

import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { FeatureFlagsService } from './feature-flags.service';
import { FeatureFlag, FeatureFlagCategory } from './feature-flag.types';
import { OptionalJwtAuthGuard } from '../auth/optional-jwt.guard';
import { Request } from 'express';

interface AuthenticatedRequest extends Request {
  user?: {
    userId: string;
    tenantId: string;
    roles: string[];
    email: string;
  };
}

@ApiTags('Feature Flags')
@Controller('feature-flags')
export class FeatureFlagsController {
  constructor(private readonly featureFlagsService: FeatureFlagsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all feature flags with current status' })
  @ApiResponse({ status: 200, description: 'All feature flags returned' })
  getAllFlags(@Req() req: AuthenticatedRequest) {
    const context = this.extractContext(req);
    return this.featureFlagsService.getAllFlags(context);
  }

  @Get('enabled')
  @ApiOperation({ summary: 'Get lightweight map of enabled flags' })
  @ApiResponse({ status: 200, description: 'Map of flag keys to enabled status' })
  getEnabledFlags(@Req() req: AuthenticatedRequest) {
    const context = this.extractContext(req);
    return this.featureFlagsService.getEnabledFlags(context);
  }

  @Get('check/:key')
  @ApiOperation({ summary: 'Check if a specific feature flag is enabled' })
  @ApiResponse({ status: 200, description: 'Feature flag evaluation result' })
  checkFlag(@Param('key') key: string, @Req() req: AuthenticatedRequest) {
    const context = this.extractContext(req);
    return this.featureFlagsService.evaluate(key, context);
  }

  @Get('categories/:category')
  @ApiOperation({ summary: 'Get feature flags by category' })
  @ApiResponse({ status: 200, description: 'Flags in the specified category' })
  getFlagsByCategory(
    @Param('category') category: FeatureFlagCategory,
    @Req() req: AuthenticatedRequest,
  ) {
    const context = this.extractContext(req);
    return this.featureFlagsService.getFlagsByCategory(category, context);
  }

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  @ApiResponse({ status: 200, description: 'Service status' })
  health() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  /**
   * Extract user context from request
   */
  private extractContext(req: AuthenticatedRequest) {
    if (req.user) {
      return {
        userId: req.user.userId,
        tenantId: req.user.tenantId,
        roles: req.user.roles,
        email: req.user.email,
      };
    }
    return undefined;
  }
}