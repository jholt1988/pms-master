import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { listIntentsFromNest } from '../src/nest-intent-client.ts';

test('list calls Nest and does not build a Prisma query', async () => {
  const calls: string[] = [];
  const result = await listIntentsFromNest(
    async (input, init) => {
      calls.push(String(input));
      assert.equal((init?.headers as Record<string, string>).Authorization, 'Bearer fixture-token');
      return new Response(JSON.stringify({ intents: [{ id: 'intent-fixture-1' }] }), { status: 200 });
    },
    { NEST_API_URL: 'http://127.0.0.1:3001', NEST_SERVICE_JWT: 'fixture-token' },
    { tenantId: 'fixture-tenant', limit: '10' },
  );

  assert.equal(calls[0], 'http://127.0.0.1:3001/api/workflow-intents?tenantId=fixture-tenant&limit=10');
  assert.equal(result.intents[0].id, 'intent-fixture-1');

  const controller = readFileSync(new URL('../src/intents.controller.ts', import.meta.url), 'utf8');
  const listMethod = controller.slice(controller.indexOf('@Get()'), controller.indexOf('@Post'));
  assert.equal(listMethod.includes('workflowIntent.findMany'), false);
  assert.match(controller, /workflowIntent\.create/);
});
