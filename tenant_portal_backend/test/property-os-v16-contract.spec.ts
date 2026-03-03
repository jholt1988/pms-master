import * as fs from 'fs';
import * as path from 'path';
import { assertConfidenceV16Invariants, validateConfidenceV16 } from '../src/property-os/v16-contract';

describe('Property OS v1.6 confidence contract', () => {
  it('validates sample response confidence and invariants', () => {
    const samplePath = path.resolve(
      __dirname,
      '../../tools/reference-engines/property-os-v1.6/sample_response.json'
    );
    const sample = JSON.parse(fs.readFileSync(samplePath, 'utf8'));

    const confidence = validateConfidenceV16(sample.confidence);
    expect(confidence.reversal_adjustment).toBeDefined();
    expect(confidence.reversal_adjustment.disruption_score).toBeGreaterThanOrEqual(0);
    expect(confidence.reversal_adjustment.disruption_score).toBeLessThanOrEqual(1);

    expect(() => assertConfidenceV16Invariants(confidence, 1e-6)).not.toThrow();
  });

  it('rejects missing reversal_adjustment in v1.6 confidence', () => {
    const invalid = {
      overall: 0.2,
      evidence: 0.5,
      drift: 0.8,
      unit_richness: 0.5,
    };

    expect(() => validateConfidenceV16(invalid)).toThrow();
  });

  it('rejects broken overall product invariant', () => {
    const invalid = {
      overall: 0.9,
      evidence: 0.5,
      drift: 0.5,
      unit_richness: 0.5,
      reversal_adjustment: {
        as_of: '2026-03-01T00:00:00Z',
        half_life_days: 30,
        disruption_score: 0.2,
        penalty_evidence: 0.8,
        penalty_drift: 0.9,
        penalty_unit_richness: 0.9,
        applied: true,
        event_count_considered: 1,
        amount_ratio_considered: 0.1,
        sys: 0.2,
      },
    };

    const parsed = validateConfidenceV16(invalid);
    expect(() => assertConfidenceV16Invariants(parsed, 1e-9)).toThrow(/Invalid confidence invariant/);
  });
});
