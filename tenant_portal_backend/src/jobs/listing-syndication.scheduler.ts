import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ListingSyndicationService } from '../listing-syndication/listing-syndication.service';

@Injectable()
export class ListingSyndicationScheduler {
  private readonly logger = new Logger(ListingSyndicationScheduler.name);

  constructor(private readonly listingSyndicationService: ListingSyndicationService) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async hydrateQueue() {
    this.logger.debug('Hydrating listing syndication queue');
    await this.listingSyndicationService.schedulePendingJobs();
  }

  @Cron(CronExpression.EVERY_10_MINUTES)
  async refreshFeeds() {
    this.logger.debug('Refreshing syndication feeds');
    await this.listingSyndicationService.refreshEnabledProperties();
  }
}
