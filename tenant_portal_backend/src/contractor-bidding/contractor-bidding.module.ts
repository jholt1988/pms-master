import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { ContractorBiddingController } from './contractor-bidding.controller';
import { ContractorBiddingService } from './contractor-bidding.service';

@Module({
  imports: [PrismaModule],
  controllers: [ContractorBiddingController],
  providers: [ContractorBiddingService],
  exports: [ContractorBiddingService],
})
export class ContractorBiddingModule {}
