import { Injectable } from '@nestjs/common';
import { TrackDecisionEventDto } from './dto/track-decision-event.dto';
import { TrackUiEventDto } from './dto/track-ui-event.dto';

@Injectable()
export class AnalyticsService {
  async trackDecisionEvent(payload: TrackDecisionEventDto) {
    return { ok: true, payload };
  }

  async trackUiEvent(payload: TrackUiEventDto) {
    return { ok: true, payload };
  }

  async getDecisionSummary() {
    return {
      ok: true,
      totals: {
        decisionsTracked: 0,
        averageTimeToDecisionMs: 0,
      },
    };
  }

  async getWorkflowPerformance() {
    return {
      ok: true,
      workflows: {
        averageCompletionMs: 0,
        bottlenecks: [],
      },
    };
  }
}
