import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardBody, Divider, Textarea } from '@nextui-org/react';
import { useAuth } from '../../../../AuthContext';
import { apiFetch } from '../../../../services/apiClient';

function unwrapApi<T>(resp: any): T {
  if (resp && typeof resp === 'object' && 'data' in resp) return (resp as any).data as T;
  return resp as T;
}

type InspectionCondition = 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'DAMAGED' | 'NON_FUNCTIONAL';

const conditionOptions: Array<{ value: InspectionCondition; label: string }> = [
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'NON_FUNCTIONAL', label: 'Non-functional' },
];

function typeLabel(type: string) {
  return String(type).replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function TenantInspectionDetailPage(): React.ReactElement {
  const { token } = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();

  const inspectionId = Number(id);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inspection, setInspection] = useState<any | null>(null);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [startLoading, setStartLoading] = useState(false);
  const [requestStatus, setRequestStatus] = useState<string | null>(null);
  const [saveLoadingByRoomId, setSaveLoadingByRoomId] = useState<Record<number, boolean>>({});
  const [draftByItemId, setDraftByItemId] = useState<Record<number, { requiresAction: boolean; notes: string; condition: InspectionCondition | '' }>>({});

  const status = String(inspection?.status ?? '');
  const isCompleted = status === 'COMPLETED';
  const isLockedForTenant = status !== 'IN_PROGRESS' && !isCompleted;

  const canStart = useMemo(() => {
    const t = String(inspection?.type ?? '');
    return status === 'SCHEDULED' && requestStatus === 'APPROVED' && (t === 'MOVE_IN' || t === 'MOVE_OUT');
  }, [inspection, status, requestStatus]);

  const canComplete = useMemo(() => {
    const t = String(inspection?.type ?? '');
    return status === 'IN_PROGRESS' && !isCompleted && (t === 'MOVE_IN' || t === 'MOVE_OUT');
  }, [inspection, isCompleted, status]);

  const fetchInspection = React.useCallback(async () => {
    if (!token || !Number.isFinite(inspectionId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [resp, reqResp] = await Promise.all([
        apiFetch(`/inspections/${inspectionId}`, { token }),
        apiFetch('/inspections/requests', { token }).catch(() => []),
      ]);
      const data = unwrapApi(resp);
      setInspection(data);
      const requests = Array.isArray(reqResp) ? reqResp : ((reqResp as any)?.data ?? []);
      const matching = (requests as any[])
        .filter((r) => Number(r?.startedInspectionId ?? -1) === inspectionId || (r?.type === data?.type && r?.unitId === data?.unitId))
        .sort((a, b) => new Date(b?.createdAt ?? 0).getTime() - new Date(a?.createdAt ?? 0).getTime());
      setRequestStatus(matching[0]?.status ?? null);
    } catch (e: any) {
      setError(e?.message || 'Failed to load inspection');
    } finally {
      setLoading(false);
    }
  }, [token, inspectionId]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

  // Initialize draft map when inspection loads/changes
  useEffect(() => {
    const rooms = inspection?.rooms;
    if (!Array.isArray(rooms)) return;

    const next: Record<number, { requiresAction: boolean; notes: string; condition: InspectionCondition | '' }> = {};
    for (const r of rooms) {
      for (const it of (r?.checklistItems ?? [])) {
        if (!it?.id) continue;
        next[Number(it.id)] = {
          requiresAction: !!it.requiresAction,
          notes: String(it.notes ?? ''),
          condition: (it.condition as InspectionCondition | null) ?? '',
        };
      }
    }
    setDraftByItemId(next);
  }, [inspection?.id]);

  const handleSaveRoom = async (roomId: number) => {
    if (!token) return;
    if (isCompleted) return;

    const room = (inspection?.rooms ?? []).find((r: any) => Number(r.id) === Number(roomId));
    if (!room) return;

    setSaveLoadingByRoomId((s) => ({ ...s, [roomId]: true }));
    setError(null);

    try {
      const items = (room.checklistItems ?? []).map((it: any) => {
        const d = draftByItemId[Number(it.id)] ?? { requiresAction: !!it.requiresAction, notes: String(it.notes ?? ''), condition: ((it.condition as InspectionCondition | null) ?? '') };
        return {
          itemId: Number(it.id),
          requiresAction: !!d.requiresAction,
          condition: d.condition || undefined,
          notes: String(d.notes ?? ''),
        };
      });

      await apiFetch(`/inspections/rooms/${roomId}/items`, {
        token,
        method: 'PATCH',
        body: items,
      });

      await fetchInspection();
    } catch (e: any) {
      setError(e?.message || 'Failed to save room');
    } finally {
      setSaveLoadingByRoomId((s) => ({ ...s, [roomId]: false }));
    }
  };

  const handleStartInspection = async () => {
    if (!token) return;
    setStartLoading(true);
    setError(null);

    try {
      const reqResp = await apiFetch('/inspections/requests', { token });
      const requests = Array.isArray(reqResp) ? reqResp : ((reqResp as any)?.data ?? []);
      const candidate = (requests as any[])
        .find((r) => r?.status === 'APPROVED' && r?.type === inspection?.type && r?.unitId === inspection?.unitId);
      if (!candidate?.id) throw new Error('No approved request found for this inspection');

      await apiFetch('/inspections/start', {
        token,
        method: 'POST',
        body: { requestId: Number(candidate.id) },
      });
      await fetchInspection();
    } catch (e: any) {
      setError(e?.message || 'Failed to start inspection');
    } finally {
      setStartLoading(false);
    }
  };

  const handleMarkCompleted = async () => {
    if (!token) return;
    setCompleteLoading(true);
    setError(null);

    try {
      await apiFetch(`/inspections/${inspectionId}/status`, {
        token,
        method: 'PATCH',
        body: { status: 'COMPLETED' },
      });
      await fetchInspection();
    } catch (e: any) {
      setError(e?.message || 'Failed to mark completed');
    } finally {
      setCompleteLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between gap-3 mb-4">
        <Button variant="flat" onClick={() => navigate('/tenant/inspections')}>
          Back
        </Button>
        <div className="text-right">
          <div className="text-xs text-foreground-500">Status</div>
          <div className="text-sm font-semibold">{status || '—'}</div>
        </div>
      </div>

      {loading && <p className="text-sm text-foreground-500">Loading inspection…</p>}
      {error && (
        <Card className="border border-rose-200 mb-4">
          <CardBody>
            <p className="text-sm text-rose-700">{error}</p>
          </CardBody>
        </Card>
      )}

      {!loading && inspection && (
        <Card>
          <CardBody className="flex flex-col gap-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-xs text-foreground-500">Type</div>
                <div className="text-lg font-semibold">{typeLabel(inspection.type)}</div>
              </div>
              <div className="flex items-center gap-2">
                {canStart && (
                  <Button color="primary" variant="flat" isLoading={startLoading} onClick={handleStartInspection}>
                    Start Inspection
                  </Button>
                )}
                {canComplete && (
                  <Button color="success" variant="flat" isLoading={completeLoading} onClick={handleMarkCompleted}>
                    Mark Completed
                  </Button>
                )}
              </div>
            </div>

            <div>
              <div className="text-xs text-foreground-500">Scheduled</div>
              <div className="text-sm">{inspection.scheduledDate ? new Date(inspection.scheduledDate).toLocaleString() : '—'}</div>
            </div>

            {inspection.completedDate && (
              <div>
                <div className="text-xs text-foreground-500">Completed</div>
                <div className="text-sm">{new Date(inspection.completedDate).toLocaleString()}</div>
              </div>
            )}

            {isCompleted && (
              <Card className="border border-emerald-200 bg-emerald-50/40">
                <CardBody>
                  <p className="text-sm text-emerald-800 font-semibold">Inspection completed and locked.</p>
                </CardBody>
              </Card>
            )}

            {!isCompleted && (
              <Card className="border border-sky-200 bg-sky-50/40">
                <CardBody>
                  <p className="text-sm text-sky-800 font-semibold">
                    Approval status: {requestStatus ?? 'No request found'}
                  </p>
                  <p className="text-xs text-sky-700 mt-1">
                    You can begin checklist edits only after a move-in/move-out request is approved and started.
                  </p>
                </CardBody>
              </Card>
            )}

            <Divider />

            {Array.isArray(inspection.rooms) && inspection.rooms.length > 0 ? (
              <div className="flex flex-col gap-4">
                {inspection.rooms.map((room: any) => (
                  <Card key={room.id} className="border border-white/10">
                    <CardBody className="flex flex-col gap-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{room.name}</p>
                          <p className="text-xs text-foreground-500">{room.roomType}</p>
                        </div>
                        <Button
                          size="sm"
                          variant="flat"
                          color="primary"
                          isDisabled={isLockedForTenant}
                          isLoading={!!saveLoadingByRoomId[Number(room.id)]}
                          onClick={() => handleSaveRoom(Number(room.id))}
                        >
                          Save
                        </Button>
                      </div>

                      <div className="flex flex-col gap-3">
                        {(room.checklistItems ?? []).map((it: any) => {
                          const d = draftByItemId[Number(it.id)] ?? { requiresAction: !!it.requiresAction, notes: String(it.notes ?? ''), condition: ((it.condition as InspectionCondition | null) ?? '') };
                          return (
                            <div key={it.id} className="border border-white/10 rounded-lg p-3">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-semibold">{it.itemName}</p>
                              </div>

                              <div className="mt-2 grid gap-2 md:grid-cols-2">
                                <label className="text-xs text-foreground-500">Condition</label>
                                <label className="text-xs text-foreground-500">Needs attention</label>
                                <select
                                  className="rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900"
                                  disabled={isLockedForTenant}
                                  value={d.condition}
                                  onChange={(e) =>
                                    setDraftByItemId((s) => ({
                                      ...s,
                                      [Number(it.id)]: { ...d, condition: e.target.value as InspectionCondition | '' },
                                    }))
                                  }
                                >
                                  <option value="">Select condition</option>
                                  {conditionOptions.map((opt) => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>

                                <select
                                  className="rounded border border-gray-300 bg-white px-2 py-2 text-sm text-gray-900"
                                  disabled={isLockedForTenant}
                                  value={d.requiresAction ? 'YES' : 'NO'}
                                  onChange={(e) =>
                                    setDraftByItemId((s) => ({
                                      ...s,
                                      [Number(it.id)]: { ...d, requiresAction: e.target.value === 'YES' },
                                    }))
                                  }
                                >
                                  <option value="NO">No</option>
                                  <option value="YES">Yes</option>
                                </select>
                              </div>

                              <Textarea
                                label="Notes"
                                placeholder="Add notes…"
                                value={String(d.notes ?? '')}
                                isDisabled={isLockedForTenant}
                                onValueChange={(v) =>
                                  setDraftByItemId((s) => ({
                                    ...s,
                                    [Number(it.id)]: { ...d, notes: v },
                                  }))
                                }
                                minRows={2}
                                className="mt-2"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </CardBody>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-sm text-foreground-500">No rooms found for this inspection.</p>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
