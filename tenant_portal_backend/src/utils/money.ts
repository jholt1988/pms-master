/**
 * Money helpers for the Float -> integer-cents migration (Stage-A cutover).
 *
 * CONVENTION: the canonical in-app representation for money is INTEGER CENTS.
 * Do all arithmetic in cents (integers). Convert to a decimal ONLY at the
 * display/serialization boundary via `fromCents` / `formatCents`.
 *
 * See docs/migrations/MONEY_CENTS_CUTOVER.md for the field list and the
 * per-site checklist this helper supports.
 */

/**
 * Dollars -> integer cents. Assumes at most 2 decimal places (true for all the
 * migrated fields); rounds to the nearest cent. Use at the ingest boundary when
 * a legacy Float / user-entered dollar value must become cents.
 */
export function toCents(amount: number | string): number {
  const n = typeof amount === 'string' ? Number(amount) : amount;
  if (!Number.isFinite(n)) {
    throw new Error(`toCents: not a finite number: ${String(amount)}`);
  }
  return Math.round(n * 100);
}

/** Integer cents -> dollars (a Number, for display or legacy dual-write only). */
export function fromCents(cents: number): number {
  assertIntCents(cents);
  return cents / 100;
}

/** Format integer cents as a localized currency string, e.g. 150000 -> "$1,500.00". */
export function formatCents(cents: number, currency = 'USD', locale = 'en-US'): string {
  assertIntCents(cents);
  return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(cents / 100);
}

/** Sum integer-cent values (throws on non-integer input). */
export function sumCents(values: number[]): number {
  return values.reduce((acc, c) => {
    assertIntCents(c);
    return acc + c;
  }, 0);
}

/**
 * Split a total (integer cents) into `parts` integer-cent installments whose
 * sum EXACTLY equals the total. Remainder cents are distributed one-per to the
 * earliest installments so no cent is created or lost.
 *
 *   splitCents(10000, 3) -> [3334, 3333, 3333]   (sum === 10000)
 *
 * Replaces the legacy `Math.ceil(total / installments)` pattern, which
 * over-collects and does not sum back to the total.
 */
export function splitCents(totalCents: number, parts: number): number[] {
  assertIntCents(totalCents);
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new Error(`splitCents: parts must be a positive integer: ${String(parts)}`);
  }
  const base = Math.trunc(totalCents / parts);
  const remainder = Math.abs(totalCents - base * parts); // 0 .. parts-1
  const step = totalCents < 0 ? -1 : 1;
  return Array.from({ length: parts }, (_, i) => base + (i < remainder ? step : 0));
}

function assertIntCents(cents: number): void {
  if (!Number.isInteger(cents)) {
    throw new Error(`money: expected integer cents, got: ${String(cents)}`);
  }
}
