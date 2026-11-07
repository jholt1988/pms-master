import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { listWorkflowIntents, workflowIntentListQuery } from '../src/workflow-intents/workflow-intent.query.ts';

const fixture = {
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

test('list returns the fixture tenant and keeps the id out of the SQL text', async () => {
  const query = workflowIntentListQuery('fixture-tenant', 10);
  assert.match(query.text, /FROM property_os\."WorkflowIntent"/);
  assert.equal(query.text.includes('fixture-tenant'), false);
  assert.deepEqual(query.values, ['fixture-tenant', 10]);

  const seen: string[] = [];
  const result = await listWorkflowIntents(
    {
      list: async (tenantId) => {
        seen.push(tenantId);
        return tenantId === 'fixture-tenant' ? [fixture] : [];
      },
    },
    { tenantId: 'fixture-tenant', limit: '10' },
  );
  assert.deepEqual(seen, ['fixture-tenant']);
  assert.equal(result.intents[0]?.id, 'intent-fixture-1');
});

test('the GET route requires jwt', () => {
  const source = readFileSync(new URL('../src/workflow-intents/workflow-intents.controller.ts', import.meta.url), 'utf8');
  assert.match(source, /@UseGuards\(AuthGuard\('jwt'\)\)/);
  assert.match(source, /@Controller\('workflow-intents'\)/);
});
