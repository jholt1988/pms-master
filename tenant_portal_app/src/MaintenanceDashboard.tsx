import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from './AuthContext';

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
    username?: string | null;
  } | null;
}

interface MaintenanceRequestHistoryEntry {
  id: number;
  createdAt: string;
  fromStatus?: StatusValue | null;
  toStatus?: StatusValue | null;
  note?: string | null;
  changedBy?: {
    username?: string | null;
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
  updatedAt: string;
  responseDueAt?: string | null;
  dueAt?: string | null;
  acknowledgedAt?: string | null;
  completedAt?: string | null;
  author?: {
    username?: string | null;
  } | null;
  property?: MaintenanceEntitySummary | null;
  unit?: MaintenanceEntitySummary | null;
  asset?: MaintenanceAsset | null;
  assignee?: MaintenanceEntitySummary | null;
  slaPolicy?: MaintenanceSlaPolicySummary | null;
  notes?: MaintenanceRequestNote[];
  history?: MaintenanceRequestHistoryEntry[];
}

interface Technician extends MaintenanceEntitySummary {
  role: string;
  phone?: string | null;
  email?: string | null;
}

interface PropertySummary extends MaintenanceEntitySummary {
  units: Array<{
    id: number;
    name: string;
  }>;
}

interface ManagerFilters {
  status: string;
  priority: string;
  propertyId: string;
  unitId: string;
  assigneeId: string;
}

const statusOptions: Array<{ value: StatusValue; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
];

const priorityOptions: Array<{ value: PriorityValue; label: string }> = [
  { value: 'EMERGENCY', label: 'Emergency' },
  { value: 'HIGH', label: 'High' },
  { value: 'MEDIUM', label: 'Medium' },
  { value: 'LOW', label: 'Low' },
];

const statusBadgeClasses: Record<StatusValue, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  IN_PROGRESS: 'bg-sky-100 text-sky-700',
  COMPLETED: 'bg-emerald-100 text-emerald-700',
};

const priorityBadgeClasses: Record<PriorityValue, string> = {
  EMERGENCY: 'bg-rose-100 text-rose-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-indigo-100 text-indigo-700',
  LOW: 'bg-gray-100 text-gray-600',
};

const formatDateTime = (value?: string | null): string => {
  if (!value) {
    return '—';
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '—';
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
};

const formatRelativeDue = (value?: string | null): string => {
  if (!value) {
    return 'No SLA';
  }
  const date = new Date(value);
  const now = new Date();
  if (Number.isNaN(date.getTime())) {
    return 'No SLA';
  }
  const diffMs = date.getTime() - now.getTime();
  const diffMinutes = Math.round(diffMs / (1000 * 60));
  const formatter = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(Math.round(diffMinutes), 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 48) {
    return formatter.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return formatter.format(diffDays, 'day');
};

const MaintenanceDashboard = () => {
  const { token, user } = useAuth();
  const canManageRequests = user?.role === 'PROPERTY_MANAGER';

  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(false);
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
  const [assetOptions, setAssetOptions] = useState<MaintenanceAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const [createForm, setCreateForm] = useState<{
    title: string;
    description: string;
    priority: PriorityValue;
    propertyId: string;
    unitId: string;
    assetId: string;
  }>({
    title: '',
    description: '',
    priority: 'MEDIUM',
    propertyId: '',
    unitId: '',
    assetId: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [assigningRequestId, setAssigningRequestId] = useState<number | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<number | null>(null);
  const [noteDrafts, setNoteDrafts] = useState<Record<number, string>>({});
  const [noteSubmittingId, setNoteSubmittingId] = useState<number | null>(null);

  const selectedCreateProperty = useMemo(() => {
    if (!createForm.propertyId) {
      return undefined;
    }
    const id = Number(createForm.propertyId);
    if (Number.isNaN(id)) {
      return undefined;
    }
    return properties.find((property) => property.id === id);
  }, [createForm.propertyId, properties]);

  const selectedFilterProperty = useMemo(() => {
    if (!filters.propertyId) {
      return undefined;
    }
    const id = Number(filters.propertyId);
    if (Number.isNaN(id)) {
      return undefined;
    }
    return properties.find((property) => property.id === id);
  }, [filters.propertyId, properties]);

  const fetchRequests = useCallback(async () => {
    if (!token) {
      return;
    }
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
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load maintenance requests');
      }

      const data = (await response.json()) as MaintenanceRequest[];
      setRequests(data);
      setLastFetchCount(data.length);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to load maintenance requests.');
    } finally {
      setLoading(false);
    }
  }, [
    token,
    canManageRequests,
    filters.status,
    filters.priority,
    filters.propertyId,
    filters.unitId,
    filters.assigneeId,
    page,
    pageSize,
  ]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!token || !canManageRequests) {
      return;
    }

    const loadTechnicians = async () => {
      try {
        const response = await fetch('/api/maintenance/technicians', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Failed to load technicians');
        }
        setTechnicians((await response.json()) as Technician[]);
      } catch (err) {
        console.error(err);
      }
    };

    const loadProperties = async () => {
      try {
        const endpoint = canManageRequests ? '/api/properties' : '/api/properties/public';
        const response = await fetch(endpoint, {
          headers: canManageRequests ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          throw new Error('Failed to load properties');
        }
        setProperties((await response.json()) as PropertySummary[]);
      } catch (err) {
        console.error(err);
      }
    };

    loadTechnicians();
    loadProperties();
  }, [token, canManageRequests]);

  useEffect(() => {
    if (!token || !canManageRequests) {
      return;
    }
    if (!createForm.propertyId) {
      setAssetOptions([]);
      return;
    }

    let active = true;
    const loadAssets = async () => {
      setLoadingAssets(true);
      try {
        const params = new URLSearchParams({ propertyId: createForm.propertyId });
        if (createForm.unitId) {
          params.set('unitId', createForm.unitId);
        }
        const response = await fetch(`/api/maintenance/assets?${params.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('Failed to load assets');
        }
        const payload = (await response.json()) as MaintenanceAsset[];
        if (active) {
          setAssetOptions(payload);
        }
      } catch (err) {
        console.error(err);
        if (active) {
          setAssetOptions([]);
        }
      } finally {
        if (active) {
          setLoadingAssets(false);
        }
      }
    };

    loadAssets();
    return () => {
      active = false;
    };
  }, [token, canManageRequests, createForm.propertyId, createForm.unitId]);

  const handleCreateChange = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setCreateForm((prev) => {
      if (name === 'propertyId') {
        return {
          ...prev,
          propertyId: value,
          unitId: '',
          assetId: '',
        };
      }
      if (name === 'unitId') {
        return {
          ...prev,
          unitId: value,
          assetId: '',
        };
      }
      return {
        ...prev,
        [name]: value,
      };
    });
  };

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const { name, value } = event.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
      ...(name === 'propertyId' ? { unitId: '' } : {}),
    }));
    setPage(1);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!token) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const payload: Record<string, unknown> = {
        title: createForm.title,
        description: createForm.description,
        priority: createForm.priority,
      };

      const propertyId = Number(createForm.propertyId);
      if (canManageRequests && propertyId) {
        payload.propertyId = propertyId;
      }
      const unitId = Number(createForm.unitId);
      if (canManageRequests && unitId) {
        payload.unitId = unitId;
      }
      const assetId = Number(createForm.assetId);
      if (canManageRequests && assetId) {
        payload.assetId = assetId;
      }

      const response = await fetch('/api/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to create maintenance request');
      }

      setCreateForm({
        title: '',
        description: '',
        priority: 'MEDIUM',
        propertyId: '',
        unitId: '',
        assetId: '',
      });
      setAssetOptions([]);
      await fetchRequests();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to create request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleStatusChange = async (id: number, status: StatusValue) => {
    if (!token || !canManageRequests) {
      return;
    }
    setUpdatingStatusId(id);
    try {
      const response = await fetch(`/api/maintenance/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error('Failed to update status');
      }
      await fetchRequests();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to update status.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  const handleAssign = async (id: number, technicianId: string) => {
    if (!token || !canManageRequests || !technicianId) {
      return;
    }
    const technicianNumeric = Number(technicianId);
    if (!technicianNumeric) {
      return;
    }
    setAssigningRequestId(id);
    try {
      const response = await fetch(`/api/maintenance/${id}/assign`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ technicianId: technicianNumeric }),
      });
      if (!response.ok) {
        throw new Error('Failed to assign technician');
      }
      await fetchRequests();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to assign technician.');
    } finally {
      setAssigningRequestId(null);
    }
  };

  const handlePrev = () => setPage((current) => Math.max(current - 1, 1));
  const handleNext = () => {
    if (lastFetchCount < pageSize) {
      return;
    }
    setPage((current) => current + 1);
  };

  const handleNoteDraftChange = (id: number, value: string) => {
    setNoteDrafts((prev) => ({
      ...prev,
      [id]: value,
    }));
  };

  const handleSubmitNote = async (id: number) => {
    if (!token) {
      return;
    }
    const draft = (noteDrafts[id] ?? '').trim();
    if (!draft) {
      return;
    }
    setNoteSubmittingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/maintenance/${id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ body: draft }),
      });
      if (!response.ok) {
        throw new Error('Failed to add note');
      }
      setNoteDrafts((prev) => {
        const { [id]: _removed, ...rest } = prev;
        return rest;
      });
      await fetchRequests();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unable to add maintenance note.');
    } finally {
      setNoteSubmittingId(null);
    }
  };

  const stats = useMemo(() => {
    const open = requests.filter((request) => request.status !== 'COMPLETED').length;
    const overdue = requests.filter((request) => {
      if (!request.dueAt) {
        return false;
      }
      return new Date(request.dueAt).getTime() < Date.now() && request.status !== 'COMPLETED';
    }).length;
    return { total: requests.length, open, overdue };
  }, [requests]);

  const isInitialLoading = loading && requests.length === 0;
  const filterUnits = selectedFilterProperty?.units ?? [];
  const createUnits = selectedCreateProperty?.units ?? [];

  if (!token) {
    return <div className="p-4">Please sign in to view maintenance requests.</div>;
  }

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold text-gray-900">Maintenance operations</h1>
        <p className="text-sm text-gray-600">
          Track open issues, dispatch technicians, and keep residents informed of progress.
        </p>
      </header>

      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}

      <section className="grid gap-4 sm:grid-cols-3">
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Active requests</p>
          <p className="mt-2 text-2xl font-semibold text-gray-900">{stats.total}</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Awaiting resolution</p>
          <p className="mt-2 text-2xl font-semibold text-amber-600">{stats.open}</p>
        </article>
        <article className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <p className="text-sm font-medium text-gray-500">Overdue</p>
          <p className="mt-2 text-2xl font-semibold text-rose-600">{stats.overdue}</p>
        </article>
      </section>

      {canManageRequests && (
        <section className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Filter queue</h2>
              <p className="mt-1 text-sm text-gray-500">Slice by status, priority, and property.</p>
            </div>
            <div className="flex flex-wrap gap-4">
              <label className="flex flex-col text-xs font-medium text-gray-700">
                Status
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="mt-1 w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All</option>
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs font-medium text-gray-700">
                Priority
                <select
                  name="priority"
                  value={filters.priority}
                  onChange={handleFilterChange}
                  className="mt-1 w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">All</option>
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs font-medium text-gray-700">
                Property
                <select
                  name="propertyId"
                  value={filters.propertyId}
                  onChange={handleFilterChange}
                  className="mt-1 w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Any</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs font-medium text-gray-700">
                Unit
                <select
                  name="unitId"
                  value={filters.unitId}
                  onChange={handleFilterChange}
                  disabled={filterUnits.length === 0}
                  className="mt-1 w-40 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                >
                  <option value="">Any</option>
                  {filterUnits.map((unit) => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-xs font-medium text-gray-700">
                Assignee
                <select
                  name="assigneeId"
                  value={filters.assigneeId}
                  onChange={handleFilterChange}
                  className="mt-1 w-44 rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="">Any</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>
        </section>
      )}

      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Request queue</h2>
            {canManageRequests && (
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <label className="flex items-center gap-1">
                  Page size
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      setPageSize(Number(event.target.value));
                      setPage(1);
                    }}
                    className="rounded-md border border-gray-300 px-2 py-1 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {[5, 10, 25].map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
                <span className="text-xs text-gray-400">Page {page}</span>
              </div>
            )}
          </div>

          {isInitialLoading ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
              Loading maintenance requests…
            </div>
          ) : requests.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-300 bg-white py-12 text-center text-sm text-gray-500">
              No maintenance requests yet.
            </div>
          ) : (
            <div className="space-y-4">
              {requests.map((request) => {
                const priorityLabel =
                  priorityOptions.find((option) => option.value === request.priority)?.label ?? request.priority;
                const statusLabel =
                  statusOptions.find((option) => option.value === request.status)?.label ?? request.status;
                const noteDraft = noteDrafts[request.id] ?? '';

                return (
                  <article
                    key={request.id}
                    className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900">{request.title}</h3>
                        <p className="mt-1 text-xs text-gray-500">
                          Ticket #{request.id} · Submitted {formatDateTime(request.createdAt)}
                        </p>
                        {request.author?.username && (
                          <p className="mt-0.5 text-xs text-gray-500">Reported by {request.author.username}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusBadgeClasses[request.status]}`}
                        >
                          {statusLabel}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${priorityBadgeClasses[request.priority]}`}
                        >
                          {priorityLabel}
                        </span>
                      </div>
                    </div>

                    {request.description && <p className="text-sm text-gray-700">{request.description}</p>}

                    <dl className="grid gap-3 text-xs text-gray-600 sm:grid-cols-3">
                      <div>
                        <dt className="font-medium text-gray-700">Location</dt>
                        <dd>
                          {request.property?.name ?? '—'}
                          {request.unit?.name ? ` · ${request.unit.name}` : ''}
                          {request.asset?.name ? ` · ${request.asset.name}` : ''}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-700">Due</dt>
                        <dd>
                          {formatDateTime(request.dueAt)}
                          <span className="block text-[11px] text-gray-500">{formatRelativeDue(request.dueAt)}</span>
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-700">Assigned to</dt>
                        <dd>{request.assignee?.name ?? 'Unassigned'}</dd>
                      </div>
                      {request.slaPolicy && (
                        <div>
                          <dt className="font-medium text-gray-700">SLA policy</dt>
                          <dd>{request.slaPolicy.name ?? `Policy #${request.slaPolicy.id}`}</dd>
                        </div>
                      )}
                      {request.responseDueAt && (
                        <div>
                          <dt className="font-medium text-gray-700">Response due</dt>
                          <dd>
                            {formatDateTime(request.responseDueAt)}
                            <span className="block text-[11px] text-gray-500">
                              {formatRelativeDue(request.responseDueAt)}
                            </span>
                          </dd>
                        </div>
                      )}
                    </dl>

                    {canManageRequests && (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <label className="text-xs font-medium text-gray-700">
                          Update status
                          <select
                            value={request.status}
                            onChange={(event) => handleStatusChange(request.id, event.target.value as StatusValue)}
                            disabled={updatingStatusId === request.id}
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label className="text-xs font-medium text-gray-700">
                          Assign technician
                          <select
                            value={request.assignee?.id ? String(request.assignee.id) : ''}
                            onChange={(event) => handleAssign(request.id, event.target.value)}
                            disabled={assigningRequestId === request.id}
                            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                          >
                            <option value="">Unassigned</option>
                            {technicians.map((tech) => (
                              <option key={tech.id} value={tech.id}>
                                {tech.name} – {tech.role}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>
                    )}

                    <section className="space-y-2 rounded border border-gray-200 bg-gray-50 p-3 text-xs text-gray-600">
                      <div className="flex items-center justify-between text-gray-700">
                        <span className="font-semibold">Recent notes</span>
                        <span>{request.notes?.length ?? 0}</span>
                      </div>
                      {request.notes && request.notes.length > 0 ? (
                        <ul className="space-y-2">
                          {request.notes.slice(0, 3).map((note) => (
                            <li key={note.id} className="rounded border border-gray-200 bg-white px-3 py-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-gray-700">
                                  {note.author?.username ?? 'System'}
                                </span>
                                <span className="text-[11px] text-gray-500">{formatDateTime(note.createdAt)}</span>
                              </div>
                              <p className="mt-1 text-[12px] text-gray-600">{note.body}</p>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-[12px] text-gray-500">No notes added yet.</p>
                      )}
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={noteDraft}
                          onChange={(event) => handleNoteDraftChange(request.id, event.target.value)}
                          placeholder="Add an update for tenants or technicians…"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <div className="flex justify-end">
                          <button
                            type="button"
                            onClick={() => handleSubmitNote(request.id)}
                            disabled={noteSubmittingId === request.id || noteDraft.trim().length === 0}
                            className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
                          >
                            {noteSubmittingId === request.id ? 'Saving…' : 'Add note'}
                          </button>
                        </div>
                      </div>
                    </section>

                    {request.history && request.history.length > 0 && (
                      <section className="space-y-2 text-xs text-gray-600">
                        <h4 className="font-semibold text-gray-700">Timeline</h4>
                        <ul className="space-y-2">
                          {request.history.slice(0, 4).map((entry) => (
                            <li key={entry.id} className="rounded border border-gray-200 px-3 py-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-semibold text-gray-700">
                                  {entry.fromStatus ?? '—'} → {entry.toStatus ?? '—'}
                                </span>
                                <span className="text-[11px] text-gray-500">{formatDateTime(entry.createdAt)}</span>
                              </div>
                              {entry.note && <p className="mt-1 text-[12px] text-gray-600">{entry.note}</p>}
                              <div className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-gray-500">
                                {entry.changedBy?.username && <span>By {entry.changedBy.username}</span>}
                                {entry.toAssignee?.name && <span>→ {entry.toAssignee.name}</span>}
                              </div>
                            </li>
                          ))}
                        </ul>
                      </section>
                    )}
                  </article>
                );
              })}
            </div>
          )}

          {canManageRequests && (
            <div className="flex items-center justify-between text-sm text-gray-600">
              <button
                type="button"
                onClick={handlePrev}
                disabled={page === 1}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={handleNext}
                disabled={lastFetchCount < pageSize}
                className="inline-flex items-center rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:bg-gray-100"
              >
                Next
              </button>
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Create request</h2>
            <p className="mt-1 text-sm text-gray-500">
              Keep everyone in the loop by logging a new maintenance issue.
            </p>
            <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
              <label className="text-xs font-medium text-gray-700">
                Title
                <input
                  name="title"
                  required
                  value={createForm.title}
                  onChange={handleCreateChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </label>
              <label className="text-xs font-medium text-gray-700">
                Description
                <textarea
                  name="description"
                  required
                  rows={3}
                  value={createForm.description}
                  onChange={handleCreateChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  placeholder="Describe the problem and any relevant context…"
                />
              </label>
              <label className="text-xs font-medium text-gray-700">
                Priority
                <select
                  name="priority"
                  value={createForm.priority}
                  onChange={handleCreateChange}
                  className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                >
                  {priorityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              {canManageRequests && (
                <>
                  <label className="text-xs font-medium text-gray-700">
                    Property
                    <select
                      name="propertyId"
                      value={createForm.propertyId}
                      onChange={handleCreateChange}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="">Select property</option>
                      {properties.map((property) => (
                        <option key={property.id} value={property.id}>
                          {property.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-gray-700">
                    Unit
                    <select
                      name="unitId"
                      value={createForm.unitId}
                      onChange={handleCreateChange}
                      disabled={createUnits.length === 0}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                    >
                      <option value="">Select unit</option>
                      {createUnits.map((unit) => (
                        <option key={unit.id} value={unit.id}>
                          {unit.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs font-medium text-gray-700">
                    Asset
                    <select
                      name="assetId"
                      value={createForm.assetId}
                      onChange={handleCreateChange}
                      disabled={loadingAssets || assetOptions.length === 0}
                      className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:bg-gray-100"
                    >
                      <option value="">{loadingAssets ? 'Loading assets…' : 'Optional'}</option>
                      {assetOptions.map((asset) => (
                        <option key={asset.id} value={asset.id}>
                          {asset.name}
                        </option>
                      ))}
                    </select>
                  </label>
                </>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
              >
                {submitting ? 'Submitting…' : 'Log request'}
              </button>
            </form>
          </div>

          <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Technician roster</h2>
            <p className="mt-1 text-sm text-gray-500">Who&apos;s available for assignment.</p>
            {technicians.length === 0 ? (
              <p className="mt-3 text-sm text-gray-500">No technicians on file.</p>
            ) : (
              <ul className="mt-4 space-y-3 text-sm text-gray-700">
                {technicians.map((tech) => (
                  <li key={tech.id} className="rounded border border-gray-200 px-3 py-2">
                    <div className="font-semibold text-gray-900">{tech.name}</div>
                    <p className="text-xs text-gray-500">{tech.role}</p>
                    <div className="mt-1 text-xs text-gray-500">
                      {tech.phone && <span className="block">📞 {tech.phone}</span>}
                      {tech.email && <span className="block">✉️ {tech.email}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default MaintenanceDashboard;
