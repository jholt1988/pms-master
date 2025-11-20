import { Module } from '@nestjs/common';
import { QuickBooksMinimalService } from './quickbooks-minimal.service';
import { QuickBooksController } from './quickbooks-minimal.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [QuickBooksController],
  providers: [QuickBooksMinimalService],
  exports: [QuickBooksMinimalService],
})
export class QuickBooksModule {}