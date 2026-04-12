import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContractorBiddingController } from './contractor-bidding.controller';
import { ContractorBiddingService } from './contractor-bidding.service';
import { OrgContextGuard } from '../common/org-context/org-context.guard';

@Module({
  imports: [PrismaModule],
  controllers: [ContractorBiddingController],
  providers: [ContractorBiddingService, OrgContextGuard],
  exports: [ContractorBiddingService],
})
export class ContractorBiddingModule {}
