import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditLogModule } from '../shared/audit-log.module';
import { OperatorAuditLogController } from './operator-audit-log.controller';
import { OperatorAuditLogService } from './operator-audit-log.service';

@Module({
  imports: [PrismaModule, AuditLogModule],
  controllers: [OperatorAuditLogController],
  providers: [OperatorAuditLogService],
  exports: [OperatorAuditLogService],
})
export class OperatorAuditLogModule {}
