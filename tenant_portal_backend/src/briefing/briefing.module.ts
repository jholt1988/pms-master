import { Module } from '@nestjs/common';
import { BriefingController } from './briefing.controller';
import { BriefingService } from './briefing.service';
import { PrismaModule } from '../prisma/prisma.module';
import { BookkeepingModule } from '../bookkeeping/bookkeeping.module';

@Module({
  imports: [PrismaModule, BookkeepingModule],
  controllers: [BriefingController],
  providers: [BriefingService],
  exports: [BriefingService],
})
export class BriefingModule {}
