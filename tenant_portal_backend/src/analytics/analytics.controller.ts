import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AnalyticsService } from './analytics.service';
import { TrackDecisionEventDto } from './dto/track-decision-event.dto';
import { TrackUiEventDto } from './dto/track-ui-event.dto';

@Controller('analytics')
@UseGuards(AuthGuard('jwt'))
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Post('decision-events')
  async trackDecisionEvent(@Body() payload: TrackDecisionEventDto) {
    return this.analyticsService.trackDecisionEvent(payload);
  }

  @Post('ui-events')
  async trackUiEvent(@Body() payload: TrackUiEventDto) {
    return this.analyticsService.trackUiEvent(payload);
  }

  @Get('decision-summary')
  async getDecisionSummary() {
    return this.analyticsService.getDecisionSummary();
  }

  @Get('workflow-performance')
  async getWorkflowPerformance() {
    return this.analyticsService.getWorkflowPerformance();
  }
}
