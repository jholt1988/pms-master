import { Module } from '@nestjs/common';
import { ReportingService } from './reporting.service';
import { AnalyticsService } from './analytics.service';
import { ReportingController } from './reporting.controller';
import { OwnerAnalyticsController } from './owner-analytics.controller';
import { OwnerAnalyticsService } from './owner-analytics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { AppCacheModule } from '../cache/cache.module';
import { AIProviderService } from '../ai-provider';

@Module({
  imports: [PrismaModule, AppCacheModule],
  controllers: [ReportingController, OwnerAnalyticsController],
  providers: [ReportingService, AnalyticsService, OwnerAnalyticsService, OrgContextGuard, AIProviderService],
  exports: [ReportingService, AnalyticsService, OwnerAnalyticsService],
})
export class ReportingModule {}

