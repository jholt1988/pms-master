import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../../../AuthContext';
import { apiFetch } from '../../../../services/apiClient';
import { Card, CardBody, Button, Select, SelectItem, Textarea } from '@nextui-org/react';
import { DegradedStateCard } from '../../../../components/ui/DegradedStateCard';
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
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [requestType, setRequestType] = useState<'MOVE_IN' | 'MOVE_OUT'>('MOVE_IN');
  const [requestNotes, setRequestNotes] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchInspections = React.useCallback(async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [resp, reqResp] = await Promise.all([
        apiFetch('/inspections', { token }),
        apiFetch('/inspections/requests', { token }).catch(() => []),
      ]);
      const list = unwrapApiList(resp);
      setInspections(list as any);
      setRequests(Array.isArray(reqResp) ? reqResp : ((reqResp as any)?.data ?? []));
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

  const submitRequest = async () => {
    if (!token) return;
    setRequestLoading(true);
    setError(null);
    try {
      await apiFetch('/inspections/requests', {
        token,
        method: 'POST',
        body: { type: requestType, notes: requestNotes || undefined },
      });
      setRequestNotes('');
      await fetchInspections();
    } catch (e: any) {
      setError(e?.message || 'Failed to submit request');
    } finally {
      setRequestLoading(false);
    }
  };

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

      <Card className="mb-4 bg-white/5 border border-white/10">
        <CardBody className="gap-3">
          <h3 className="font-semibold">Request move-in / move-out inspection</h3>
          <div className="grid gap-3 md:grid-cols-3">
            <Select
              label="Request type"
              selectedKeys={new Set([requestType])}
              onSelectionChange={(keys) => setRequestType((Array.from(keys)[0] as any) || 'MOVE_IN')}
            >
              <SelectItem key="MOVE_IN">Move-in</SelectItem>
              <SelectItem key="MOVE_OUT">Move-out</SelectItem>
            </Select>
            <div className="md:col-span-2">
              <Textarea
                label="Notes (optional)"
                value={requestNotes}
                onValueChange={setRequestNotes}
                minRows={1}
              />
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <Button color="primary" onPress={submitRequest} isLoading={requestLoading}>Submit request</Button>
            <span className="text-xs text-gray-500">Latest request: {requests?.[0]?.status ?? 'None'}</span>
          </div>
        </CardBody>
      </Card>

      {loading && (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <div className="w-8 h-8 border-2 border-neon-blue/30 border-t-neon-blue rounded-full animate-spin"></div>
          <p className="text-sm text-gray-500">Loading inspections...</p>
        </div>
      )}

      {error && (
        <div className="mb-6">
          <DegradedStateCard
            title="Inspections are temporarily unavailable"
            message={error}
            onRetry={fetchInspections}
            supportHint="You can continue using Dashboard, Payments, Maintenance, and Messaging while inspections reload."
          />
        </div>
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
