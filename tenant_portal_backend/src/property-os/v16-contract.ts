import { z } from 'zod';

export const reversalAdjustmentV16Schema = z.object({
  as_of: z.string().refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid datetime'),
  half_life_days: z.number().min(0),
  disruption_score: z.number().min(0).max(1),
  penalty_evidence: z.number().gt(0).max(1),
  penalty_drift: z.number().gt(0).max(1),
  penalty_unit_richness: z.number().gt(0).max(1),
  applied: z.boolean(),
  event_count_considered: z.number().int().min(0),
  amount_ratio_considered: z.number().min(0),
  sys: z.number().min(0).max(1),
});

export const confidenceV16Schema = z.object({
  overall: z.number().min(0).max(1),
  evidence: z.number().min(0).max(1),
  drift: z.number().min(0).max(1),
  unit_richness: z.number().min(0).max(1),
  reversal_adjustment: reversalAdjustmentV16Schema,
});

export type ConfidenceV16 = z.infer<typeof confidenceV16Schema>;

export function validateConfidenceV16(input: unknown): ConfidenceV16 {
  return confidenceV16Schema.parse(input);
}

export function assertConfidenceV16Invariants(confidence: ConfidenceV16, epsilon = 1e-6): void {
  const product = confidence.evidence * confidence.drift * confidence.unit_richness;
  if (Math.abs(confidence.overall - product) > epsilon) {
    throw new Error(
      `Invalid confidence invariant: overall (${confidence.overall}) != evidence*drift*unit_richness (${product})`
    );
  }
}
