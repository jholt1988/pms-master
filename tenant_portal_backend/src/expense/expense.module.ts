
import { Module } from '@nestjs/common';
import { ExpenseController } from './expense.controller';
import { ExpenseService } from './expense.service';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  controllers: [ExpenseController],
  providers: [ExpenseService, OrgContextGuard],
})
export class ExpenseModule {}
