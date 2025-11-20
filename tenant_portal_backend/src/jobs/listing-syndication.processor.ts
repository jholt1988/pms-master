import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { ListingSyndicationService } from '../listing-syndication/listing-syndication.service';

@Processor('listingSyndication')
export class ListingSyndicationProcessor {
  private readonly logger = new Logger(ListingSyndicationProcessor.name);

  constructor(private readonly listingSyndicationService: ListingSyndicationService) {}

  @Process('sync')
  async handleSync(job: Job<{ entryId: number }>) {
    this.logger.debug(`Processing syndication job ${job.data.entryId}`);
    await this.listingSyndicationService.processQueueEntry(job.data.entryId);
  }
}
