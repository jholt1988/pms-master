import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Card, CardBody } from '@nextui-org/react';
import { useAuth } from '../../../../AuthContext';
import { apiFetch } from '../../../../services/apiClient';

function unwrapApi<T>(resp: any): T {
  if (resp && typeof resp === 'object' && 'data' in resp) return (resp as any).data as T;
  return resp as T;
}

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

  const status = String(inspection?.status ?? '');
  const isCompleted = status === 'COMPLETED';

  const canComplete = useMemo(() => {
    const t = String(inspection?.type ?? '');
    return !isCompleted && (t === 'MOVE_IN' || t === 'MOVE_OUT');
  }, [inspection, isCompleted]);

  const fetchInspection = React.useCallback(async () => {
    if (!token || !Number.isFinite(inspectionId)) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await apiFetch(`/inspections/${inspectionId}`, { token });
      setInspection(unwrapApi(resp));
    } catch (e: any) {
      setError(e?.message || 'Failed to load inspection');
    } finally {
      setLoading(false);
    }
  }, [token, inspectionId]);

  useEffect(() => {
    fetchInspection();
  }, [fetchInspection]);

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
          <CardBody className="flex flex-col gap-3">
            <div>
              <div className="text-xs text-foreground-500">Type</div>
              <div className="text-lg font-semibold">{typeLabel(inspection.type)}</div>
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

            {canComplete && (
              <Button color="success" variant="flat" isLoading={completeLoading} onClick={handleMarkCompleted}>
                Mark Completed
              </Button>
            )}

            {isCompleted && (
              <Card className="border border-emerald-200 bg-emerald-50/40">
                <CardBody>
                  <p className="text-sm text-emerald-800 font-semibold">Inspection completed and locked.</p>
                </CardBody>
              </Card>
            )}
          </CardBody>
        </Card>
      )}
    </div>
  );
}
