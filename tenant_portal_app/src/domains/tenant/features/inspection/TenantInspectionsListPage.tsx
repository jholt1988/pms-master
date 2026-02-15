import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../AuthContext';
import { apiFetch } from '../../../../services/apiClient';
import { Card, CardBody } from '@nextui-org/react';

interface Inspection {
  id: number;
  type: string;
  status: string;
  scheduledDate: string;
  completedDate: string | null;
  notes: string | null;
  unit?: { id: string; name: string; property?: { name: string } };
}

function unwrapApiList(resp: any): any[] {
  if (!resp) return [];
  if (Array.isArray(resp)) return resp;
  if (typeof resp === 'object') {
    const c = (resp as any).data ?? (resp as any).items ?? (resp as any).inspections;
    return Array.isArray(c) ? c : [];
  }
  return [];
}

function typeLabel(type: string) {
  return String(type).replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (m) => m.toUpperCase());
}

export default function TenantInspectionsListPage(): React.ReactElement {
  const { token } = useAuth();
  const navigate = useNavigate();

  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchInspections = React.useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resp = await apiFetch('/inspections', { token });
      const list = unwrapApiList(resp);
      setInspections(list as any);
    } catch (e: any) {
      setError(e?.message || 'Failed to load inspections');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  const sorted = useMemo(() => {
    return [...inspections].sort((a, b) => {
      const ad = a?.scheduledDate ? new Date(a.scheduledDate).getTime() : 0;
      const bd = b?.scheduledDate ? new Date(b.scheduledDate).getTime() : 0;
      return bd - ad;
    });
  }, [inspections]);

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold mb-4">Inspections</h1>

      {loading && <p className="text-sm text-foreground-500">Loading inspections…</p>}
      {error && (
        <Card className="border border-rose-200 mb-4">
          <CardBody>
            <p className="text-sm text-rose-700">{error}</p>
          </CardBody>
        </Card>
      )}

      {!loading && !error && sorted.length === 0 && (
        <Card>
          <CardBody>
            <p className="text-sm text-foreground-600">No inspections found for your unit.</p>
          </CardBody>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {sorted.map((i) => (
          <Card
            key={i.id}
            className="cursor-pointer hover:border-white/30"
            onClick={() => navigate(`/tenant/inspections/${i.id}`)}
          >
            <CardBody className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold">{typeLabel(i.type)}</p>
                <span className="text-xs text-foreground-500">{i.status}</span>
              </div>
              <p className="text-xs text-foreground-500">
                Scheduled: {i.scheduledDate ? new Date(i.scheduledDate).toLocaleString() : '—'}
              </p>
              {i.completedDate && (
                <p className="text-xs text-foreground-500">
                  Completed: {new Date(i.completedDate).toLocaleString()}
                </p>
              )}
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
