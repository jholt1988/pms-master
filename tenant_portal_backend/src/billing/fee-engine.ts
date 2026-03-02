export type FeeTier = {
  upTo?: number; // inclusive upper bound; undefined = infinity
  percent: number; // e.g. 8.5 = 8.5%
};

export type FeeEngineInput = {
  amount: number;
  tiers?: FeeTier[];
  flatPercent?: number;
  minimumFee?: number;
  enforceFeeLessThanAmount?: boolean;
};

export type FeeEngineResult = {
  amount: number;
  rawFee: number;
  minimumApplied: boolean;
  guardApplied: boolean;
  finalFee: number;
};

const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function calculateFee(input: FeeEngineInput): FeeEngineResult {
  const amount = Number(input.amount || 0);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new Error('amount must be a non-negative number');
  }

  let rawFee = 0;

  if (input.tiers && input.tiers.length > 0) {
    rawFee = calculateTieredFee(amount, input.tiers);
  } else {
    const pct = Number(input.flatPercent || 0);
    rawFee = amount * (pct / 100);
  }

  let fee = rawFee;
  let minimumApplied = false;
  if (typeof input.minimumFee === 'number' && input.minimumFee > 0 && fee < input.minimumFee) {
    fee = input.minimumFee;
    minimumApplied = true;
  }

  let guardApplied = false;
  if (input.enforceFeeLessThanAmount !== false && fee >= amount && amount > 0) {
    fee = Math.max(0, amount - 0.01);
    guardApplied = true;
  }

  return {
    amount: round2(amount),
    rawFee: round2(rawFee),
    minimumApplied,
    guardApplied,
    finalFee: round2(fee),
  };
}

export function calculateTieredFee(amount: number, tiers: FeeTier[]): number {
  if (amount <= 0) return 0;
  const sorted = [...tiers].sort((a, b) => (a.upTo ?? Number.POSITIVE_INFINITY) - (b.upTo ?? Number.POSITIVE_INFINITY));

  let remaining = amount;
  let previousCap = 0;
  let total = 0;

  for (const tier of sorted) {
    const cap = tier.upTo ?? Number.POSITIVE_INFINITY;
    if (remaining <= 0) break;

    const tierWidth = cap === Number.POSITIVE_INFINITY ? remaining : Math.max(0, cap - previousCap);
    const tierAmount = Math.min(remaining, tierWidth);
    total += tierAmount * (tier.percent / 100);

    remaining -= tierAmount;
    previousCap = cap;
  }

  return total;
}
