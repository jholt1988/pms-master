// Telemetry Controller - P0 Gap Remediation
// API endpoints for telemetry tracking

import { Controller, Post, Get, Body, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { Roles } from '../auth/roles.decorator';
import { TelemetryService, TelemetryEvent } from './telemetry.service';

@Controller('telemetry')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class TelemetryController {
  constructor(private readonly telemetryService: TelemetryService) {}

  /**
   * Track an event from client
   */
  @Post('track')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN', 'TENANT')
  async trackEvent(
    @Body() body: TelemetryEvent,
    @OrgId() orgId?: string,
  ) {
    await this.telemetryService.trackEvent({
      ...body,
      orgId: body.orgId ?? orgId,
    });
    return { success: true };
  }

  /**
   * Track UI action (shorthand)
   */
  @Post('action')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  async trackAction(
    @Body() body: { action: string; domain: string; entityId?: string; metadata?: Record<string, unknown> },
    @OrgId() orgId?: string,
  ) {
    await this.telemetryService.trackAction(
      body.action,
      body.domain,
      body.entityId,
      body.metadata,
    );
    return { success: true };
  }

  /**
   * Track a decision from briefing orb
   */
  @Post('decision')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async trackDecision(
    @Body() body: { decisionId: string; decisionType: string; outcome: string },
  ) {
    await this.telemetryService.trackDecision(
      body.decisionId,
      body.decisionType,
      body.outcome,
    );
    return { success: true };
  }

  /**
   * Get telemetry summary
   */
  @Get('summary')
  @Roles('ADMIN', 'PROPERTY_MANAGER')
  async getSummary(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days, 10) : 7;
    return this.telemetryService.getSummary(daysNum);
  }
}