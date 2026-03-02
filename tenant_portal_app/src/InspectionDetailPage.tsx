import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Divider,
  Select,
  SelectItem,
  Spinner,
  Switch,
  Textarea,
  Input,
  Tooltip,
} from '@nextui-org/react';
import { ArrowLeft, Info } from 'lucide-react';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';
import { ConfirmDialog } from './components/ui/ConfirmDialog';

type InspectionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type InspectionCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'NON_FUNCTIONAL';
type SeverityLevel = 'LOW' | 'MED' | 'HIGH' | 'EMERGENCY';
type InspectionIssueType = 'INVESTIGATE' | 'REPAIR' | 'REPLACE';
type MeasurementUnit = 'COUNT' | 'LINEAR_FT' | 'SQFT' | 'INCH' | 'FOOT';

// Photo types
export type InspectionPhoto = {
  id: number;
  url: string;
  caption: string | null;
  createdAt: string;
  aiAnalysis?: string | null;
};

export type PhotoAnalysisResult = {
  condition: InspectionCondition;
  severity: SeverityLevel;
  issueType: InspectionIssueType;
  description: string;
  recommendedAction: string;
};

type ChecklistItem = {
  id: number;
  category: string;
  itemName: string;
  condition?: InspectionCondition | null;
  notes?: string | null;
  estimatedAge?: number | null;
  requiresAction: boolean;
  photos?: InspectionPhoto[];

  // Structured action inputs
  severity?: SeverityLevel | null;
  issueType?: InspectionIssueType | null;
  measurementValue?: number | null;
  measurementUnit?: MeasurementUnit | null;
  measurementNotes?: string | null;
};

type InspectionRoom = {
  id: number;
  name: string;
  roomType: string;
  checklistItems: ChecklistItem[];
};

type InspectionDetail = {
  id: number;
  type: string;
  status: InspectionStatus;
  scheduledDate: string;
  completedDate?: string | null;
  notes?: string | null;
  property?: { name: string } | null;
  unit?: { name: string } | null;
  rooms: InspectionRoom[];
  repairEstimates?: any[];
};

type DraftChecklistItem = {
  requiresAction: boolean;
  condition?: InspectionCondition | null;
  notes: string;

  severity?: SeverityLevel | null;
  issueType?: InspectionIssueType | null;
  measurementValue?: number | null;
  measurementUnit?: MeasurementUnit | null;
  measurementNotes?: string;
};

type DraftByRoom = Record<number, Record<number, DraftChecklistItem>>;

type RoomSaveError = {
  itemId: number;
  itemLabel: string;
  reason: string;
};

const conditionOptions: Array<{ key: InspectionCondition; label: string }> = [
  { key: 'EXCELLENT', label: 'Excellent' },
  { key: 'GOOD', label: 'Good' },
  { key: 'FAIR', label: 'Fair' },
  { key: 'POOR', label: 'Poor' },
  { key: 'DAMAGED', label: 'Damaged' },
  { key: 'NON_FUNCTIONAL', label: 'Non-functional' },
];

const severityOptions: Array<{ key: SeverityLevel; label: string }> = [
  { key: 'LOW', label: 'Low' },
  { key: 'MED', label: 'Medium' },
  { key: 'HIGH', label: 'High' },
  { key: 'EMERGENCY', label: 'Emergency' },
];

const issueTypeOptions: Array<{ key: InspectionIssueType; label: string }> = [
  { key: 'INVESTIGATE', label: 'Investigate' },
  { key: 'REPAIR', label: 'Repair' },
  { key: 'REPLACE', label: 'Replace' },
];

const measurementUnitOptions: Array<{ key: MeasurementUnit; label: string }> = [
  { key: 'COUNT', label: 'Count' },
  { key: 'LINEAR_FT', label: 'Linear ft' },
  { key: 'SQFT', label: 'Sq ft' },
  { key: 'INCH', label: 'In' },
  { key: 'FOOT', label: 'Ft' },
];

const labelFromOptions = <T extends { key: string; label: string }>(options: T[], key?: string | null) => {
  if (!key) return '—';
  return options.find((opt) => opt.key === key)?.label ?? key;
};

const getStatusColor = (status: InspectionStatus) => {
  switch (status) {
    case 'SCHEDULED':
      return 'primary';
    case 'IN_PROGRESS':
      return 'warning';
    case 'COMPLETED':
      return 'success';
    case 'CANCELLED':
      return 'danger';
    default:
      return 'default';
  }
};

function unwrapApi<T>(resp: any): T {
  // Some endpoints appear to be wrapped as { data: ... } by interceptors.
  if (resp && typeof resp === 'object' && 'data' in resp) return resp.data as T;
  return resp as T;
}

const normalizeConfidenceLevel = (level?: string | null) => {
  if (!level) return undefined;
  const normalized = String(level).trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (['VERY_HIGH', 'HIGH', 'MEDIUM', 'LOW', 'VERY_LOW'].includes(normalized)) {
    return normalized as Estimate['confidenceLevel'];
  }
  return undefined;
};

const toTitleCase = (value?: string | null) => {
  if (!value) return '—';
  return String(value)
    .trim()
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const parseNumber = (value: any) => {
  if (value === null || value === undefined || value === '') return undefined;
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

const normalizeLineItems = (items: any[] | undefined) => {
  return (items ?? []).map((item, index) => {
    const repairInstructions = Array.isArray(item.repairInstructions)
      ? item.repairInstructions.join('\n')
      : Array.isArray(item.repair_instructions)
        ? item.repair_instructions.join('\n')
        : item.repairInstructions ?? item.repair_instructions ?? null;

    return {
      id: item.id ?? item.item_id ?? index,
      itemDescription: item.itemDescription ?? item.item_description ?? item.description ?? item.name ?? 'Unknown item',
      location: item.location ?? item.room ?? item.area ?? '—',
      category: item.category ?? item.trade ?? item.system ?? '—',
      issueType: toTitleCase(item.issueType ?? item.issue_type ?? item.actionType ?? item.action_type ?? item.action_needed ?? ''),
      laborHours: parseNumber(item.laborHours ?? item.labor_hours) ?? null,
      laborRate: parseNumber(item.laborRate ?? item.labor_rate_per_hour) ?? null,
      laborCost: parseNumber(item.laborCost ?? item.labor_cost) ?? 0,
      materialCost: parseNumber(item.materialCost ?? item.material_cost) ?? 0,
      totalCost: parseNumber(item.totalCost ?? item.total_cost) ?? 0,
      bidLowTotal: parseNumber(item.bidLowTotal ?? item.bid_low_total),
      bidHighTotal: parseNumber(item.bidHighTotal ?? item.bid_high_total),
      bidLowLaborCost: parseNumber(item.bidLowLaborCost ?? item.bid_low_labor_cost),
      bidHighLaborCost: parseNumber(item.bidHighLaborCost ?? item.bid_high_labor_cost),
      bidLowMaterialCost: parseNumber(item.bidLowMaterialCost ?? item.bid_low_material_cost),
      bidHighMaterialCost: parseNumber(item.bidHighMaterialCost ?? item.bid_high_material_cost),
      confidenceLevel: normalizeConfidenceLevel(item.confidenceLevel ?? item.confidence_level ?? item.confidence),
      confidenceReason: item.confidenceReason ?? item.confidence_reason ?? item.confidence_explanation ?? undefined,
      assumptions: item.assumptions ?? item.assumptions_list ?? [],
      questionsToReduceUncertainty:
        item.questionsToReduceUncertainty ?? item.questions_to_reduce_uncertainty ?? item.clarifying_questions ?? [],
      repairInstructions,
      notes: item.notes ?? item.note ?? null,
    };
  });
};

const normalizeEstimate = (estimate: any): Estimate => {
  const normalized = estimate ?? {};
  return {
    id: normalized.id ?? normalized.estimate_id ?? 0,
    currency: normalized.currency ?? normalized.currency_code ?? 'USD',
    generatedAt: normalized.generatedAt ?? normalized.generated_at,
    status: normalized.status,
    totalLaborCost: parseNumber(normalized.totalLaborCost ?? normalized.total_labor_cost) ?? 0,
    totalMaterialCost: parseNumber(normalized.totalMaterialCost ?? normalized.total_material_cost) ?? 0,
    totalProjectCost: parseNumber(normalized.totalProjectCost ?? normalized.total_project_cost) ?? 0,
    itemsToRepair: parseNumber(normalized.itemsToRepair ?? normalized.items_to_repair) ?? 0,
    itemsToReplace: parseNumber(normalized.itemsToReplace ?? normalized.items_to_replace) ?? 0,
    bidLowTotal: parseNumber(normalized.bidLowTotal ?? normalized.bid_low_total),
    bidHighTotal: parseNumber(normalized.bidHighTotal ?? normalized.bid_high_total),
    confidenceLevel: normalizeConfidenceLevel(normalized.confidenceLevel ?? normalized.confidence_level ?? normalized.confidence),
    confidenceReason: normalized.confidenceReason ?? normalized.confidence_reason ?? normalized.confidence_explanation,
    lineItems: normalizeLineItems(normalized.lineItems ?? normalized.line_items ?? normalized.items ?? []),
  };
};

function itemLabel(item: ChecklistItem) {
  return `${item.category}: ${item.itemName}`;
}

function shallowEqualDraft(a: DraftChecklistItem, b: DraftChecklistItem) {
  return (
    a.requiresAction === b.requiresAction &&
    (a.condition ?? null) === (b.condition ?? null) &&
    (a.notes ?? '') === (b.notes ?? '') &&
    (a.severity ?? null) === (b.severity ?? null) &&
    (a.issueType ?? null) === (b.issueType ?? null) &&
    (a.measurementValue ?? null) === (b.measurementValue ?? null) &&
    (a.measurementUnit ?? null) === (b.measurementUnit ?? null) &&
    (a.measurementNotes ?? '') === (b.measurementNotes ?? '')
  );
}

function formatCurrency(amount: number, currency = 'USD') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${currency}`;
  }
}

type Estimate = {
  id: number;
  currency?: string;
  generatedAt?: string;
  status?: string;
  totalLaborCost: number;
  totalMaterialCost: number;
  totalProjectCost: number;
  itemsToRepair: number;
  itemsToReplace: number;

  // Display-only AI metadata (present immediately after generation)
  bidLowTotal?: number;
  bidHighTotal?: number;
  confidenceLevel?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
  confidenceReason?: string;

  lineItems?: Array<{
    id: number;
    itemDescription: string;
    location: string;
    category: string;
    issueType: string;
    laborHours?: number | null;
    laborRate?: number | null;
    laborCost: number;
    materialCost: number;
    totalCost: number;

    bidLowTotal?: number;
    bidHighTotal?: number;
    bidLowLaborCost?: number;
    bidHighLaborCost?: number;
    bidLowMaterialCost?: number;
    bidHighMaterialCost?: number;
    confidenceLevel?: 'VERY_HIGH' | 'HIGH' | 'MEDIUM' | 'LOW' | 'VERY_LOW';
    confidenceReason?: string;
    assumptions?: string[];
    questionsToReduceUncertainty?: string[];

    repairInstructions?: string | null;
    notes?: string | null;
  }>;
};

function getConfidenceColor(level?: string) {
  switch (level) {
    case 'VERY_HIGH': return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'HIGH': return 'bg-green-100 text-green-800 border-green-200';
    case 'MEDIUM': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'LOW': return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'VERY_LOW': return 'bg-red-100 text-red-800 border-red-200';
    default: return 'bg-gray-100 text-gray-600 border-gray-200';
  }
}

function getConfidenceIcon(level?: string) {
  switch (level) {
    case 'VERY_HIGH': return '✓✓';
    case 'HIGH': return '✓';
    case 'MEDIUM': return '~';
    case 'LOW': return '⚠';
    case 'VERY_LOW': return '✗';
    default: return '?';
  }
}

function buildFallbackEstimateFromInspection(inspection: InspectionDetail): Estimate {
  const actionableItems = (inspection.rooms ?? []).flatMap((room: InspectionRoom) =>
    (room.checklistItems ?? [])
      .filter((item: ChecklistItem) => item.requiresAction)
      .map((item: ChecklistItem) => ({ room, item })),
  );

  const lineItems = actionableItems.map(({ room, item }: { room: InspectionRoom; item: ChecklistItem }, idx: number) => {
    const severityWeight = item.severity === 'EMERGENCY' ? 3 : item.severity === 'HIGH' ? 2 : 1;
    const laborHours = 1.5 * severityWeight;
    const laborRate = 85;
    const materialCost = 60 * severityWeight;
    const laborCost = laborHours * laborRate;
    const totalCost = laborCost + materialCost;

    return {
      id: idx + 1,
      itemDescription: item.itemName,
      location: room.name,
      category: item.category,
      issueType: item.issueType ?? 'REPAIR',
      laborHours,
      laborRate,
      laborCost,
      materialCost,
      totalCost,
      confidenceLevel: 'LOW' as const,
      confidenceReason: 'Fallback estimate based on checklist severity and default local rates.',
      assumptions: ['Labor rate defaulted to $85/hr', 'Material costs estimated from severity band'],
      questionsToReduceUncertainty: ['Confirm exact materials needed', 'Confirm on-site labor complexity'],
      repairInstructions: item.notes ?? null,
      notes: item.notes ?? null,
    };
  });

  const totalLaborCost = lineItems.reduce((sum: number, li) => sum + li.laborCost, 0);
  const totalMaterialCost = lineItems.reduce((sum: number, li) => sum + li.materialCost, 0);
  const totalProjectCost = totalLaborCost + totalMaterialCost;

  return {
    id: Date.now(),
    currency: 'USD',
    generatedAt: new Date().toISOString(),
    status: 'DRAFT',
    totalLaborCost,
    totalMaterialCost,
    totalProjectCost,
    itemsToRepair: lineItems.length,
    itemsToReplace: 0,
    bidLowTotal: Math.round(totalProjectCost * 0.85),
    bidHighTotal: Math.round(totalProjectCost * 1.25),
    confidenceLevel: 'LOW',
    confidenceReason:
      'Fallback mode: AI estimate was unavailable, so this rough estimate was generated from checklist items. Treat as provisional.',
    lineItems,
  };
}

function ConfidenceBadge({ level }: { level?: string }) {
  if (!level) return null;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded border text-xs font-medium ${getConfidenceColor(level)}`}>
      <span className="mr-1">{getConfidenceIcon(level)}</span>
      {level.replaceAll('_', ' ')}
    </span>
  );
}

function InfoTip({ label, content }: { label: string; content: string }) {
  return (
    <Tooltip
      content={<div className="max-w-xs text-xs text-foreground-600">{content}</div>}
      placement="top"
      showArrow
    >
      <span className="inline-flex items-center gap-1 text-xs text-foreground-500">
        {label}
        <Info size={12} className="text-foreground-400" />
      </span>
    </Tooltip>
  );
}

function EstimatePanel({ estimate, embedded = false, token, canManage = false }: { estimate: any; embedded?: boolean; token?: string; canManage?: boolean }) {
  const e = normalizeEstimate(estimate);
  const currency = e.currency ?? 'USD';

  const hasRange = typeof e.bidLowTotal === 'number' && typeof e.bidHighTotal === 'number';
  const lineItemCount = e.lineItems?.length ?? 0;
  const assumptions = (e as any).assumptions as string[] | undefined;
  const questions = (e as any).questionsToReduceUncertainty as string[] | undefined;
  const whySummary = [
    e.confidenceReason,
    lineItemCount > 0 ? `Derived from ${lineItemCount} line item${lineItemCount === 1 ? '' : 's'} (${e.itemsToRepair ?? 0} repair, ${e.itemsToReplace ?? 0} replace).` : null,
    assumptions?.[0] ? `Key assumption: ${assumptions[0]}` : null,
    questions?.[0] ? `To tighten the bid: ${questions[0]}` : null,
  ].filter(Boolean) as string[];

  const scopeSummary = lineItemCount > 0
    ? `${lineItemCount} actionable item${lineItemCount === 1 ? '' : 's'} across ${(new Set((e.lineItems ?? []).map((li) => li.location)).size || 1)} area${(new Set((e.lineItems ?? []).map((li) => li.location)).size || 1) === 1 ? '' : 's'}`
    : 'No actionable scope available.';

  const totalLaborHours = (e.lineItems ?? []).reduce((sum, li) => sum + (typeof li.laborHours === 'number' ? li.laborHours : 0), 0);
  const timelineSummary = totalLaborHours > 0
    ? `${Math.max(1, Math.ceil(totalLaborHours / 6))} work day${Math.ceil(totalLaborHours / 6) === 1 ? '' : 's'} (${totalLaborHours.toFixed(1)} labor hours estimated)`
    : 'Timeline pending vendor validation';

  const rationaleSummary = e.confidenceReason
    ?? 'Estimate calculated from checklist severity, itemized labor/material assumptions, and inspection notes.';

  const confidenceSummary = e.confidenceLevel
    ? e.confidenceLevel.replaceAll('_', ' ')
    : 'UNSPECIFIED';

  const body = (
    <div className={embedded ? 'flex flex-col gap-4' : 'flex flex-col gap-4'}>
      {(hasRange || e.confidenceLevel || e.confidenceReason) && (
        <div className="border border-default-200 rounded p-3">
          <div className="flex items-center gap-2 mb-1">
            <div className="text-xs text-foreground-500 font-semibold">Bid explanation</div>
            <ConfidenceBadge level={e.confidenceLevel} />
          </div>
          <div className="text-sm">
            {e.confidenceReason ? e.confidenceReason : 'Bid range reflects uncertainty in labor/materials and scope based on the inspection notes.'}
          </div>
          {(e as any).assumptions?.length ? (
            <div className="mt-2 text-xs">
              <div className="font-semibold text-foreground-500">Top assumptions</div>
              <ul className="list-disc pl-5">
                {(e as any).assumptions.slice(0, 3).map((a: string, idx: number) => (
                  <li key={idx} className="whitespace-pre-wrap">{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {(e as any).questionsToReduceUncertainty?.length ? (
            <div className="mt-2 text-xs">
              <div className="font-semibold text-foreground-500">To tighten this bid</div>
              <ul className="list-disc pl-5">
                {(e as any).questionsToReduceUncertainty.slice(0, 3).map((q: string, idx: number) => (
                  <li key={idx} className="whitespace-pre-wrap">{q}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}

      {!embedded && (
        <Card className="border border-primary-200 bg-primary-50/40">
          <CardBody className="p-3">
            <div className="text-xs text-foreground-500 font-semibold mb-2">Demo View (Standardized)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
              <div><span className="font-semibold">Scope:</span> {scopeSummary}</div>
              <div><span className="font-semibold">Cost:</span> {formatCurrency(e.totalProjectCost ?? 0, currency)}{hasRange ? ` (range ${formatCurrency(e.bidLowTotal as number, currency)}–${formatCurrency(e.bidHighTotal as number, currency)})` : ''}</div>
              <div><span className="font-semibold">Timeline:</span> {timelineSummary}</div>
              <div><span className="font-semibold">Confidence:</span> {confidenceSummary}</div>
            </div>
            <div className="mt-2 text-xs text-foreground-600 whitespace-pre-wrap"><span className="font-semibold">Rationale:</span> {rationaleSummary}</div>
          </CardBody>
        </Card>
      )}

      {!embedded && (
        <Card className="border border-default-200 bg-default-50">
          <CardBody className="p-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-xs text-foreground-500 font-semibold">Estimate Summary</div>
                <div className="text-sm">
                  Expected total: <span className="font-semibold">{formatCurrency(e.totalProjectCost ?? 0, currency)}</span>
                  {hasRange ? (
                    <span className="text-foreground-500"> · Range {formatCurrency(e.bidLowTotal as number, currency)}–{formatCurrency(e.bidHighTotal as number, currency)}</span>
                  ) : null}
                </div>
                <div className="text-xs text-foreground-500 mt-1">
                  Labor {formatCurrency(e.totalLaborCost ?? 0, currency)} · Materials {formatCurrency(e.totalMaterialCost ?? 0, currency)}
                  {' · '}Repair {e.itemsToRepair ?? 0} · Replace {e.itemsToReplace ?? 0}
                </div>
              </div>
              {e.confidenceLevel && (
                <Chip size="sm" variant="flat" color="secondary">
                  <ConfidenceBadge level={e.confidenceLevel} />
                </Chip>
              )}
            </div>
            {e.confidenceReason && (
              <div className="mt-2 text-xs text-foreground-500 whitespace-pre-wrap">{e.confidenceReason}</div>
            )}
          </CardBody>
        </Card>
      )}

      {whySummary.length > 0 && (
        <Card className="border border-default-200 bg-default-50/60">
          <CardBody className="p-3">
            <div className="flex items-center gap-2">
              <div className="text-xs text-foreground-500 font-semibold">Why this estimate?</div>
              <InfoTip
                label="How we explain"
                content="Summaries are derived from inspection notes, line item counts, and the AI confidence metadata provided at generation time."
              />
            </div>
            <ul className="mt-2 text-xs text-foreground-600 list-disc pl-5">
              {whySummary.slice(0, 3).map((line, idx) => (
                <li key={idx} className="whitespace-pre-wrap">{line}</li>
              ))}
            </ul>
          </CardBody>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-6 gap-3">
        <Stat
          label="Total (expected)"
          value={formatCurrency(e.totalProjectCost ?? 0, currency)}
          helpText="Expected midpoint based on the AI estimate summary and line items."
        />
        {hasRange ? (
          <Stat
            label="Bid range"
            value={`${formatCurrency(e.bidLowTotal as number, currency)} – ${formatCurrency(e.bidHighTotal as number, currency)}`}
            helpText="Low/high bounds reflect uncertainty in scope, labor, and materials."
          />
        ) : (
          <Stat label="Bid range" value="—" helpText="No range available for this estimate." />
        )}
        <Stat label="Labor" value={formatCurrency(e.totalLaborCost ?? 0, currency)} helpText="Labor cost derived from estimated hours and rate by line item." />
        <Stat label="Materials" value={formatCurrency(e.totalMaterialCost ?? 0, currency)} helpText="Material cost derived from parts and supplies per line item." />
        <Stat label="Items to repair" value={String(e.itemsToRepair ?? 0)} helpText="Count of line items marked as repair." />
        <Stat label="Items to replace" value={String(e.itemsToReplace ?? 0)} helpText="Count of line items marked as replacement." />
      </div>

      <Divider />

      <div>
        <h3 className="text-sm font-semibold mb-2">Line items</h3>
        {(e.lineItems?.length ?? 0) === 0 ? (
          <p className="text-sm text-foreground-500">No line items returned.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {e.lineItems!.map((li) => (
              <div key={li.id} className="border border-default-200 rounded p-3">
                <div className="flex items-start gap-3">
                  <div className="flex flex-col">
                    <div className="text-sm font-semibold">{li.itemDescription}</div>
                    <div className="text-xs text-foreground-500">
                      {li.location} · {li.category} · {li.issueType}
                    </div>
                  </div>
                  <div className="ml-auto text-right">
                    {(typeof li.bidLowTotal === 'number' && typeof li.bidHighTotal === 'number') ? (
                      <>
                        <div className="text-xs text-foreground-500">Bid range</div>
                        <div className="text-sm font-semibold">
                          {formatCurrency(li.bidLowTotal, currency)} – {formatCurrency(li.bidHighTotal, currency)}
                        </div>
                        <div className="text-xs text-foreground-500">
                          Expected: {formatCurrency(li.totalCost ?? 0, currency)}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="text-xs text-foreground-500">Expected</div>
                        <div className="text-sm font-semibold">{formatCurrency(li.totalCost ?? 0, currency)}</div>
                      </>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-xs text-foreground-500">
                  <div>
                    Labor: {formatCurrency(li.laborCost ?? 0, currency)}
                    {(typeof li.bidLowLaborCost === 'number' && typeof li.bidHighLaborCost === 'number')
                      ? ` (range ${formatCurrency(li.bidLowLaborCost, currency)}–${formatCurrency(li.bidHighLaborCost, currency)})`
                      : ''}
                  </div>
                  <div>
                    Materials: {formatCurrency(li.materialCost ?? 0, currency)}
                    {(typeof li.bidLowMaterialCost === 'number' && typeof li.bidHighMaterialCost === 'number')
                      ? ` (range ${formatCurrency(li.bidLowMaterialCost, currency)}–${formatCurrency(li.bidHighMaterialCost, currency)})`
                      : ''}
                  </div>
                  <div>
                    Hours/Rate: {li.laborHours ?? '—'} / {li.laborRate ?? '—'}
                  </div>
                  {li.confidenceLevel && (
                    <div className="md:col-span-3">
                      <ConfidenceBadge level={li.confidenceLevel} />
                      {li.confidenceReason ? ` — ${li.confidenceReason}` : ''}
                    </div>
                  )}
                </div>

                {(li.confidenceReason || (li.assumptions?.length ?? 0) > 0) && (
                  <div className="mt-2 text-xs text-foreground-600">
                    <span className="font-semibold text-foreground-500">Why:</span>{' '}
                    {li.confidenceReason ? li.confidenceReason : `Assumption: ${li.assumptions?.[0]}`}
                  </div>
                )}

                {((li.repairInstructions || li.notes) || (li.assumptions?.length || li.questionsToReduceUncertainty?.length)) && (
                  <div className="mt-2 text-xs">
                    {li.repairInstructions && (
                      <div>
                        <div className="font-semibold text-foreground-500">Instructions</div>
                        <div className="whitespace-pre-wrap">{li.repairInstructions}</div>
                      </div>
                    )}
                    {li.notes && (
                      <div className="mt-2">
                        <div className="font-semibold text-foreground-500">Notes</div>
                        <div className="whitespace-pre-wrap">{li.notes}</div>
                      </div>
                    )}

                    {(li.assumptions?.length ?? 0) > 0 && (
                      <div className="mt-2">
                        <div className="font-semibold text-foreground-500">Assumptions</div>
                        <ul className="list-disc pl-5">
                          {li.assumptions!.slice(0, 5).map((a, idx) => (
                            <li key={idx} className="whitespace-pre-wrap">{a}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(li.questionsToReduceUncertainty?.length ?? 0) > 0 && (
                      <div className="mt-2">
                        <div className="font-semibold text-foreground-500">Questions to reduce uncertainty</div>
                        <ul className="list-disc pl-5">
                          {li.questionsToReduceUncertainty!.slice(0, 5).map((q, idx) => (
                            <li key={idx} className="whitespace-pre-wrap">{q}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) return body;

  const buildCopySummary = () => {
    const lines: string[] = [];
    lines.push(`Estimate #${e.id}`);
    if (e.generatedAt) lines.push(`Generated: ${new Date(e.generatedAt).toLocaleString()}`);
    lines.push(`Total (expected): ${formatCurrency(e.totalProjectCost ?? 0, currency)}`);
    if (hasRange) {
      lines.push(`Bid range: ${formatCurrency(e.bidLowTotal as number, currency)} – ${formatCurrency(e.bidHighTotal as number, currency)}`);
    }
    lines.push(`Labor: ${formatCurrency(e.totalLaborCost ?? 0, currency)} | Materials: ${formatCurrency(e.totalMaterialCost ?? 0, currency)}`);
    lines.push(`Items: repair ${e.itemsToRepair ?? 0} | replace ${e.itemsToReplace ?? 0}`);
    lines.push('');
    lines.push('Line items:');
    for (const li of (e.lineItems ?? []).slice(0, 12)) {
      const cost = formatCurrency(li.totalCost ?? 0, currency);
      lines.push(`- ${li.itemDescription} (${li.location}) — ${cost}`);
    }
    if ((e.lineItems?.length ?? 0) > 12) lines.push(`…plus ${(e.lineItems!.length - 12)} more`);
    return lines.join('\n');
  };

  const handleCopySummary = async () => {
    const text = buildCopySummary();
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // fallback
      window.prompt('Copy estimate summary:', text);
    }
  };


  const navigate = useNavigate();

  const [convertLoading, setConvertLoading] = useState(false);
  const [convertError, setConvertError] = useState<string | null>(null);
  const [convertResult, setConvertResult] = useState<any[] | null>(null);
  const [showConvertDialog, setShowConvertDialog] = useState(false);

  const handleConvertToMaintenance = async () => {
    if (!token) {
      setConvertError('Missing auth token');
      return;
    }
    setConvertLoading(true);
    setConvertError(null);
    setConvertResult(null);
    try {
      const resp = await apiFetch('/estimates/' + String(e.id) + '/convert-to-maintenance', {
        token: token ?? undefined,
        method: 'POST',
      });
      const data = unwrapApi<any[]>(resp);
      setConvertResult(Array.isArray(data) ? data : []);
    } catch (err) {
      setConvertError(err instanceof Error ? err.message : 'Conversion failed');
    } finally {
      setConvertLoading(false);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader className="flex items-center gap-3">
        <div className="flex flex-col">
          <h2 className="text-lg font-semibold">Estimate</h2>
          <span className="text-xs text-foreground-500">
            #{e.id}{e.status ? ` · ${e.status}` : ''}
            {e.generatedAt ? ` · ${new Date(e.generatedAt).toLocaleString()}` : ''}
          </span>
          {e.confidenceLevel && (
            <span className="text-xs text-foreground-500">
              Bid confidence: <span className="font-semibold">{e.confidenceLevel.replace('_', ' ')}</span>
            </span>
          )}
        </div>

        <div className="ml-auto flex items-start gap-3">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="flat" onClick={handleCopySummary}>
              Copy Summary
            </Button>
            {canManage && (
              <Button
                size="sm"
                variant="flat"
                color="warning"
                onClick={() => setShowConvertDialog(true)}
                isLoading={convertLoading}
                isDisabled={convertLoading || e.status !== 'APPROVED'}
              >
                Convert → Maintenance
              </Button>
            )}
          </div>
          <div className="text-right">
            {hasRange ? (
              <>
                <div className="text-xs text-foreground-500">Bid range</div>
                <div className="text-lg font-bold">
                  {formatCurrency(e.bidLowTotal!, currency)} – {formatCurrency(e.bidHighTotal!, currency)}
                </div>
                <div className="text-xs text-foreground-500">
                  Expected (midpoint): {formatCurrency(e.totalProjectCost ?? 0, currency)}
                </div>
              </>
            ) : (
              <>
                <div className="text-xs text-foreground-500">Expected (midpoint)</div>
                <div className="text-lg font-bold">{formatCurrency(e.totalProjectCost ?? 0, currency)}</div>
              </>
            )}
          </div>
        </div>
      </CardHeader>
      <Divider />
      <CardBody className="flex flex-col gap-4">
        {canManage && (
          <>
            <ConfirmDialog
              isOpen={showConvertDialog}
              onOpenChange={() => setShowConvertDialog(false)}
              title="Convert estimate to maintenance requests?"
              message={
                e.status !== 'APPROVED'
                  ? 'This estimate must be approved before converting to maintenance requests.'
                  : 'This will create maintenance requests from the estimate line items. Existing requests won’t be deleted.'
              }
              confirmLabel={e.status !== 'APPROVED' ? 'OK' : 'Convert'}
              cancelLabel="Cancel"
              confirmColor={e.status !== 'APPROVED' ? 'default' : 'warning'}
              isLoading={convertLoading}
              onConfirm={() => {
                if (e.status !== 'APPROVED') {
                  setShowConvertDialog(false);
                  return;
                }
                setShowConvertDialog(false);
                handleConvertToMaintenance();
              }}
            />
            {convertResult && (
              <Card className="border border-emerald-200 bg-emerald-50/40">
                <CardBody className="flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm text-emerald-800 font-semibold">
                      Created {convertResult.length} maintenance request{convertResult.length === 1 ? '' : 's'}
                    </p>
                    <Button size="sm" variant="flat" color="success" onClick={() => navigate('/maintenance')}>
                      View Maintenance
                    </Button>
                  </div>
                  {convertResult.length > 0 && (
                    <ul className="text-xs text-emerald-900/80 list-disc pl-5">
                      {convertResult.slice(0, 5).map((r: any) => (
                        <li key={r.id} className="whitespace-pre-wrap">
                          #{r.id}{r.title ? ` — ${r.title}` : ''}
                        </li>
                      ))}
                      {convertResult.length > 5 && (
                        <li>…plus {convertResult.length - 5} more</li>
                      )}
                    </ul>
                  )}
                </CardBody>
              </Card>
            )}
            {convertError && (
              <Card className="border border-rose-200">
                <CardBody>
                  <p className="text-sm text-rose-700">{convertError}</p>
                </CardBody>
              </Card>
            )}
          </>
        )}
        {body}
      </CardBody>
    </Card>
  );
}

function Stat({ label, value, helpText }: { label: string; value: string; helpText?: string }) {
  return (
    <div className="border border-default-200 rounded p-3">
      <div className="text-xs text-foreground-500">
        {helpText ? <InfoTip label={label} content={helpText} /> : label}
      </div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function EstimateHistoryList({ estimates }: { estimates: any[] }) {
  const sorted = [...(estimates ?? [])]
    .map((estimate) => normalizeEstimate(estimate))
    .sort((a, b) => {
      const ad = a?.generatedAt ? new Date(a.generatedAt).getTime() : 0;
      const bd = b?.generatedAt ? new Date(b.generatedAt).getTime() : 0;
      return bd - ad;
    });

  if (sorted.length === 0) return null;

  return (
    <Card className="mb-4">
      <CardHeader>
        <h2 className="text-lg font-semibold">Estimate history</h2>
      </CardHeader>
      <Divider />
      <CardBody className="flex flex-col gap-3">
        {sorted.map((e) => (
          <details key={e.id} className="border border-default-200 rounded p-3">
            <summary className="cursor-pointer select-none">
              <div className="flex items-center gap-2">
                <span className="font-semibold">Estimate #{e.id}</span>
                {e.status && (
                  <Chip size="sm" variant="flat">
                    {e.status}
                  </Chip>
                )}
                <span className="text-xs text-foreground-500">
                  {e.generatedAt ? new Date(e.generatedAt).toLocaleString() : ''}
                </span>
                <span className="ml-auto font-semibold">
                  {formatCurrency(Number(e.totalProjectCost ?? 0), e.currency ?? 'USD')}
                </span>
              </div>
            </summary>
            <div className="mt-3">
              <EstimatePanel estimate={e} embedded />
            </div>
          </details>
        ))}
      </CardBody>
    </Card>
  );
}

export default function InspectionDetailPage(): React.ReactElement {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const inspectionId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);

  const [draftByRoom, setDraftByRoom] = useState<DraftByRoom>({});

  // Per-item save state (row-level autosave + manual fallback)
  const [itemMeta, setItemMeta] = useState<Record<number, { saving: boolean; lastSavedAtMs?: number; error?: string }>>({});

  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimateNotice, setEstimateNotice] = useState<string | null>(null);
  const [estimateResult, setEstimateResult] = useState<any | null>(null);
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false);
  const [analyzingPhotos, setAnalyzingPhotos] = useState<Record<number, boolean>>({});

  const userRole = (user as { role?: string } | null)?.role;
  const isPropertyManager = userRole === 'PROPERTY_MANAGER';
  const isOwnerView = userRole === 'OWNER';

  const fetchInspection = useCallback(async (signal?: AbortSignal) => {
    if (!inspectionId || Number.isNaN(inspectionId)) {
      setError('Invalid inspection id');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const resp = await apiFetch(`/inspections/${inspectionId}`, { token: token ?? undefined, signal });
      const data = unwrapApi<InspectionDetail>(resp);
      setInspection(data);

      // Initialize draft cache with current values (but do not mark anything dirty).
      const initialDraft: DraftByRoom = {};
      (data.rooms ?? []).forEach((room) => {
        initialDraft[room.id] = {};
        (room.checklistItems ?? []).forEach((item) => {
          initialDraft[room.id][item.id] = {
            requiresAction: !!item.requiresAction,
            condition: (item.condition ?? null) as any,
            notes: (item.notes ?? '') ?? '',
            severity: (item.severity ?? null) as any,
            issueType: (item.issueType ?? null) as any,
            measurementValue: (item.measurementValue ?? null) as any,
            measurementUnit: (item.measurementUnit ?? null) as any,
            measurementNotes: (item.measurementNotes ?? '') ?? '',
          };
        });
      });
      setDraftByRoom(initialDraft);
      setItemMeta({});
    } catch (err: any) {
      setError(err.message ?? 'Failed to load inspection');
      setInspection(null);
    } finally {
      setLoading(false);
    }
  }, [inspectionId, token]);

  useEffect(() => {
    const controller = new AbortController();
    fetchInspection(controller.signal);
    return () => controller.abort();
  }, [fetchInspection]);

  const onDraftChange = useCallback((roomId: number, itemId: number, patch: Partial<DraftChecklistItem>) => {
    setDraftByRoom((prev) => {
      const room = prev[roomId] ?? {};
      const current = room[itemId] ?? {
        requiresAction: false,
        condition: null,
        notes: '',
        severity: null,
        issueType: null,
        measurementValue: null,
        measurementUnit: null,
        measurementNotes: '',
      };
      return {
        ...prev,
        [roomId]: {
          ...room,
          [itemId]: {
            ...current,
            ...patch,
          },
        },
      };
    });
  }, []);

  const roomDrafts = useMemo(() => draftByRoom ?? {}, [draftByRoom]);

  const validateItem = useCallback((item: ChecklistItem, draft: DraftChecklistItem): string | null => {
    if (draft.requiresAction) {
      if (!draft.condition) return 'Condition is required when "Requires action" is enabled.';
      if (!draft.notes?.trim()) return 'Notes are required when "Requires action" is enabled.';
    }
    return null;
  }, []);

  const saveItem = useCallback(async (room: InspectionRoom, item: ChecklistItem) => {
    if (!inspection) return;

    const draft = (roomDrafts?.[room.id]?.[item.id]) as DraftChecklistItem | undefined;
    if (!draft) return;

    const baseline: DraftChecklistItem = {
      requiresAction: !!item.requiresAction,
      condition: (item.condition ?? null) as any,
      notes: (item.notes ?? '') ?? '',
      severity: (item.severity ?? null) as any,
      issueType: (item.issueType ?? null) as any,
      measurementValue: (item.measurementValue ?? null) as any,
      measurementUnit: (item.measurementUnit ?? null) as any,
      measurementNotes: (item.measurementNotes ?? '') ?? '',
    };

    // No changes => nothing to do.
    if (shallowEqualDraft(draft, baseline)) {
      setItemMeta((prev) => ({
        ...prev,
        [item.id]: { saving: false, lastSavedAtMs: prev[item.id]?.lastSavedAtMs, error: undefined },
      }));
      return;
    }

    const validationError = validateItem(item, draft);
    if (validationError) {
      setItemMeta((prev) => ({
        ...prev,
        [item.id]: { saving: false, lastSavedAtMs: prev[item.id]?.lastSavedAtMs, error: validationError },
      }));
      return;
    }

    setItemMeta((prev) => ({
      ...prev,
      [item.id]: { saving: true, lastSavedAtMs: prev[item.id]?.lastSavedAtMs, error: undefined },
    }));

    try {
      await apiFetch(`/inspections/items/${item.id}`, {
        token: token ?? undefined,
        method: 'PATCH',
        body: {
          requiresAction: !!draft.requiresAction,
          condition: (draft.condition ?? null) as any,
          notes: draft.notes,
          severity: (draft.severity ?? null) as any,
          issueType: (draft.issueType ?? null) as any,
          measurementValue: (draft.measurementValue ?? null) as any,
          measurementUnit: (draft.measurementUnit ?? null) as any,
          measurementNotes: draft.measurementNotes,
        },
      });

      setItemMeta((prev) => ({
        ...prev,
        [item.id]: { saving: false, lastSavedAtMs: Date.now(), error: undefined },
      }));

      // Sync server truth
      await fetchInspection();
    } catch (err: any) {
      setItemMeta((prev) => ({
        ...prev,
        [item.id]: { saving: false, lastSavedAtMs: prev[item.id]?.lastSavedAtMs, error: err?.message ?? 'Save failed' },
      }));
    }
  }, [fetchInspection, inspection, roomDrafts, token, validateItem]);

  const generateEstimate = useCallback(async () => {
    if (!inspection) return;

    setEstimateLoading(true);
    setEstimateError(null);
    setEstimateNotice(null);
    setEstimateResult(null);

    try {
      const resp = await apiFetch(`/inspections/${inspection.id}/estimate`, {
        token: token ?? undefined,
        method: 'POST',
      });
      setEstimateResult(unwrapApi<any>(resp));

      // Re-fetch so the inspection detail reflects newly created estimate(s)
      await fetchInspection();
    } catch (err: any) {
      const message = err?.message ?? 'Failed to generate estimate';
      // Fallback mode: keep demo flow alive with deterministic rough estimate
      const fallbackEstimate = buildFallbackEstimateFromInspection(inspection);
      if ((fallbackEstimate.lineItems?.length ?? 0) > 0) {
        setEstimateResult(fallbackEstimate);
        setEstimateNotice(`Fallback estimate generated: ${message}`);
      } else {
        setEstimateError(message);
      }
    } finally {
      setEstimateLoading(false);
    }
  }, [fetchInspection, inspection, token]);

  const hasAnyEstimate = useMemo(() => {
    return !!estimateResult || ((inspection as any)?.repairEstimates?.length ?? 0) > 0;
  }, [estimateResult, inspection]);

  const normalizedEstimateResult = useMemo(() => {
    return estimateResult ? normalizeEstimate(estimateResult) : null;
  }, [estimateResult]);

  const lastGeneratedAt = useMemo(() => {
    const gen = (estimateResult as any)?.generatedAt;
    if (gen) return gen;
    const arr = (inspection as any)?.repairEstimates ?? [];
    const sorted = [...arr].sort((a: any, b: any) => {
      const ad = a?.generatedAt ? new Date(a.generatedAt).getTime() : 0;
      const bd = b?.generatedAt ? new Date(b.generatedAt).getTime() : 0;
      return bd - ad;
    });
    return sorted[0]?.generatedAt ?? null;
  }, [estimateResult, inspection]);

  const latestEstimate = useMemo(() => {
    if (estimateResult) return normalizeEstimate(estimateResult);
    const arr = (inspection as any)?.repairEstimates ?? [];
    const sorted = [...arr].sort((a: any, b: any) => {
      const ad = a?.generatedAt ? new Date(a.generatedAt).getTime() : 0;
      const bd = b?.generatedAt ? new Date(b.generatedAt).getTime() : 0;
      return bd - ad;
    });
    return sorted[0] ? normalizeEstimate(sorted[0]) : null;
  }, [estimateResult, inspection]);

  const headerTitle = useMemo(() => {
    if (!inspection) return 'Inspection';
    const prop = inspection.property?.name ?? 'Property';
    const unit = inspection.unit?.name ? ` · ${inspection.unit.name}` : '';
    return `${prop}${unit}`;
  }, [inspection]);

  const actionableCount = useMemo(() => {
    if (!inspection) return 0;
    const rooms = (inspection as any).rooms ?? [];
    let count = 0;
    for (const room of rooms) {
      for (const item of room?.checklistItems ?? []) {
        if (item?.requiresAction) count += 1;
      }
    }
    return count;
  }, [inspection]);

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-3">
        <Spinner size="lg" />
        <span className="text-sm text-foreground-500">Loading inspection…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Button isIconOnly variant="light" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={20} />
          </Button>
          <h1 className="text-2xl font-bold">Inspection</h1>
        </div>
        <Card>
          <CardBody>
            <p className="text-rose-600 text-sm">{error}</p>
            <Button className="mt-4" onClick={() => fetchInspection()}>
              Retry
            </Button>
          </CardBody>
        </Card>
      </div>
    );
  }

  if (!inspection) {
    return (
      <div className="p-6">
        <Card className="max-w-lg">
          <CardBody className="flex flex-col gap-2">
            <p className="text-sm text-foreground-500">No inspection found.</p>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="flat" onClick={() => fetchInspection()}>
                Retry
              </Button>
              <Button size="sm" variant="light" onClick={() => navigate(-1)}>
                Go back
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>
    );
  }

  return (
    <>
      <div className="p-6 max-w-6xl mx-auto print-hidden">
      <div className="flex items-center gap-3 mb-4">
        <Button isIconOnly variant="light" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-2xl font-bold">{headerTitle}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Chip color={getStatusColor(inspection.status)} size="sm" variant="flat">
              {inspection.status}
            </Chip>
            <span className="text-xs text-foreground-500">
              {inspection.type} · Scheduled {new Date(inspection.scheduledDate).toLocaleString()}
            </span>
            {inspection.completedDate && (
              <span className="text-xs text-foreground-500">
                · Completed {new Date(inspection.completedDate).toLocaleString()}
              </span>
            )}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="flat" onClick={() => window.print()}>
            Print / Export
          </Button>
          {isPropertyManager && (
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-2">
                <Button
                  color="primary"
                  onClick={generateEstimate}
                  isLoading={estimateLoading}
                  isDisabled={estimateLoading || actionableCount === 0}
                >
                  {hasAnyEstimate ? 'Regenerate Estimate' : 'Generate Estimate'}
                </Button>
                {hasAnyEstimate && (
                  <Button
                    variant="flat"
                    color="warning"
                    onClick={() => setShowRegenerateDialog(true)}
                    isDisabled={estimateLoading}
                  >
                    Regenerate
                  </Button>
                )}
              </div>
              {lastGeneratedAt && (
                <span className="text-xs text-foreground-500 mt-1">
                  Last generated {new Date(lastGeneratedAt).toLocaleString()}
                </span>
              )}
              {actionableCount === 0 && (
                <span className="text-xs text-foreground-500 mt-1">
                  No checklist items marked “Requires action”.
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {isOwnerView && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <CardBody className="text-xs text-amber-700">
            <span className="font-semibold">Owner view:</span> inspection checklists and estimates are read-only. Requests for updates go through your property manager.
          </CardBody>
        </Card>
      )}

      <ConfirmDialog
        isOpen={showRegenerateDialog}
        onOpenChange={() => setShowRegenerateDialog(false)}
        title="Regenerate estimate?"
        message="This will run estimation again and may change totals and line items. Your previous estimates will remain in history."
        confirmLabel="Regenerate"
        confirmColor="warning"
        isLoading={estimateLoading}
        onConfirm={() => {
          setShowRegenerateDialog(false);
          generateEstimate();
        }}
      />

      {estimateNotice && (
        <Card className="mb-4 border border-amber-200 bg-amber-50">
          <CardBody className="flex flex-col gap-2">
            <p className="text-sm text-amber-800">{estimateNotice}</p>
          </CardBody>
        </Card>
      )}

      {estimateError && (
        <Card className="mb-4 border border-rose-200">
          <CardBody className="flex flex-col gap-2">
            <p className="text-sm text-rose-700">{estimateError}</p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="flat"
                color="danger"
                onClick={generateEstimate}
                isLoading={estimateLoading}
                isDisabled={estimateLoading || actionableCount === 0}
              >
                Retry estimate
              </Button>
            </div>
          </CardBody>
        </Card>
      )}

      {/* If we just generated an estimate this session, show it first */}
      {normalizedEstimateResult && (
        <EstimatePanel estimate={normalizedEstimateResult} token={token ?? undefined} canManage={isPropertyManager} />
      )}

      {/* Full history list from inspection.repairEstimates */}
      <EstimateHistoryList estimates={(inspection.repairEstimates ?? []) as any[]} />

      {!hasAnyEstimate && !estimateLoading && !estimateError && (
        <Card className="mb-4 border border-default-200">
          <CardBody className="flex flex-col gap-2">
            <p className="text-sm font-semibold">No estimates yet</p>
            <p className="text-xs text-foreground-500">
              Mark checklist items as “Requires action” to enable estimates, then generate a repair estimate for this inspection.
            </p>
            {isPropertyManager && (
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  color="primary"
                  onClick={generateEstimate}
                  isLoading={estimateLoading}
                  isDisabled={estimateLoading || actionableCount === 0}
                >
                  Generate Estimate
                </Button>
                {actionableCount === 0 && (
                  <span className="text-xs text-foreground-500">No action items yet.</span>
                )}
              </div>
            )}
          </CardBody>
        </Card>
      )}

      {inspection.notes && (
        <Card className="mb-4">
          <CardHeader>
            <h2 className="text-lg font-semibold">Inspection Notes</h2>
          </CardHeader>
          <Divider />
          <CardBody>
            <p className="text-sm">{inspection.notes}</p>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-col gap-4">
        {(inspection.rooms ?? []).length === 0 ? (
          <Card className="border border-default-200">
            <CardBody className="flex flex-col gap-2">
              <p className="text-sm font-semibold">No rooms on this inspection</p>
              <p className="text-xs text-foreground-500">
                Rooms and checklist items will appear here once they are added to the inspection.
              </p>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="flat" onClick={() => fetchInspection()}>
                  Refresh
                </Button>
              </div>
            </CardBody>
          </Card>
        ) : (
          (inspection.rooms ?? []).map((room) => {
            const drafts = roomDrafts[room.id] ?? {};
            const dirtyCount = room.checklistItems.reduce((count, item) => {
              const d = drafts[item.id];
              if (!d) return count;
              const baseline: DraftChecklistItem = {
                requiresAction: !!item.requiresAction,
                condition: (item.condition ?? null) as any,
                notes: (item.notes ?? '') ?? '',
                severity: (item.severity ?? null) as any,
                issueType: (item.issueType ?? null) as any,
                measurementValue: (item.measurementValue ?? null) as any,
                measurementUnit: (item.measurementUnit ?? null) as any,
                measurementNotes: (item.measurementNotes ?? '') ?? '',
              };
              return count + (shallowEqualDraft(d, baseline) ? 0 : 1);
            }, 0);

            // Any row-level save errors are shown inline per item.

            return (
              <Card key={room.id}>
                <CardHeader className="flex flex-col items-start gap-2">
                  <div className="flex items-center w-full gap-3">
                    <div className="flex flex-col">
                      <h2 className="text-lg font-semibold">{room.name}</h2>
                      <span className="text-xs text-foreground-500">{room.roomType}</span>
                    </div>
                    <div className="ml-auto flex items-center gap-2">
                      {dirtyCount > 0 && (
                        <Chip size="sm" variant="flat" color="warning">
                          {dirtyCount} unsaved
                        </Chip>
                      )}
                      <Chip size="sm" variant="flat" color={dirtyCount > 0 ? 'warning' : 'default'}>
                        Auto-save on row leave
                      </Chip>
                    </div>
                  </div>
                </CardHeader>

                <Divider />

                <CardBody className="flex flex-col gap-4">
                  {(room.checklistItems ?? []).map((item) => {
                    const draft = drafts[item.id] ?? {
                      requiresAction: !!item.requiresAction,
                      condition: (item.condition ?? null) as any,
                      notes: (item.notes ?? '') ?? '',
                      severity: (item.severity ?? null) as any,
                      issueType: (item.issueType ?? null) as any,
                      measurementValue: (item.measurementValue ?? null) as any,
                      measurementUnit: (item.measurementUnit ?? null) as any,
                      measurementNotes: (item.measurementNotes ?? '') ?? '',
                    };

                    const meta = itemMeta[item.id];
                    const saving = !!meta?.saving;
                    const errorMsg = meta?.error;

                    const baseline: DraftChecklistItem = {
                      requiresAction: !!item.requiresAction,
                      condition: (item.condition ?? null) as any,
                      notes: (item.notes ?? '') ?? '',
                      severity: (item.severity ?? null) as any,
                      issueType: (item.issueType ?? null) as any,
                      measurementValue: (item.measurementValue ?? null) as any,
                      measurementUnit: (item.measurementUnit ?? null) as any,
                      measurementNotes: (item.measurementNotes ?? '') ?? '',
                    };
                    const isDirty = !shallowEqualDraft(draft, baseline);

                    return (
                      <div
                        key={item.id}
                        className="p-3 rounded border border-default-200"
                        onBlurCapture={(e) => {
                          if (isOwnerView) return;
                          const next = e.relatedTarget as any;
                          if (e.currentTarget.contains(next)) return; // still inside row
                          void saveItem(room, item);
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col">
                            <div className="text-sm font-semibold">{item.itemName}</div>
                            <div className="text-xs text-foreground-500">{item.category}</div>
                          </div>
                          <div className="ml-auto flex items-center gap-3">
                            {saving ? (
                              <Chip size="sm" variant="flat" color="primary">Saving…</Chip>
                            ) : errorMsg ? (
                              <Chip size="sm" variant="flat" color="danger">Error</Chip>
                            ) : isDirty ? (
                              <Chip size="sm" variant="flat" color="warning">Unsaved</Chip>
                            ) : meta?.lastSavedAtMs ? (
                              <Chip size="sm" variant="flat">Saved</Chip>
                            ) : null}

                            <Button
                              size="sm"
                              variant="flat"
                              color={errorMsg ? 'danger' : 'default'}
                              isDisabled={!isDirty || saving || isOwnerView}
                              onClick={() => {
                                if (isOwnerView) return;
                                saveItem(room, item);
                              }}
                            >
                              Save
                            </Button>

                            <Switch
                              isSelected={draft.requiresAction}
                              onValueChange={(v) =>
                                onDraftChange(room.id, item.id, v
                                  ? { requiresAction: true }
                                  : {
                                      requiresAction: false,
                                      condition: null,
                                      notes: '',
                                      severity: null,
                                      issueType: null,
                                      measurementValue: null,
                                      measurementUnit: null,
                                      measurementNotes: '',
                                    })
                              }
                              size="sm"
                              isDisabled={saving || isOwnerView}
                            >
                              Requires action
                            </Switch>
                          </div>
                        </div>

                        {errorMsg && (
                          <div className="mt-2 text-xs text-rose-700">{errorMsg}</div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                          <Select
                            label="Condition"
                            selectedKeys={draft.condition ? new Set([draft.condition]) : new Set()}
                            onSelectionChange={(keys) => {
                              const value = Array.from(keys)[0] as any;
                              onDraftChange(room.id, item.id, { condition: (value || null) as any });
                            }}
                            isDisabled={!draft.requiresAction || saving || isOwnerView}
                            placeholder="Select condition"
                          >
                            {conditionOptions.map((opt) => (
                              <SelectItem key={opt.key}>{opt.label}</SelectItem>
                            ))}
                          </Select>

                          <Select
                            label="Severity (optional)"
                            selectedKeys={draft.severity ? new Set([draft.severity]) : new Set()}
                            onSelectionChange={(keys) => {
                              const value = Array.from(keys)[0] as any;
                              onDraftChange(room.id, item.id, { severity: (value || null) as any });
                            }}
                            isDisabled={!draft.requiresAction || saving || isOwnerView}
                            placeholder="Select severity"
                          >
                            {severityOptions.map((opt) => (
                              <SelectItem key={opt.key}>{opt.label}</SelectItem>
                            ))}
                          </Select>

                          <Select
                            label="Issue type (optional)"
                            selectedKeys={draft.issueType ? new Set([draft.issueType]) : new Set()}
                            onSelectionChange={(keys) => {
                              const value = Array.from(keys)[0] as any;
                              onDraftChange(room.id, item.id, { issueType: (value || null) as any });
                            }}
                            isDisabled={!draft.requiresAction || saving || isOwnerView}
                            placeholder="Investigate / Repair / Replace"
                          >
                            {issueTypeOptions.map((opt) => (
                              <SelectItem key={opt.key}>{opt.label}</SelectItem>
                            ))}
                          </Select>

                          <div className="flex gap-2 items-end">
                            <Input
                              type="number"
                              label="Measurement (optional)"
                              placeholder="0"
                              value={typeof draft.measurementValue === 'number' ? String(draft.measurementValue) : ''}
                              onValueChange={(v) => {
                                const num = v === '' ? null : Number(v);
                                onDraftChange(room.id, item.id, { measurementValue: Number.isFinite(num as any) ? (num as any) : null });
                              }}
                              isDisabled={!draft.requiresAction || saving || isOwnerView}
                            />
                            <Select
                              aria-label="Measurement unit"
                              selectedKeys={draft.measurementUnit ? new Set([draft.measurementUnit]) : new Set()}
                              onSelectionChange={(keys) => {
                                const value = Array.from(keys)[0] as any;
                                onDraftChange(room.id, item.id, { measurementUnit: (value || null) as any });
                              }}
                              isDisabled={!draft.requiresAction || saving || isOwnerView}
                              placeholder="Unit"
                              className="min-w-[140px]"
                            >
                              {measurementUnitOptions.map((opt) => (
                                <SelectItem key={opt.key}>{opt.label}</SelectItem>
                              ))}
                            </Select>
                          </div>

                          <div className="md:col-span-2">
                            <Input
                              label="Measurement notes (optional)"
                              placeholder="e.g., approx 12 linear ft along baseboard"
                              value={draft.measurementNotes ?? ''}
                              onValueChange={(v) => onDraftChange(room.id, item.id, { measurementNotes: v })}
                              isDisabled={!draft.requiresAction || saving || isOwnerView}
                            />
                          </div>

                          <div className="md:col-span-2">
                            <Textarea
                              label="Notes"
                              placeholder="Describe the issue, symptoms, and any context…"
                              value={draft.notes}
                              onValueChange={(v) => onDraftChange(room.id, item.id, { notes: v })}
                              isDisabled={!draft.requiresAction || saving || isOwnerView}
                              minRows={2}
                            />
                          </div>

                          {/* Photo Upload Section */}
                          <div className="md:col-span-2">
                            <div className="border-2 border-dashed border-default-300 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-3">
                                <span className="text-sm font-medium">Photos</span>
                                {!isOwnerView && (
                                  <label className="cursor-pointer">
                                    <input
                                      type="file"
                                      accept="image/*"
                                      multiple
                                      className="hidden"
                                      onChange={async (e) => {
                                        const files = e.target.files;
                                        if (!files || files.length === 0) return;
                                        
                                        for (let i = 0; i < files.length; i++) {
                                          const file = files[i];
                                          // Create preview URL
                                          const previewUrl = URL.createObjectURL(file);
                                          
                                          // In a real implementation, upload to server
                                          // For now, we'll simulate with a local URL
                                          const mockUrl = previewUrl;
                                          
                                          try {
                                            const result = await apiFetch(`/inspections/items/${item.id}/photos`, {
                                              token: token ?? undefined,
                                              method: 'POST',
                                              body: {
                                                url: mockUrl,
                                                caption: `${item.itemName} - Photo ${(item.photos?.length ?? 0) + i + 1}`,
                                              },
                                            });
                                            
                                            // Refresh inspection data to get updated photos
                                            fetchInspection();
                                          } catch (err) {
                                            console.error('Failed to upload photo:', err);
                                          }
                                        }
                                      }}
                                    />
                                    <Button 
                                      size="sm" 
                                      variant="flat" 
                                      color="primary"
                                      isDisabled={!draft.requiresAction || saving || isOwnerView}
                                    >
                                      Upload Photo
                                    </Button>
                                  </label>
                                )}
                              </div>
                              
                              {/* Photo Gallery */}
                              {(item.photos && item.photos.length > 0) ? (
                                <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                                  {item.photos.map((photo) => (
                                    <div key={photo.id} className="relative group">
                                      <img
                                        src={photo.url}
                                        alt={photo.caption || 'Inspection photo'}
                                        className="w-full h-24 object-cover rounded border border-default-200"
                                      />
                                      <button
                                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        onClick={async () => {
                                          if (!confirm('Delete this photo?')) return;
                                          try {
                                            await apiFetch(`/inspections/photos/${photo.id}`, {
                                              token: token ?? undefined,
                                              method: 'DELETE',
                                            });
                                            fetchInspection();
                                          } catch (err) {
                                            console.error('Failed to delete photo:', err);
                                          }
                                        }}
                                        disabled={isOwnerView}
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                      </button>
                                      {photo.aiAnalysis && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate">
                                          🤖 AI: {photo.aiAnalysis.substring(0, 30)}...
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <div className="text-center text-default-500 text-sm py-4">
                                  No photos yet. Upload photos to enable AI analysis.
                                </div>
                              )}
                              
                              {/* AI Analysis Button */}
                              {(item.photos && item.photos.length > 0) && !isOwnerView && (
                                <div className="mt-3 pt-3 border-t border-default-200">
                                  <Button
                                    size="sm"
                                    variant="flat"
                                    color="secondary"
                                    isLoading={analyzingPhotos[item.id]}
                                    onClick={async () => {
                                      setAnalyzingPhotos(prev => ({ ...prev, [item.id]: true }));
                                      try {
                                        const result = await apiFetch(`/inspections/items/${item.id}/analyze`, {
                                          token: token ?? undefined,
                                          method: 'POST',
                                        });
                                        
                                        if (result.success) {
                                          // Apply AI-suggested values to draft
                                          if (result.suggestedCondition) {
                                            onDraftChange(room.id, item.id, { 
                                              condition: result.suggestedCondition,
                                              requiresAction: true,
                                            });
                                          }
                                          if (result.suggestedSeverity) {
                                            onDraftChange(room.id, item.id, { severity: result.suggestedSeverity });
                                          }
                                          if (result.suggestedIssueType) {
                                            onDraftChange(room.id, item.id, { issueType: result.suggestedIssueType });
                                          }
                                          if (result.suggestedNotes) {
                                            onDraftChange(room.id, item.id, { notes: result.suggestedNotes });
                                          }
                                          
                                          // Show analysis feedback
                                          alert(`AI Analysis complete!\n\n${result.analysis || 'Analysis applied to form fields.'}`);
                                        }
                                      } catch (err) {
                                        console.error('AI analysis failed:', err);
                                        alert('AI analysis failed. Please try again.');
                                      } finally {
                                        setAnalyzingPhotos(prev => ({ ...prev, [item.id]: false }));
                                      }
                                    }}
                                  >
                                    {analyzingPhotos[item.id] ? 'Analyzing...' : '🤖 Analyze with AI'}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardBody>
              </Card>
            );
          })
        )}
      </div>
      <div className="print-only">
        <div className="print-page">
          <div className="print-section">
            <div className="print-title">Inspection Report</div>
            <div className="print-subtitle">{headerTitle}</div>
            <div className="print-meta">
              <div><strong>Status:</strong> {inspection.status}</div>
              <div><strong>Type:</strong> {inspection.type}</div>
              <div><strong>Scheduled:</strong> {new Date(inspection.scheduledDate).toLocaleString()}</div>
              {inspection.completedDate && (
                <div><strong>Completed:</strong> {new Date(inspection.completedDate).toLocaleString()}</div>
              )}
              <div><strong>Exported:</strong> {new Date().toLocaleString()}</div>
              <div><strong>Action items:</strong> {actionableCount}</div>
            </div>
          </div>

          {latestEstimate && (
            <div className="print-section print-card">
              <div className="print-section-title">Estimate Summary</div>
              <div className="print-meta">
                <div><strong>Total labor:</strong> {formatCurrency(latestEstimate.totalLaborCost ?? 0, latestEstimate.currency ?? 'USD')}</div>
                <div><strong>Total materials:</strong> {formatCurrency(latestEstimate.totalMaterialCost ?? 0, latestEstimate.currency ?? 'USD')}</div>
                <div><strong>Total project:</strong> {formatCurrency(latestEstimate.totalProjectCost ?? 0, latestEstimate.currency ?? 'USD')}</div>
                {(typeof latestEstimate.bidLowTotal === 'number' || typeof latestEstimate.bidHighTotal === 'number') && (
                  <div><strong>Bid range:</strong> {formatCurrency(latestEstimate.bidLowTotal ?? 0, latestEstimate.currency ?? 'USD')} - {formatCurrency(latestEstimate.bidHighTotal ?? 0, latestEstimate.currency ?? 'USD')}</div>
                )}
                {latestEstimate.confidenceLevel && (
                  <div><strong>Confidence:</strong> <ConfidenceBadge level={latestEstimate.confidenceLevel} />{latestEstimate.confidenceReason ? ` — ${latestEstimate.confidenceReason}` : ''}</div>
                )}
                {latestEstimate.generatedAt && (
                  <div><strong>Generated:</strong> {new Date(latestEstimate.generatedAt).toLocaleString()}</div>
                )}
              </div>
              {(latestEstimate.lineItems ?? []).length > 0 && (
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Location</th>
                      <th>Category</th>
                      <th>Issue</th>
                      <th>Labor</th>
                      <th>Materials</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(latestEstimate.lineItems ?? []).map((line: any) => (
                      <tr key={line.id ?? line.itemDescription}>
                        <td>{line.itemDescription}</td>
                        <td>{line.location}</td>
                        <td>{line.category}</td>
                        <td>{line.issueType}</td>
                        <td>{formatCurrency(line.laborCost ?? 0, latestEstimate.currency ?? 'USD')}</td>
                        <td>{formatCurrency(line.materialCost ?? 0, latestEstimate.currency ?? 'USD')}</td>
                        <td>{formatCurrency(line.totalCost ?? 0, latestEstimate.currency ?? 'USD')}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}

          {inspection.notes && (
            <div className="print-section print-card">
              <div className="print-section-title">Inspection Notes</div>
              <div className="print-text">{inspection.notes}</div>
            </div>
          )}

          <div className="print-section">
            <div className="print-section-title">Rooms & Checklist</div>
            {(inspection.rooms ?? []).map((room) => (
              <div key={room.id} className="print-card">
                <div className="print-room-title">{room.name} <span className="print-muted">({room.roomType})</span></div>
                <table className="print-table">
                  <thead>
                    <tr>
                      <th>Item</th>
                      <th>Category</th>
                      <th>Condition</th>
                      <th>Requires action</th>
                      <th>Severity</th>
                      <th>Issue type</th>
                      <th>Measurement</th>
                      <th>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(room.checklistItems ?? []).map((item) => (
                      <tr key={item.id}>
                        <td>{item.itemName}</td>
                        <td>{item.category}</td>
                        <td>{labelFromOptions(conditionOptions, item.condition ?? null)}</td>
                        <td>{item.requiresAction ? 'Yes' : 'No'}</td>
                        <td>{labelFromOptions(severityOptions, item.severity ?? null)}</td>
                        <td>{labelFromOptions(issueTypeOptions, item.issueType ?? null)}</td>
                        <td>
                          {typeof item.measurementValue === 'number'
                            ? `${item.measurementValue} ${labelFromOptions(measurementUnitOptions, item.measurementUnit ?? null)}`
                            : '—'}
                          {item.measurementNotes ? ` (${item.measurementNotes})` : ''}
                        </td>
                        <td>{item.notes || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </div>
      </div>
      </div>
    </>
  );
}
