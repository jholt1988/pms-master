/**
 * Deterministic Repair Estimator stub per Agent Spec 2.
 * Produces structured ranges and assumptions without external calls.
 */

export interface RepairEstimatorInput {
  propertyId?: string;
  issueDescription: string;
  location?: { city?: string; state?: string; zip?: string };
  urgency?: 'low' | 'normal' | 'high' | 'urgent';
  photos?: string[];
  inspectionNotes?: string;
  constraints?: string;
}

export interface RepairEstimatorResult {
  scope_of_work: string[];
  assumptions: string[];
  labor: {
    trade: string;
    hours_low: number;
    hours_high: number;
    rate_low: number;
    rate_high: number;
    subtotal_low: number;
    subtotal_high: number;
    sources: string[];
  };
  materials: Array<{
    item: string;
    qty: number;
    unit: string;
    unit_price: number;
    total: number;
    sources: string[];
  }>;
  totals: {
    subtotal_low: number;
    subtotal_high: number;
    overhead_pct: number;
    contingency_pct: number;
    total_low: number;
    total_high: number;
  };
  risk_flags: string[];
  recommended_next_steps: string[];
  confidence: number;
}

const tradeKeywords: Array<{ keywords: string[]; trade: string; materialHint: string }> = [
  { keywords: ['leak', 'water', 'pipe', 'faucet', 'toilet', 'sink'], trade: 'plumber', materialHint: 'plumbing fittings' },
  { keywords: ['electrical', 'outlet', 'breaker', 'light', 'switch'], trade: 'electrician', materialHint: 'electrical parts' },
  { keywords: ['hvac', 'ac', 'a/c', 'heat', 'furnace'], trade: 'hvac', materialHint: 'filters and refrigerant' },
  { keywords: ['roof', 'shingle', 'ceiling'], trade: 'roofer', materialHint: 'roof patch materials' },
  { keywords: ['door', 'window', 'lock'], trade: 'handyman', materialHint: 'hardware and fasteners' },
];

function inferTrade(text: string): { trade: string; materialHint: string } {
  for (const entry of tradeKeywords) {
    if (entry.keywords.some((kw) => text.includes(kw))) {
      return { trade: entry.trade, materialHint: entry.materialHint };
    }
  }
  return { trade: 'handyman', materialHint: 'basic materials' };
}

export function runRepairEstimator(input: RepairEstimatorInput): RepairEstimatorResult {
  const lower = input.issueDescription.toLowerCase();
  const { trade, materialHint } = inferTrade(lower);
  const urgency = input.urgency || 'normal';

  const hours_low = urgency === 'urgent' ? 1 : 2;
  const hours_high = urgency === 'urgent' ? 3 : 4;
  const rate_low = trade === 'electrician' || trade === 'hvac' ? 120 : 95;
  const rate_high = rate_low + 30;

  const labor_subtotal_low = hours_low * rate_low;
  const labor_subtotal_high = hours_high * rate_high;

  const materials = [
    {
      item: materialHint,
      qty: 1,
      unit: 'allowance',
      unit_price: 120,
      total: 120,
      sources: ['PDL internal allowance - update with real lookup'],
    },
  ];

  const materialSubtotal = materials.reduce((sum, m) => sum + m.total, 0);
  const subtotal_low = labor_subtotal_low + materialSubtotal;
  const subtotal_high = labor_subtotal_high + materialSubtotal;
  const overhead_pct = 0.1;
  const contingency_pct = urgency === 'urgent' ? 0.15 : 0.1;

  const total_low = subtotal_low * (1 + overhead_pct + contingency_pct);
  const total_high = subtotal_high * (1 + overhead_pct + contingency_pct);

  const assumptions = [
    'Site is accessible during normal hours; no HOA/parking constraints unless noted.',
    'No permit assumed; update if local code requires.',
    input.constraints ? `Constraint provided: ${input.constraints}` : 'No special access constraints provided.',
  ];

  const risk_flags: string[] = [];
  if (urgency === 'urgent') risk_flags.push('expedited scheduling');
  if (!input.location?.zip) risk_flags.push('missing zip for local pricing');

  return {
    scope_of_work: [`Address: ${input.issueDescription}`],
    assumptions,
    labor: {
      trade,
      hours_low,
      hours_high,
      rate_low,
      rate_high,
      subtotal_low: labor_subtotal_low,
      subtotal_high: labor_subtotal_high,
      sources: ['PDL internal rate card - update with market data'],
    },
    materials,
    totals: {
      subtotal_low: Math.round(subtotal_low * 100) / 100,
      subtotal_high: Math.round(subtotal_high * 100) / 100,
      overhead_pct: overhead_pct * 100,
      contingency_pct: contingency_pct * 100,
      total_low: Math.round(total_low * 100) / 100,
      total_high: Math.round(total_high * 100) / 100,
    },
    risk_flags,
    recommended_next_steps: [
      'Validate onsite scope and photos.',
      'Confirm access constraints and any permit needs.',
      'Replace internal rate/material placeholders with live lookups.',
    ],
    confidence: 0.5,
  };
}
