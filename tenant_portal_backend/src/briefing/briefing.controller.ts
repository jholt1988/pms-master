import { Controller, Get, UseGuards, Request } from '@nestjs/common';
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
}
