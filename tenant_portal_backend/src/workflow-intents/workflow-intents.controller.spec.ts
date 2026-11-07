import { listWorkflowIntents, WorkflowIntentRow } from './workflow-intent.query';

const fixtureIntent: WorkflowIntentRow = {
  id: 'intent-fixture-1',
  tenantId: 'fixture-tenant',
  propertyId: 'property-1',
  unitId: null,
  riskType: 'maintenance',
  horizonDays: 90,
  percentile: 50,
  rawProbability: 0.1,
  expectedLoss90d: null,
  amplified: false,
  recommendedAction: 'NOOP',
  priorityScore: 0.5,
  tier: 'TIER_2',
  status: 'DETECTED',
  bundleHash: null,
  governanceJson: {},
  createdAt: new Date('2026-11-06T00:00:00Z'),
  updatedAt: new Date('2026-11-06T00:00:00Z'),
};

describe('WorkflowIntentsController list', () => {
  it('returns the fixture tenant intents and does not read another tenant', async () => {
    const seen: string[] = [];
    const result = await listWorkflowIntents(
      {
        list: async (tenantId) => {
          seen.push(tenantId);
          return tenantId === 'fixture-tenant' ? [fixtureIntent] : [];
        },
      },
      { tenantId: 'fixture-tenant', limit: '10' },
    );

    expect(seen).toEqual(['fixture-tenant']);
    expect(result.intents).toEqual([fixtureIntent]);
  });

  it('refuses a missing tenant id', async () => {
    await expect(listWorkflowIntents({ list: async () => [] }, {})).rejects.toThrow('tenantId is required');
  });
});
