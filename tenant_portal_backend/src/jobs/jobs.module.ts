import { Module } from '@nestjs/common';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [ScheduledJobsService],
  exports: [ScheduledJobsService],
})
export class JobsModule {}