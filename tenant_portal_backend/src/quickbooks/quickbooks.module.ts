import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';

import { QuickBooksMinimalService } from './quickbooks-minimal.service';
import { QuickBooksController as QuickBooksMinimalController } from './quickbooks-minimal.controller';

import { QuickBooksController as QuickBooksFullController } from './quickbooks.controller';
import { QuickBooksService } from './quickbooks.service';

const legacyEnabled = process.env.ENABLE_LEGACY_ROUTES === 'true';

@Module({
  imports: [PrismaModule],
  controllers: legacyEnabled
    ? [QuickBooksMinimalController, QuickBooksFullController]
    : [QuickBooksMinimalController],
  providers: legacyEnabled
    ? [QuickBooksMinimalService, QuickBooksService]
    : [QuickBooksMinimalService],
  exports: [QuickBooksMinimalService],
})
export class QuickBooksModule {}
