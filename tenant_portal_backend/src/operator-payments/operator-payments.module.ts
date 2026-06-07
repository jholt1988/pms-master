import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BookkeepingModule } from '../bookkeeping/bookkeeping.module';
import { PaymentsModule } from '../payments/payments.module';
import { OperatorPaymentsController } from './operator-payments.controller';
import { OperatorPaymentsService } from './operator-payments.service';

@Module({
  imports: [PrismaModule, PaymentsModule, BookkeepingModule],
  controllers: [OperatorPaymentsController],
  providers: [OperatorPaymentsService],
  exports: [OperatorPaymentsService],
})
export class OperatorPaymentsModule {}
