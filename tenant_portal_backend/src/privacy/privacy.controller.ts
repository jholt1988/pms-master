import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/roles.decorator';
import { OrgId } from '../common/org-context/org-id.decorator';
import { PrivacyService } from './privacy.service';

@Controller('privacy')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('PROPERTY_MANAGER', 'ADMIN')
export class PrivacyController {
  constructor(private readonly privacyService: PrivacyService) {}

  @Get('data-subjects/:userId/export')
  async exportUserData(@Param('userId') userId: string, @OrgId() orgId?: string) {
    return this.privacyService.exportUserData(userId, orgId);
  }

  @Post('data-subjects/:userId/anonymize')
  async anonymizeUserData(@Param('userId') userId: string, @OrgId() orgId?: string) {
    return this.privacyService.anonymizeUserData(userId, orgId);
  }
}
