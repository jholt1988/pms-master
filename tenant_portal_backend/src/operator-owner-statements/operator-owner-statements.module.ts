import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BookkeepingModule } from '../bookkeeping/bookkeeping.module';
import { AuditLogModule } from '../shared/audit-log.module';
import { OperatorOwnerStatementsController } from './operator-owner-statements.controller';
import { OperatorOwnerStatementsService } from './operator-owner-statements.service';

@Module({
  imports: [PrismaModule, BookkeepingModule, AuditLogModule],
  controllers: [OperatorOwnerStatementsController],
  providers: [OperatorOwnerStatementsService],
  exports: [OperatorOwnerStatementsService],
})
export class OperatorOwnerStatementsModule {}
