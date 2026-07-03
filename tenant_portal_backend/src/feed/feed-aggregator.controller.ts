import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FeedAggregatorService } from './feed-aggregator.service';

// Global prefix 'api' is applied at bootstrap; declare only the resource segment here.
@Controller('feed')
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
