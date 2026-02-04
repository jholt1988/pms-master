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
} from '@nextui-org/react';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';

type InspectionStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
type InspectionCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'NON_FUNCTIONAL';

type ChecklistItem = {
  id: number;
  category: string;
  itemName: string;
  condition?: InspectionCondition | null;
  notes?: string | null;
  estimatedAge?: number | null;
  requiresAction: boolean;
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

function itemLabel(item: ChecklistItem) {
  return `${item.category}: ${item.itemName}`;
}

function shallowEqualDraft(a: DraftChecklistItem, b: DraftChecklistItem) {
  return (
    a.requiresAction === b.requiresAction &&
    (a.condition ?? null) === (b.condition ?? null) &&
    (a.notes ?? '') === (b.notes ?? '')
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

function EstimatePanel({ estimate, embedded = false }: { estimate: any; embedded?: boolean }) {
  const e = estimate as Estimate;
  const currency = e.currency ?? 'USD';

  const hasRange = typeof e.bidLowTotal === 'number' && typeof e.bidHighTotal === 'number';

  const body = (
    <div className={embedded ? 'flex flex-col gap-4' : 'flex flex-col gap-4'}>
      {(hasRange || e.confidenceLevel || e.confidenceReason) && (
        <div className="border border-default-200 rounded p-3">
          <div className="text-xs text-foreground-500 font-semibold mb-1">Bid explanation</div>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Stat label="Labor" value={formatCurrency(e.totalLaborCost ?? 0, currency)} />
        <Stat label="Materials" value={formatCurrency(e.totalMaterialCost ?? 0, currency)} />
        <Stat label="Items to repair" value={String(e.itemsToRepair ?? 0)} />
        <Stat label="Items to replace" value={String(e.itemsToReplace ?? 0)} />
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
                      Confidence: <span className="font-semibold">{li.confidenceLevel.replace('_', ' ')}</span>
                      {li.confidenceReason ? ` — ${li.confidenceReason}` : ''}
                    </div>
                  )}
                </div>

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

        <div className="ml-auto text-right">
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
      </CardHeader>
      <Divider />
      <CardBody className="flex flex-col gap-4">{body}</CardBody>
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-default-200 rounded p-3">
      <div className="text-xs text-foreground-500">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function EstimateHistoryList({ estimates }: { estimates: any[] }) {
  const sorted = [...(estimates ?? [])].sort((a, b) => {
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
  const { token } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const inspectionId = Number(params.id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspection, setInspection] = useState<InspectionDetail | null>(null);

  const [draftByRoom, setDraftByRoom] = useState<DraftByRoom>({});
  const [savingRoomId, setSavingRoomId] = useState<number | null>(null);
  const [roomErrors, setRoomErrors] = useState<Record<number, RoomSaveError[]>>({});

  const [estimateLoading, setEstimateLoading] = useState(false);
  const [estimateError, setEstimateError] = useState<string | null>(null);
  const [estimateResult, setEstimateResult] = useState<any | null>(null);

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
          };
        });
      });
      setDraftByRoom(initialDraft);
      setRoomErrors({});
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
      const current = room[itemId] ?? { requiresAction: false, condition: null, notes: '' };
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

  const validateRoom = useCallback((room: InspectionRoom): RoomSaveError[] => {
    const errors: RoomSaveError[] = [];
    const drafts = roomDrafts[room.id] ?? {};

    room.checklistItems.forEach((item) => {
      const draft = drafts[item.id];
      if (!draft) return;

      if (draft.requiresAction) {
        if (!draft.condition) {
          errors.push({
            itemId: item.id,
            itemLabel: itemLabel(item),
            reason: 'Condition is required when "Requires action" is enabled.',
          });
        }
        if (!draft.notes?.trim()) {
          errors.push({
            itemId: item.id,
            itemLabel: itemLabel(item),
            reason: 'Notes are required when "Requires action" is enabled.',
          });
        }
      }
    });

    return errors;
  }, [roomDrafts]);

  const getDirtyItemPatchesForRoom = useCallback((room: InspectionRoom) => {
    const drafts = roomDrafts[room.id] ?? {};
    const patches: Array<{ itemId: number; requiresAction: boolean; condition?: InspectionCondition | null; notes?: string }> = [];

    room.checklistItems.forEach((item) => {
      const draft = drafts[item.id];
      if (!draft) return;

      const baseline: DraftChecklistItem = {
        requiresAction: !!item.requiresAction,
        condition: (item.condition ?? null) as any,
        notes: (item.notes ?? '') ?? '',
      };

      if (!shallowEqualDraft(draft, baseline)) {
        patches.push({
          itemId: item.id,
          requiresAction: !!draft.requiresAction,
          condition: (draft.condition ?? null) as any,
          notes: draft.notes,
        });
      }
    });

    return patches;
  }, [roomDrafts]);

  const saveRoom = useCallback(async (room: InspectionRoom) => {
    if (!inspection) return;

    setEstimateError(null);

    // Validate whole room before any network calls.
    const validationErrors = validateRoom(room);
    if (validationErrors.length > 0) {
      setRoomErrors((prev) => ({ ...prev, [room.id]: validationErrors }));
      return;
    }

    const patches = getDirtyItemPatchesForRoom(room);
    if (patches.length === 0) {
      setRoomErrors((prev) => ({ ...prev, [room.id]: [] }));
      return;
    }

    setSavingRoomId(room.id);
    setRoomErrors((prev) => ({ ...prev, [room.id]: [] }));

    try {
      // Atomic per-room save via backend transaction endpoint
      await apiFetch(`/inspections/rooms/${room.id}/items`, {
        token: token ?? undefined,
        method: 'PATCH',
        body: { items: patches },
      });

      // Re-fetch inspection to sync, then preserve drafts for other rooms.
      await fetchInspection();
    } catch (err: any) {
      const reason = err.message ?? 'Save failed';
      // All-or-nothing, but show item-level failures: since backend is transactional,
      // any failure means none saved. We still attach the server error per item patch.
      const itemErrors: RoomSaveError[] = patches.map((p) => ({
        itemId: p.itemId,
        itemLabel: room.checklistItems.find((i) => i.id === p.itemId)
          ? itemLabel(room.checklistItems.find((i) => i.id === p.itemId)!)
          : `Item ${p.itemId}`,
        reason,
      }));
      setRoomErrors((prev) => ({ ...prev, [room.id]: itemErrors }));
    } finally {
      setSavingRoomId(null);
    }
  }, [estimateError, fetchInspection, getDirtyItemPatchesForRoom, inspection, token, validateRoom]);

  const generateEstimate = useCallback(async () => {
    if (!inspection) return;

    setEstimateLoading(true);
    setEstimateError(null);
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
      setEstimateError(err.message ?? 'Failed to generate estimate');
    } finally {
      setEstimateLoading(false);
    }
  }, [fetchInspection, inspection, token]);

  const headerTitle = useMemo(() => {
    if (!inspection) return 'Inspection';
    const prop = inspection.property?.name ?? 'Property';
    const unit = inspection.unit?.name ? ` · ${inspection.unit.name}` : '';
    return `${prop}${unit}`;
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
          <Button isIconOnly variant="light" onClick={() => navigate(-1)}>
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
        <p className="text-sm text-foreground-500">No inspection found.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <Button isIconOnly variant="light" onClick={() => navigate(-1)}>
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
          <Button
            color="primary"
            onClick={generateEstimate}
            isLoading={estimateLoading}
          >
            Generate Estimate
          </Button>
        </div>
      </div>

      {estimateError && (
        <Card className="mb-4 border border-rose-200">
          <CardBody>
            <p className="text-sm text-rose-700">{estimateError}</p>
          </CardBody>
        </Card>
      )}

      {/* If we just generated an estimate this session, show it first */}
      {estimateResult && (
        <EstimatePanel estimate={estimateResult} />
      )}

      {/* Full history list from inspection.repairEstimates */}
      <EstimateHistoryList estimates={(inspection.repairEstimates ?? []) as any[]} />

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
        {(inspection.rooms ?? []).map((room) => {
          const drafts = roomDrafts[room.id] ?? {};
          const dirtyCount = room.checklistItems.reduce((count, item) => {
            const d = drafts[item.id];
            if (!d) return count;
            const baseline: DraftChecklistItem = {
              requiresAction: !!item.requiresAction,
              condition: (item.condition ?? null) as any,
              notes: (item.notes ?? '') ?? '',
            };
            return count + (shallowEqualDraft(d, baseline) ? 0 : 1);
          }, 0);

          const errorsForRoom = roomErrors[room.id] ?? [];
          const isSaving = savingRoomId === room.id;

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
                    <Button
                      color="success"
                      variant="flat"
                      onClick={() => saveRoom(room)}
                      isLoading={isSaving}
                      isDisabled={dirtyCount === 0 || isSaving}
                    >
                      Save Room
                    </Button>
                  </div>
                </div>
                {errorsForRoom.length > 0 && (
                  <div className="w-full text-sm text-rose-700">
                    <div className="font-semibold mb-1">Save failed:</div>
                    <ul className="list-disc pl-5">
                      {errorsForRoom.map((e) => (
                        <li key={`${e.itemId}-${e.reason}`}>
                          <span className="font-medium">{e.itemLabel}</span>: {e.reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardHeader>

              <Divider />

              <CardBody className="flex flex-col gap-4">
                {(room.checklistItems ?? []).map((item) => {
                  const draft = drafts[item.id] ?? {
                    requiresAction: !!item.requiresAction,
                    condition: (item.condition ?? null) as any,
                    notes: (item.notes ?? '') ?? '',
                  };

                  return (
                    <div key={item.id} className="p-3 rounded border border-default-200">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <div className="text-sm font-semibold">{item.itemName}</div>
                          <div className="text-xs text-foreground-500">{item.category}</div>
                        </div>
                        <div className="ml-auto flex items-center gap-3">
                          <Switch
                            isSelected={draft.requiresAction}
                            onValueChange={(v) =>
                              onDraftChange(room.id, item.id, v
                                ? { requiresAction: true }
                                : { requiresAction: false, condition: null, notes: '' })
                            }
                            size="sm"
                          >
                            Requires action
                          </Switch>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <Select
                          label="Condition"
                          selectedKeys={draft.condition ? new Set([draft.condition]) : new Set()}
                          onSelectionChange={(keys) => {
                            const value = Array.from(keys)[0] as any;
                            onDraftChange(room.id, item.id, { condition: (value || null) as any });
                          }}
                          isDisabled={!draft.requiresAction}
                          placeholder="Select condition"
                        >
                          {conditionOptions.map((opt) => (
                            <SelectItem key={opt.key}>{opt.label}</SelectItem>
                          ))}
                        </Select>

                        <div />

                        <div className="md:col-span-2">
                          <Textarea
                            label="Notes"
                            placeholder="Describe the issue, symptoms, and any context…"
                            value={draft.notes}
                            onValueChange={(v) => onDraftChange(room.id, item.id, { notes: v })}
                            isDisabled={!draft.requiresAction}
                            minRows={2}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </CardBody>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
