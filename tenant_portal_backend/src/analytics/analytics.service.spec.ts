import { AnalyticsService } from './analytics.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;

  beforeEach(() => {
    service = new AnalyticsService();
  });

  it('tracks decision events', async () => {
    const payload = { decisionType: 'APPROVE', actorId: 'u1' } as any;
    await expect(service.trackDecisionEvent(payload)).resolves.toEqual({ ok: true, payload });
  });

  it('tracks ui events', async () => {
    const payload = { eventName: 'CLICK', surface: 'dashboard' } as any;
    await expect(service.trackUiEvent(payload)).resolves.toEqual({ ok: true, payload });
  });

  it('returns decision summary', async () => {
    await expect(service.getDecisionSummary()).resolves.toEqual({
      ok: true,
      totals: { decisionsTracked: 0, averageTimeToDecisionMs: 0 },
    });
  });

  it('returns workflow performance summary', async () => {
    await expect(service.getWorkflowPerformance()).resolves.toEqual({
      ok: true,
      workflows: { averageCompletionMs: 0, bottlenecks: [] },
    });
  });
});

