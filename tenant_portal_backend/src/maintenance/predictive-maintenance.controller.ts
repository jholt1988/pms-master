import { Body, Controller, Get, Param, Post, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { PredictiveMaintenanceService } from './predictive-maintenance.service';
import { Role } from '@prisma/client';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    username: string;
    role: Role;
  };
}

@Controller('maintenance/predictive')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@Roles('PROPERTY_MANAGER', 'ADMIN')
export class PredictiveMaintenanceController {
  constructor(private readonly predictiveService: PredictiveMaintenanceService) {}

  /**
   * Get all assets with their predictive health telemetry and RUL
   */
  @Get('assets')
  async getPredictiveAssets(@OrgId() orgId?: string) {
    return this.predictiveService.scanAssetsAndPredict(orgId);
  }

  /**
   * Org risk summary: counts by risk level, top categories, top drivers, and a
   * 30-day trend delta — aggregated from the latest per-asset snapshots (#9).
   */
  @Get('risk-summary')
  async getRiskSummary(@OrgId() orgId?: string) {
    return this.predictiveService.getRiskSummary(orgId);
  }

  /**
   * Latest risk snapshot for a single asset — risk level, drivers, confidence,
   * and data-quality flags for the "why this score" UI (#12/#13/#14).
   */
  @Get('assets/:id/risk')
  async getAssetRisk(@Param('id') id: string, @OrgId() orgId?: string) {
    return this.predictiveService.getAssetRisk(Number(id), orgId);
  }

  /**
   * Manual endpoint to trigger scan and generate ActionIntents for high risk assets
   */
  @Post('scan')
  async triggerScan(@OrgId() orgId?: string) {
    return this.predictiveService.scanAssetsAndPredict(orgId);
  }

  /**
   * Manually approve a preventative work order dispatch for a high risk asset
   */
  @Post('assets/:id/trigger-preventive')
  async triggerPreventive(
    @Param('id') id: string,
    @Request() req: AuthenticatedRequest,
  ) {
    const assetId = Number(id);
    const result = await this.predictiveService.triggerPreventiveTicket(assetId, req.user.userId);
    return {
      message: 'Preventative maintenance ticket successfully generated.',
      ticket: result,
    };
  }
}
