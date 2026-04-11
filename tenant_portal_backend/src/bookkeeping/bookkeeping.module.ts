import { Module } from '@nestjs/common';
import { BookkeepingController } from './bookkeeping.controller';
import { BookkeepingService } from './bookkeeping.service';
import { PrismaModule } from '../prisma/prisma.module';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  imports: [PrismaModule],
  controllers: [BookkeepingController],
  providers: [BookkeepingService, OrgContextGuard],
  exports: [BookkeepingService],
})
export class BookkeepingModule {}
