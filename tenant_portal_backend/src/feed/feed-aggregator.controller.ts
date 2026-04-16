import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FeedAggregatorService } from './feed-aggregator.service';

@Controller('api/v2/feed')
@UseGuards(AuthGuard('jwt'))
export class FeedController {
  constructor(private readonly feedService: FeedAggregatorService) {}

  @Get()
  // @UseGuards(JwtAuthGuard)
  async getFeed(@Req() req, @Query('limit') limit = 20) {
    const userRole = req.user?.role;
    return this.feedService.getFeedForRole(userRole, Number(limit));
  }
}
