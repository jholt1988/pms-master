import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

import { QuickBooksMinimalService } from './quickbooks-minimal.service';
import { QuickBooksController as QuickBooksMinimalController } from './quickbooks-minimal.controller';

import { QuickBooksController as QuickBooksFullController } from './quickbooks.controller';
import { QuickBooksService } from './quickbooks.service';
import { AbstractQuickBooksService } from './quickbooks.types';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

const legacyEnabled = process.env.ENABLE_LEGACY_ROUTES === 'true';

@Module({
  imports: [PrismaModule],
  controllers: legacyEnabled
    ? [QuickBooksMinimalController, QuickBooksFullController]
    : [QuickBooksMinimalController],
  providers: legacyEnabled
    ? [
        QuickBooksMinimalService,
        QuickBooksService,
        OrgContextGuard,
        // Bind the abstract DI token to the full QuickBooksService when legacy mode is enabled
        { provide: AbstractQuickBooksService, useClass: QuickBooksService },
      ]
    : [
        QuickBooksMinimalService,
        OrgContextGuard,
        // Bind the abstract DI token to the minimal implementation by default
        { provide: AbstractQuickBooksService, useClass: QuickBooksMinimalService },
      ],
  exports: [QuickBooksMinimalService, AbstractQuickBooksService],
})
export class QuickBooksModule {}
