import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { BullModule } from '@nestjs/bull';
import { AccountingAnomalyService } from './accounting-anomaly.service';
import { QuickBooksSyncProcessor } from './quickbooks-sync.processor';

import { QuickBooksMinimalService } from './quickbooks-minimal.service';
import { QuickBooksController as QuickBooksMinimalController } from './quickbooks-minimal.controller';

import { QuickBooksService } from './quickbooks.service';
import { AbstractQuickBooksService } from './quickbooks.types';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

const legacyEnabled = process.env.ENABLE_LEGACY_ROUTES === 'true';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'quickbooks-sync',
    }),
  ],
  controllers: [QuickBooksMinimalController],
  providers: [
    QuickBooksMinimalService,
    OrgContextGuard,
    // Bind the abstract DI token to the minimal implementation by default
    { provide: AbstractQuickBooksService, useClass: QuickBooksMinimalService },
    AccountingAnomalyService,
    QuickBooksSyncProcessor,
  ],
  exports: [QuickBooksMinimalService, AbstractQuickBooksService, AccountingAnomalyService],
})
export class QuickBooksModule {}
