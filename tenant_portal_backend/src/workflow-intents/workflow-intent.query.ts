export type WorkflowIntentRow = {
  id: string;
  tenantId: string;
  propertyId: string | null;
  unitId: string | null;
  riskType: string;
  horizonDays: number;
  percentile: number;
  rawProbability: number;
  expectedLoss90d: number | null;
  amplified: boolean;
  recommendedAction: string;
  priorityScore: number;
  tier: string;
  status: string;
  bundleHash: string | null;
  governanceJson: unknown;
  createdAt: Date;
  updatedAt: Date;
};

export type WorkflowIntentStore = {
  list(tenantId: string, take: number): Promise<WorkflowIntentRow[]>;
};

const LIST_SQL = `
SELECT
  id,
  "tenantId",
  "propertyId",
  "unitId",
  "riskType",
  "horizonDays",
  percentile,
  "rawProbability",
  "expectedLoss90d",
  amplified,
  "recommendedAction",
  "priorityScore",
  tier::text AS tier,
  status::text AS status,
  "bundleHash",
  "governanceJson",
  "createdAt",
  "updatedAt"
FROM property_os."WorkflowIntent"
WHERE "tenantId" = $1
ORDER BY "createdAt" DESC
LIMIT $2
`.trim();

export function clampLimit(limit?: string): number {
  const parsed = Number(limit ?? 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.max(1, Math.min(Math.trunc(parsed), 200));
}

export function workflowIntentListQuery(tenantId: string, take: number) {
  return {
    text: LIST_SQL,
    values: [tenantId, take] as const,
  };
}

export async function listWorkflowIntents(
  store: WorkflowIntentStore,
  query: { tenantId?: string; limit?: string },
) {
  const tenantId = query.tenantId?.trim();
  if (!tenantId) {
    throw new Error('tenantId is required');
  }
  const take = clampLimit(query.limit);
  const intents = await store.list(tenantId, take);
  return { intents };
}
