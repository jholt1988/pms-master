import { Controller, Get, Post, UseGuards, Request, Body, HttpCode } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrgId } from '../common/org-context/org-id.decorator';
import { Roles } from '../auth/roles.decorator';
import { BriefingService } from './briefing.service';

@Controller('briefing')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
export class BriefingController {
  constructor(private readonly briefingService: BriefingService) {}

  @Get('daily')
  @Roles('PROPERTY_MANAGER', 'OWNER', 'ADMIN')
  getDailyBriefing(
    @Request() req: any,
    @OrgId() orgId?: string,
  ) {
    return this.briefingService.getDailyBriefing(req.user.userId, orgId);
  }

  // ========== GAP REMEDIATION - Issue 10: Portfolio Risk Briefing ==========

  /**
   * Inject risk item into briefing layer
   * Gap: Issue 10 - Portfolio Risk Surfacing (P0)
   */
  @Post('inject-risk-item')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  @HttpCode(201)
  async injectRiskItem(
    @Body() body: { propertyId: string; riskType: string; riskScore: number; description: string },
    @OrgId() orgId: string,
  ) {
    return this.briefingService.injectRiskItem(
      body.propertyId,
      body.riskType,
      body.riskScore,
      body.description,
      orgId,
    );
  }

  // ========== END GAP REMEDIATION ==========
}
