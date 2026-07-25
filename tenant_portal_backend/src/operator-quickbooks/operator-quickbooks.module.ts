import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { QuickBooksModule } from '../quickbooks/quickbooks.module';
import { OperatorQuickBooksController } from './operator-quickbooks.controller';
import { OperatorQuickBooksService } from './operator-quickbooks.service';

@Module({
  imports: [PrismaModule, QuickBooksModule],
  controllers: [OperatorQuickBooksController],
  providers: [OperatorQuickBooksService],
  exports: [OperatorQuickBooksService],
})
export class OperatorQuickBooksModule {}
