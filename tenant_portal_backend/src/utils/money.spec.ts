import { toCents, fromCents, formatCents, sumCents, splitCents } from './money';

describe('money (integer-cents helpers)', () => {
  describe('toCents', () => {
    it('converts whole and 2dp dollar values', () => {
      expect(toCents(1500)).toBe(150000);
      expect(toCents(49.99)).toBe(4999);
      expect(toCents('19.95')).toBe(1995);
      expect(toCents(0)).toBe(0);
    });
    it('is robust to binary-float representation of 2dp inputs', () => {
      // 49.99 * 100 === 4998.9999999999995 in IEEE-754; rounding fixes it.
      expect(toCents(49.99)).toBe(4999);
      expect(toCents(19.95)).toBe(1995);
    });
    it('throws on non-finite input', () => {
      expect(() => toCents(Number.NaN)).toThrow();
      expect(() => toCents('abc')).toThrow();
    });
  });

  describe('fromCents', () => {
    it('round-trips 2dp values', () => {
      expect(fromCents(4999)).toBeCloseTo(49.99, 10);
      expect(fromCents(150000)).toBe(1500);
    });
    it('rejects non-integer cents', () => {
      expect(() => fromCents(10.5)).toThrow();
    });
  });

  describe('sumCents', () => {
    it('adds integer cents', () => {
      expect(sumCents([100, 250, 33])).toBe(383);
      expect(sumCents([])).toBe(0);
    });
  });

  describe('splitCents', () => {
    it('distributes the remainder so parts sum to the total', () => {
      expect(splitCents(10000, 3)).toEqual([3334, 3333, 3333]);
      expect(sumCents(splitCents(10000, 3))).toBe(10000);
    });
    it('is exact for awkward totals and counts', () => {
      for (const [total, parts] of [[99999, 7], [1, 3], [12345, 4], [500000, 6]] as const) {
        expect(sumCents(splitCents(total, parts))).toBe(total);
      }
    });
    it('handles negative totals (credits) exactly', () => {
      expect(sumCents(splitCents(-10000, 3))).toBe(-10000);
      expect(splitCents(-10000, 3)).toEqual([-3334, -3333, -3333]);
    });
    it('rejects invalid part counts', () => {
      expect(() => splitCents(1000, 0)).toThrow();
      expect(() => splitCents(1000, -2)).toThrow();
    });
  });

  describe('formatCents', () => {
    it('formats USD by default', () => {
      expect(formatCents(150000)).toBe('$1,500.00');
      expect(formatCents(4999)).toBe('$49.99');
    });
  });
});
