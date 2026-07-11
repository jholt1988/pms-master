import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { DecisionRecordController } from './decision-record.controller';
import { DecisionRecordService } from './decision-record.service';

@Module({
  imports: [PrismaModule],
  controllers: [DecisionRecordController],
  providers: [DecisionRecordService],
  exports: [DecisionRecordService],
})
export class DecisionsModule {}
