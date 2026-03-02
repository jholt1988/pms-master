import { Module } from '@nestjs/common';
import { ScheduleController } from './schedule.controller';
import { ScheduleService } from './schedule.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { AuditLogService } from '../shared/audit-log.service';

@Module({
  imports: [PrismaModule],
  controllers: [ScheduleController],
  providers: [ScheduleService, OrgContextGuard, AuditLogService],
  exports: [ScheduleService],
})
export class EventScheduleModule {}
