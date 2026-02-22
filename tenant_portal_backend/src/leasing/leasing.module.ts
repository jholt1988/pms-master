/**
 * Leasing Module
 * Handles AI Leasing Agent backend functionality
 */

import { Module } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailModule } from '../email/email.module';
import { LeasingController } from './leasing.controller';
import { LeasingService } from './leasing.service';
import { ToursController } from './tours.controller';
import { ToursService } from './tours.service';
import { LeadApplicationsController } from './lead-applications.controller';
import { LeadApplicationsService } from './lead-applications.service';
import { LeadsLegacyController } from '../legacy/leads-legacy.controller';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

const legacyEnabled = process.env.ENABLE_LEGACY_ROUTES === 'true';

@Module({
  imports: [EmailModule],
  controllers: legacyEnabled
    ? [LeasingController, ToursController, LeadApplicationsController, LeadsLegacyController]
    : [LeasingController, ToursController, LeadApplicationsController],
  providers: [
    PrismaService,
    LeasingService,
    ToursService,
    LeadApplicationsService,
    OrgContextGuard,
  ],
  exports: [
    LeasingService,
    ToursService,
    LeadApplicationsService,
  ],
})
export class LeasingModule {}
