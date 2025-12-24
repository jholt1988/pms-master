/**
 * Bookkeeping Agent stub per Agent Spec 6.
 * Categorizes transactions deterministically and flags items needing review.
 */

export interface TransactionInput {
  transaction_id: string;
  date: string;
  vendor: string;
  amount: number;
  memo?: string;
  property_id?: string;
}

export interface BookkeepingInput {
  transactions: TransactionInput[];
  chart_of_accounts: string[];
  rules?: Record<string, string>; // vendor -> category
  month?: string;
}

export interface CategorizedTransaction {
  transaction_id: string;
  category: string;
  property_id: string | null;
  confidence: number;
  notes: string;
}

export interface NeedsReview {
  transaction_id: string;
  reason: string;
  suggested_category: string;
}

export interface BookkeepingResult {
  categorized_transactions: CategorizedTransaction[];
  needs_review: NeedsReview[];
  monthly_summary: {
    month: string;
    by_property: Array<{ property_id: string; income: number; expenses: number; net: number }>;
    by_category: Array<{ category: string; total: number }>;
  };
}

function categorize(tx: TransactionInput, rules?: Record<string, string>): { category: string; confidence: number; note: string } {
  const vendorKey = tx.vendor.toLowerCase();
  if (rules && rules[vendorKey]) {
    return { category: rules[vendorKey], confidence: 0.9, note: 'Matched vendor rule' };
  }
  if (vendorKey.includes('home depot') || vendorKey.includes('lowes')) {
    return { category: 'Maintenance Supplies', confidence: 0.75, note: 'Hardware store heuristic' };
  }
  if (vendorKey.includes('rent') || vendorKey.includes('deposit')) {
    return { category: 'Rental Income', confidence: 0.8, note: 'Income heuristic' };
  }
  return { category: 'Uncategorized', confidence: 0.4, note: 'No rule matched' };
}

export function runBookkeepingAgent(input: BookkeepingInput): BookkeepingResult {
  const categorized: CategorizedTransaction[] = [];
  const needs_review: NeedsReview[] = [];
  const month = input.month || '2025-12';

  for (const tx of input.transactions) {
    const { category, confidence, note } = categorize(tx, input.rules);
    const item: CategorizedTransaction = {
      transaction_id: tx.transaction_id,
      category,
      property_id: tx.property_id || null,
      confidence,
      notes: note,
    };
    categorized.push(item);
    if (confidence < 0.6 || category === 'Uncategorized') {
      needs_review.push({
        transaction_id: tx.transaction_id,
        reason: 'Low confidence or uncategorized',
        suggested_category: category,
      });
    }
  }

  const by_property_map: Record<string, { income: number; expenses: number }> = {};
  const by_category_map: Record<string, number> = {};

  for (const tx of categorized) {
    const propKey = tx.property_id || 'unassigned';
    if (!by_property_map[propKey]) by_property_map[propKey] = { income: 0, expenses: 0 };
    const amount = input.transactions.find((t) => t.transaction_id === tx.transaction_id)?.amount || 0;
    if (tx.category.toLowerCase().includes('income')) {
      by_property_map[propKey].income += amount;
    } else {
      by_property_map[propKey].expenses += Math.abs(amount);
    }
    by_category_map[tx.category] = (by_category_map[tx.category] || 0) + amount;
  }

  const by_property = Object.entries(by_property_map).map(([property_id, agg]) => ({
    property_id,
    income: Math.round(agg.income * 100) / 100,
    expenses: Math.round(agg.expenses * 100) / 100,
    net: Math.round((agg.income - agg.expenses) * 100) / 100,
  }));

  const by_category = Object.entries(by_category_map).map(([category, total]) => ({
    category,
    total: Math.round(total * 100) / 100,
  }));

  return {
    categorized_transactions: categorized,
    needs_review,
    monthly_summary: {
      month,
      by_property,
      by_category,
    },
  };
}
