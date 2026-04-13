import { Test } from '@nestjs/testing';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';

describe('AnalyticsController', () => {
  let controller: AnalyticsController;

  beforeEach(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [AnalyticsService],
    }).compile();

    controller = moduleRef.get(AnalyticsController);
  });

  it('records a decision analytics event', async () => {
    const response = await controller.trackDecisionEvent({
      decisionId: 'd1',
      actionTaken: 'approve',
      timeToDecisionMs: 14000,
      confidenceAtTime: 88,
    });

    expect(response).toEqual(
      expect.objectContaining({
        ok: true,
        payload: expect.objectContaining({
          decisionId: 'd1',
          actionTaken: 'approve',
          timeToDecisionMs: 14000,
          confidenceAtTime: 88,
        }),
      }),
    );
  });
});
