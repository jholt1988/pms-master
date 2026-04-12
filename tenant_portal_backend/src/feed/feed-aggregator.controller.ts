import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { MockAuthGuard } from '../auth/mock-auth.guard';
import { FeedAggregatorService } from './feed-aggregator.service';

@Controller('api/v2/feed')
@UseGuards(MockAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedAggregatorService) {}

  @Get()
  // @UseGuards(JwtAuthGuard)
  async getFeed(@Req() req, @Query('limit') limit = 20) {
    const userRole = req.user?.role;
    return this.feedService.getFeedForRole(userRole, Number(limit));
  }
}
