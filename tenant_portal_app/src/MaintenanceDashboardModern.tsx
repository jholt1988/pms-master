import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';
import { StatsCard, FilterBar, MaintenanceRequestCard, PageHeader } from './components/ui';
import { Card, CardBody, Button, Select, SelectItem, Spinner } from '@nextui-org/react';

type StatusValue = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
type PriorityValue = 'EMERGENCY' | 'HIGH' | 'MEDIUM' | 'LOW';

interface MaintenanceEntitySummary {
  id: number;
  name: string;
}

interface MaintenanceAsset extends MaintenanceEntitySummary {
  category: string;
  propertyId: number;
  unitId?: number | null;
}

interface MaintenanceRequestNote {
  id: number;
  body: string;
  createdAt: string;
  author?: {
    username: string;
  } | null;
}

interface MaintenanceRequestHistoryEntry {
  id: number;
  createdAt: string;
  fromStatus?: StatusValue | null;
  toStatus?: StatusValue | null;
  note?: string | null;
  changedBy?: {
    username: string;
  } | null;
  fromAssignee?: MaintenanceEntitySummary | null;
  toAssignee?: MaintenanceEntitySummary | null;
}

interface MaintenanceSlaPolicySummary {
  id: number;
  name?: string | null;
  responseTimeMinutes?: number | null;
  resolutionTimeMinutes: number;
}

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  status: StatusValue;
  priority: PriorityValue;
  createdAt: string;
  dueDateSla?: string | null;
  tenant?: {
    id: number;
    username?: string | null;
  } | null;
  property?: {
    id: number;
    name: string;
  } | null;
  unit?: {
    id: number;
    name: string;
  } | null;
  assignee?: MaintenanceEntitySummary | null;
  asset?: MaintenanceAsset | null;
  slaPolicy?: MaintenanceSlaPolicySummary | null;
  notes?: MaintenanceRequestNote[];
  history?: MaintenanceRequestHistoryEntry[];
}

interface PropertySummary {
  id: number;
  name: string;
  units: Array<{ id: number; name: string }>;
}

interface Technician {
  id: number;
  name: string;
}

interface ManagerFilters {
  status: string;
  priority: string;
  propertyId: string;
  unitId: string;
  assigneeId: string;
}

interface RequestsResponse {
  requests: MaintenanceRequest[];
  totalCount: number;
  pageCount: number;
}

const priorityOptions = [
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const statusOptions = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

const MaintenanceDashboardModern = () => {
  const { token, user } = useAuth();
  const canManageRequests = user?.role === 'PROPERTY_MANAGER';

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [lastFetchCount, setLastFetchCount] = useState(0);

  const [filters, setFilters] = useState<ManagerFilters>({
    status: '',
    priority: '',
    propertyId: '',
    unitId: '',
    assigneeId: '',
  });

  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});

  // Calculate stats from requests
  const stats = useMemo(() => {
    const total = requests.length;
    const open = requests.filter(r => r.status !== 'COMPLETED').length;
    const overdue = requests.filter(r => {
      if (!r.dueDateSla || r.status === 'COMPLETED') return false;
      return new Date(r.dueDateSla) < new Date();
    }).length;

    return { total, open, overdue };
  }, [requests]);

  const filterUnits = useMemo(() => {
    if (!filters.propertyId) return [];
    const property = properties.find(p => p.id === Number(filters.propertyId));
    return property?.units || [];
  }, [filters.propertyId, properties]);

  const fetchRequests = useCallback(async () => {
    if (!token) return;
    
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (canManageRequests) {
        if (filters.status) params.set('status', filters.status);
        if (filters.priority) params.set('priority', filters.priority);
        if (filters.propertyId) params.set('propertyId', filters.propertyId);
        if (filters.unitId) params.set('unitId', filters.unitId);
        if (filters.assigneeId) params.set('assigneeId', filters.assigneeId);
        params.set('page', String(page));
        params.set('pageSize', String(pageSize));
      }

      const url = params.toString() ? `/api/maintenance?${params.toString()}` : '/api/maintenance';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Failed to fetch maintenance requests');
      }

      const data: RequestsResponse = await response.json();
      setRequests(data.requests || []);
      setLastFetchCount(data.requests?.length || 0);
    } catch (err) {
      console.error('Error fetching maintenance requests:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch maintenance requests');
    } finally {
      setLoading(false);
      setIsInitialLoading(false);
    }
  }, [token, canManageRequests, filters, page, pageSize]);

  const fetchTechnicians = useCallback(async () => {
    if (!token || !canManageRequests) return;

    try {
      const response = await fetch('/maintenance/technicians', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setTechnicians(await response.json());
      }
    } catch (err) {
      console.error('Error fetching technicians:', err);
    }
  }, [token, canManageRequests]);

  const fetchProperties = useCallback(async () => {
    if (!token || !canManageRequests) return;

    try {
      const response = await fetch('/api/properties', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        setProperties(await response.json());
      }
    } catch (err) {
      console.error('Error fetching properties:', err);
    }
  }, [token, canManageRequests]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    fetchTechnicians();
    fetchProperties();
  }, [fetchTechnicians, fetchProperties]);

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleStatusUpdate = async (requestId: number, status: string) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/maintenance/${requestId}/status`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status }),
      });

      if (!response.ok) {
        throw new Error('Failed to update status');
      }

      await fetchRequests();
    } catch (err) {
      console.error('Error updating status:', err);
      setError(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  const handleAssigneeUpdate = async (requestId: number, assigneeId: string) => {
    if (!token) return;

    try {
      const response = await fetch(`/api/maintenance/${requestId}/assign`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ assigneeId: assigneeId || null }),
      });

      if (!response.ok) {
        throw new Error('Failed to update assignee');
      }

      await fetchRequests();
    } catch (err) {
      console.error('Error updating assignee:', err);
      setError(err instanceof Error ? err.message : 'Failed to update assignee');
    }
  };

  const handleNoteChange = (requestId: number, note: string) => {
    setNoteDrafts(prev => ({ ...prev, [requestId]: note }));
  };

  const handleNoteSubmit = async (requestId: number) => {
    if (!token) return;
    
    const note = noteDrafts[requestId]?.trim();
    if (!note) return;

    try {
      const response = await fetch(`/api/maintenance/${requestId}/notes`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ body: note }),
      });

      if (!response.ok) {
        throw new Error('Failed to add note');
      }

      setNoteDrafts(prev => ({ ...prev, [requestId]: '' }));
      await fetchRequests();
    } catch (err) {
      console.error('Error adding note:', err);
      setError(err instanceof Error ? err.message : 'Failed to add note');
    }
  };

  if (!token) {
    return (
      <div className="p-4">
        <Card>
          <CardBody className="text-center">
            Please sign in to view maintenance requests.
          </CardBody>
        </Card>
      </div>
    );
  }

  const breadcrumbs = [
    { label: 'Dashboard', href: '/' },
    { label: 'Maintenance' }
  ];

  const filterConfigs = canManageRequests ? [
    {
      name: 'status',
      label: 'Status',
      value: filters.status,
      options: statusOptions,
      onChange: handleFilterChange,
    },
    {
      name: 'priority',
      label: 'Priority', 
      value: filters.priority,
      options: priorityOptions,
      onChange: handleFilterChange,
    },
    {
      name: 'propertyId',
      label: 'Property',
      value: filters.propertyId,
      options: properties.map(p => ({ value: String(p.id), label: p.name })),
      onChange: handleFilterChange,
    },
    {
      name: 'unitId',
      label: 'Unit',
      value: filters.unitId,
      options: filterUnits.map(u => ({ value: String(u.id), label: u.name })),
      disabled: filterUnits.length === 0,
      onChange: handleFilterChange,
    },
    {
      name: 'assigneeId',
      label: 'Assignee',
      value: filters.assigneeId,
      options: technicians.map(t => ({ value: String(t.id), label: t.name })),
      onChange: handleFilterChange,
    },
  ] : [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Maintenance Operations"
        subtitle="Track open issues, dispatch technicians, and keep residents informed of progress."
        breadcrumbs={breadcrumbs}
      />

      {error && (
        <Card className="border-danger-200 bg-danger-50">
          <CardBody>
            <p className="text-sm text-danger-700">{error}</p>
          </CardBody>
        </Card>
      )}

      {/* Stats Cards */}
      <section className="grid gap-4 sm:grid-cols-3">
        <StatsCard
          title="Active Requests"
          value={stats.total.toString()}
          valueColor="default"
        />
        <StatsCard
          title="Awaiting Resolution"
          value={stats.open.toString()}
          valueColor="warning"
        />
        <StatsCard
          title="Overdue"
          value={stats.overdue.toString()}
          valueColor="danger"
        />
      </section>

      {/* Filter Bar */}
      {canManageRequests && (
        <FilterBar
          title="Filter Queue"
          description="Slice by status, priority, and property."
          filters={filterConfigs}
        />
      )}

      {/* Request Queue */}
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Request Queue</h2>
            {canManageRequests && (
              <div className="flex items-center gap-3 text-sm text-foreground-600">
                <label className="flex items-center gap-1">
                  Page size
                  <Select
                    size="sm"
                    selectedKeys={[String(pageSize)]}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setPage(1);
                    }}
                    className="w-20"
                  >
                    {[5, 10, 25].map((size) => (
                      <SelectItem key={size} value={String(size)}>
                        {size}
                      </SelectItem>
                    ))}
                  </Select>
                </label>
                <span className="text-xs text-foreground-400">Page {page}</span>
              </div>
            )}
          </div>

          {isInitialLoading ? (
            <Card className="border-dashed">
              <CardBody className="py-12 text-center">
                <Spinner size="lg" />
                <p className="mt-4 text-sm text-foreground-500">Loading maintenance requests…</p>
              </CardBody>
            </Card>
          ) : requests.length === 0 ? (
            <Card className="border-dashed">
              <CardBody className="py-12 text-center">
                <p className="text-sm text-foreground-500">No maintenance requests yet.</p>
              </CardBody>
            </Card>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const priorityLabel = priorityOptions.find(opt => opt.value === request.priority)?.label ?? request.priority;
                const statusLabel = statusOptions.find(opt => opt.value === request.status)?.label ?? request.status;
                const noteDraft = noteDrafts[request.id] ?? '';

                return (
                  <MaintenanceRequestCard
                    key={request.id}
                    request={request as any} // Cast to any to bypass the tenant type incompatibility
                    priorityLabel={priorityLabel}
                    statusLabel={statusLabel}
                    canManage={canManageRequests}
                    technicians={technicians}
                    statusOptions={statusOptions}
                    noteDraft={noteDraft}
                    onStatusUpdate={handleStatusUpdate}
                    onAssigneeUpdate={handleAssigneeUpdate}
                    onNoteChange={handleNoteChange}
                    onNoteSubmit={handleNoteSubmit}
                  />
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {canManageRequests && requests.length > 0 && lastFetchCount >= pageSize && (
            <div className="flex justify-center">
              <Button
                variant="ghost"
                onClick={() => setPage(prev => prev + 1)}
                isLoading={loading}
              >
                Load More
              </Button>
            </div>
          )}
        </section>

        {/* Sidebar could go here for additional tools */}
        <aside className="space-y-4">
          <Card>
            <CardBody>
              <h3 className="font-semibold text-foreground mb-2">Quick Actions</h3>
              <p className="text-sm text-foreground-500">
                Additional maintenance tools and reports will be available here.
              </p>
            </CardBody>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default MaintenanceDashboardModern;