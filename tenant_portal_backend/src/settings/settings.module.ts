import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { OrganizationSettingsController } from './organization-settings.controller';

/**
 * Registers the previously-orphaned OrganizationSettingsController so that the
 * /api/settings routes are actually mounted (see #75). PrismaService is global
 * via PrismaModule; OrgContextGuard is provided here to match the codebase
 * convention (e.g. BillingModule) for the @UseGuards(..., OrgContextGuard) trio.
 */
@Module({
  imports: [PrismaModule],
  providers: [OrgContextGuard],
  controllers: [OrganizationSettingsController],
})
export class SettingsModule {}
