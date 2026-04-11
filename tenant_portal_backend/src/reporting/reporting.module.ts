import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { AnalyticsService } from './analytics.service';
import { ReportingController } from './reporting.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ReportingController],
  providers: [ReportingService, AnalyticsService, OrgContextGuard],
  exports: [ReportingService, AnalyticsService],
})
export class ReportingModule {}

