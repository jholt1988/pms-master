import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { OrgContextGuard } from '../common/org-context/org-context.guard';
import { DecisionRecordController } from './decision-record.controller';
import { DecisionRecordService } from './decision-record.service';

@Module({
  imports: [PrismaModule],
  controllers: [DecisionRecordController],
  providers: [DecisionRecordService, OrgContextGuard],
  exports: [DecisionRecordService],
})
export class DecisionsModule {}
