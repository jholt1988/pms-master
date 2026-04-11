import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { TenantFeedService } from './tenant-feed.service';

interface AuthenticatedRequest extends Request {
  user: { userId: string; role: string };
}

@Controller('tenant')
@UseGuards(AuthGuard('jwt'), RolesGuard, OrgContextGuard)
@Roles('TENANT')
export class TenantFeedController {
  constructor(private readonly tenantFeedService: TenantFeedService) {}

  /**
   * GET /tenant/feed
   * Returns a prioritised feed of actionable items for the authenticated tenant.
   */
  @Get('feed')
  getTenantFeed(@Request() req: AuthenticatedRequest) {
    return this.tenantFeedService.getTenantFeed(req.user.userId);
  }
}
