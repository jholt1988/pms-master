import { FeedAggregatorService } from './feed-aggregator.service';

describe('FeedAggregatorService', () => {
  const prisma = {
    feedItem: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
  } as any;

  let service: FeedAggregatorService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new FeedAggregatorService(prisma);
  });

  it('returns the canonical feed response shape for feed consumers', async () => {
    prisma.feedItem.findMany.mockResolvedValue([
      {
        id: 'payments_rent_delinquent_42',
        domain: 'payments',
        type: 'rent_delinquent',
        title: 'Rent Payment Delinquent',
        summary: 'Payment is overdue.',
        priorityScore: 87.6,
        createdAt: new Date('2026-04-12T00:00:00.000Z'),
        updatedAt: new Date('2026-04-12T01:00:00.000Z'),
        actions: [
          {
            type: 'mutation',
            label: 'Issue 3-Day Notice',
            intent: 'send_3_day_notice',
            variant: 'destructive',
            requiresConfirm: true,
          },
        ],
        roleAccess: ['property_manager', 'ADMIN'],
        propertyId: 'prop-1',
        evidence: { paymentId: 42 },
      },
    ]);

    const result = await service.getFeedForRole('PROPERTY_MANAGER', 10);

    expect(prisma.feedItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          isDismissed: false,
        }),
        take: 10,
      }),
    );

    expect(result).toEqual(
      expect.objectContaining({
        role: 'PROPERTY_MANAGER',
        generatedAt: expect.any(String),
        items: [
          expect.objectContaining({
            id: 'payments_rent_delinquent_42',
            kind: 'critical_signal',
            domain: 'payments',
            title: 'Rent Payment Delinquent',
            summary: 'Payment is overdue.',
            priority: 88,
            propertyId: 'prop-1',
            timestamp: '2026-04-12T01:00:00.000Z',
            allowedRoles: ['PROPERTY_MANAGER', 'ADMIN'],
            metadata: { paymentId: 42 },
            actions: [
              expect.objectContaining({
                type: 'mutation',
                intent: 'send_3_day_notice',
                requiresConfirm: true,
              }),
            ],
          }),
        ],
      }),
    );
  });

  it('normalizes enhanced evidence metadata into canonical feed metadata', async () => {
    prisma.feedItem.findMany.mockResolvedValue([
      {
        id: 'decision_1',
        domain: 'payments',
        type: 'decision',
        title: 'Approve hardship plan',
        summary: 'Resident requested help',
        priorityScore: 82,
        createdAt: new Date('2026-04-13T10:00:00.000Z'),
        updatedAt: new Date('2026-04-13T10:05:00.000Z'),
        actions: [{ label: 'Approve', intent: 'approve', variant: 'primary' }],
        roleAccess: ['admin'],
        evidence: {
          reasoning: ['Resident has 11 month streak'],
          type: 'approval',
          confidenceScore: 88,
          impact: { financial: 1400, risk: 'low', timeline: 'today' },
          relatedDecisionIds: ['prev-1'],
          workflow: { stage: 'manager_review', totalStages: 3, currentStageIndex: 2 },
        },
      },
    ]);

    const result = await service.getFeedForRole('admin', 10);

    expect(result.items[0].metadata).toEqual(
      expect.objectContaining({
        confidenceScore: 88,
        type: 'approval',
        reasoning: ['Resident has 11 month streak'],
        impact: { financial: 1400, risk: 'low', timeline: 'today' },
        relatedDecisionIds: ['prev-1'],
        workflow: { stage: 'manager_review', totalStages: 3, currentStageIndex: 2 },
      }),
    );
  });

  it('emits application review decision with enriched workflow metadata', async () => {
    await service.handleApplicationScored({ applicationId: 'app_1', score: 92, urgency: 'HIGH' });

    expect(prisma.feedItem.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'app_scored_app_1' },
        update: expect.objectContaining({
          summary: 'Rental application scored: 92/100',
          evidence: {
            applicationId: 'app_1',
            score: 92,
            status: 'SCORED',
            type: 'review',
            confidenceScore: 92,
            reasoning: ['Application scoring completed and ready for manager review'],
            workflow: { stage: 'screening_review', totalStages: 3, currentStageIndex: 1 },
          },
        }),
        create: expect.objectContaining({
          summary: 'Rental application scored: 92/100',
          evidence: {
            applicationId: 'app_1',
            score: 92,
            status: 'SCORED',
            type: 'review',
            confidenceScore: 92,
            reasoning: ['Application scoring completed and ready for manager review'],
            workflow: { stage: 'screening_review', totalStages: 3, currentStageIndex: 1 },
          },
        }),
      }),
    );
  });

  it('normalizes single-object action payloads into canonical navigation actions', async () => {
    prisma.feedItem.findMany.mockResolvedValue([
      {
        id: 'inspection_est_1',
        domain: 'MAINTENANCE',
        type: 'INSPECTION_ESTIMATE',
        title: 'AI Estimate Generated',
        summary: 'Estimate ready',
        priorityScore: 80,
        createdAt: new Date('2026-04-12T00:00:00.000Z'),
        updatedAt: new Date('2026-04-12T01:00:00.000Z'),
        actions: { viewUrl: '/inspections/1/estimate' },
        roleAccess: ['OWNER'],
        evidence: null,
      },
    ]);

    const result = await service.getFeedForRole('owner', 10);

    expect(result.items[0].actions).toEqual([
      expect.objectContaining({
        type: 'navigation',
        href: '/inspections/1/estimate',
      }),
    ]);
  });
});
