export type IntentListQuery = {
  tenantId?: string;
  limit?: string;
};

export type NestIntentEnv = {
  NEST_API_URL?: string;
  NEST_SERVICE_JWT?: string;
};

export async function listIntentsFromNest(
  fetchImpl: typeof fetch,
  env: NestIntentEnv,
  query: IntentListQuery,
) {
  const token = env.NEST_SERVICE_JWT;
  if (!token) {
    throw new Error('NEST_SERVICE_JWT must be configured');
  }
  const take = Math.max(1, Math.min(Number(query.limit ?? 50) || 50, 200));
  const url = new URL('/api/workflow-intents', env.NEST_API_URL ?? 'http://127.0.0.1:3001');
  if (query.tenantId) url.searchParams.set('tenantId', query.tenantId);
  url.searchParams.set('limit', String(take));
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    throw new Error(`Nest workflow intents failed: ${response.status}`);
  }
  return response.json();
}
