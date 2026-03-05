import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../AuthContext';
import { apiFetch } from '../../../../services/apiClient';
import { Card, CardBody, Button } from '@nextui-org/react';
import { ClipboardList, Calendar } from 'lucide-react';

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
      // Gracefully handle 404 or empty states as "no inspections"
      if (e?.message?.includes('404')) {
        setInspections([]);
      } else {
        setError(e?.message || 'Failed to load inspections');
      }
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
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-neon-blue" />
            Inspections
          </h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            View upcoming and past property inspections
          </p>
        </div>
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-8 h-8 border-2 border-neon-blue/30 border-t-neon-blue rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Loading inspections...</p>
        </div>
      )}

      {error && (
        <Card className="border border-rose-500/20 bg-rose-500/5 mb-6">
          <CardBody className="flex flex-row items-center gap-4">
            <div className="p-2 bg-rose-500/10 rounded-full text-rose-500">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <p className="font-medium text-rose-700 dark:text-rose-400">Unable to load inspections</p>
              <p className="text-sm text-rose-600/80 dark:text-rose-400/80">{error}</p>
            </div>
            <Button size="sm" color="danger" variant="flat" className="ml-auto" onPress={() => fetchInspections()}>
              Retry
            </Button>
          </CardBody>
        </Card>
      )}

      {!loading && !error && sorted.length === 0 && (
        <Card className="bg-white/5 border-none">
          <CardBody className="flex flex-col items-center justify-center py-12 text-center">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No Inspections Scheduled</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mb-6">
              There are no move-in, move-out, or routine inspections scheduled for your unit at this time.
            </p>
            <Button 
              color="primary" 
              variant="flat"
              onPress={() => navigate('/dashboard')}
            >
              Return to Dashboard
            </Button>
          </CardBody>
        </Card>
      )}

      <div className="grid gap-4">
        {sorted.map((i) => (
          <Card
            key={i.id}
            isPressable
            onPress={() => navigate(`/tenant/inspections/${i.id}`)}
            className="border border-white/10 hover:border-neon-blue/50 transition-colors bg-white/5"
          >
            <CardBody>
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className={`p-3 rounded-lg ${
                    i.status === 'COMPLETED' ? 'bg-success/10 text-success' : 
                    i.status === 'SCHEDULED' ? 'bg-primary/10 text-primary' : 
                    'bg-warning/10 text-warning'
                  }`}>
                    <ClipboardList className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg text-gray-900 dark:text-white">
                      {typeLabel(i.type)} Inspection
                    </h3>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {i.scheduledDate ? new Date(i.scheduledDate).toLocaleDateString() : 'Date TBD'}
                      </span>
                      {i.unit && (
                        <span>Unit {i.unit.name}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-xs font-medium border ${
                  i.status === 'COMPLETED' ? 'bg-success/10 text-success border-success/20' : 
                  i.status === 'SCHEDULED' ? 'bg-primary/10 text-primary border-primary/20' : 
                  'bg-warning/10 text-warning border-warning/20'
                }`}>
                  {i.status}
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
