import { calculateFee, calculateTieredFee } from './fee-engine';

describe('FeeEngine', () => {
  it('calculates flat percentage fee', () => {
    const result = calculateFee({ amount: 1000, flatPercent: 8.5 });
    expect(result.finalFee).toBe(85);
    expect(result.minimumApplied).toBe(false);
    expect(result.guardApplied).toBe(false);
  });

  it('applies minimum fee floor', () => {
    const result = calculateFee({ amount: 100, flatPercent: 2, minimumFee: 5 });
    expect(result.rawFee).toBe(2);
    expect(result.finalFee).toBe(5);
    expect(result.minimumApplied).toBe(true);
  });

  it('enforces fee < amount guard', () => {
    const result = calculateFee({ amount: 3, flatPercent: 200, minimumFee: 10, enforceFeeLessThanAmount: true });
    expect(result.finalFee).toBe(2.99);
    expect(result.guardApplied).toBe(true);
  });

  it('calculates tiered fee with boundaries', () => {
    // 0-1000 @ 10%, 1000-2000 @ 5%, 2000+ @ 2%
    const fee = calculateTieredFee(2500, [
      { upTo: 1000, percent: 10 },
      { upTo: 2000, percent: 5 },
      { percent: 2 },
    ]);

    // 100 + 50 + 10 = 160
    expect(Math.round(fee * 100) / 100).toBe(160);
  });

  it('uses tiered fee in full engine', () => {
    const result = calculateFee({
      amount: 1800,
      tiers: [
        { upTo: 1000, percent: 10 },
        { upTo: 2000, percent: 5 },
      ],
      minimumFee: 20,
    });
    // 1000*.10 + 800*.05 = 140
    expect(result.finalFee).toBe(140);
  });
});
