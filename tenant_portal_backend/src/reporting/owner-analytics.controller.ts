import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { OwnerAnalyticsService } from './owner-analytics.service';

@Controller('reporting')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class OwnerAnalyticsController {
  constructor(private readonly ownerAnalyticsService: OwnerAnalyticsService) {}

  @Get('owner-portfolio-analytics')
  @Roles('OWNER', 'PROPERTY_MANAGER', 'ADMIN')
  async getOwnerPortfolioAnalytics(@OrgId() orgId?: string) {
    // If orgId is not present, use a default fallback or empty string.
    // The service handles missing properties correctly.
    return this.ownerAnalyticsService.getOwnerPortfolioAnalytics(orgId || '');
  }
}
