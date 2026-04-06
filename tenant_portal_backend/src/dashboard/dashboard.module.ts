import { Module } from '@nestjs/common';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { TenantDashboardController } from './tenant-dashboard.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { AuditLogService } from '../shared/audit-log.service';

@Module({
  imports: [PrismaModule],
  controllers: [DashboardController, TenantDashboardController],
  providers: [DashboardService, OrgContextGuard, AuditLogService],
})
export class DashboardModule {}
