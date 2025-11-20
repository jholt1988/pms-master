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

@Module({
  imports: [EmailModule],
  controllers: [
    LeasingController,
    ToursController,
    LeadApplicationsController,
    LeadsLegacyController,
  ],
  providers: [
    PrismaService,
    LeasingService,
    ToursService,
    LeadApplicationsService,
  ],
  exports: [
    LeasingService,
    ToursService,
    LeadApplicationsService,
  ],
})
export class LeasingModule {}
