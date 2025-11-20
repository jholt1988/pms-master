import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { ReportingModule } from '../reporting/reporting.module';
import { ListingSyndicationService } from './listing-syndication.service';
import { ListingSyndicationController } from './listing-syndication.controller';
import { ZillowSyndicationAdapter } from './providers/zillow.adapter';
import { ApartmentsComSyndicationAdapter } from './providers/apartments-com.adapter';
import { ListingSyndicationProcessor } from '../jobs/listing-syndication.processor';
import { ListingSyndicationScheduler } from '../jobs/listing-syndication.scheduler';

@Module({
  imports: [
    PrismaModule,
    ReportingModule,
    BullModule.forRoot({
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT || 6379),
      },
    }),
    BullModule.registerQueue({
      name: 'listingSyndication',
    }),
  ],
  controllers: [ListingSyndicationController],
  providers: [
    ListingSyndicationService,
    ZillowSyndicationAdapter,
    ApartmentsComSyndicationAdapter,
    ListingSyndicationProcessor,
    ListingSyndicationScheduler,
  ],
  exports: [ListingSyndicationService],
})
export class ListingSyndicationModule {}
