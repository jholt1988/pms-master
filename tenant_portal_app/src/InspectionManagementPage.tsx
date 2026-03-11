import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';
import { TabletPageShell } from './components/ui/TabletPageShell';
import { TwoPaneLayout } from './components/ui/TwoPaneLayout';
import { useViewportCategory } from './hooks/useViewportCategory';
import { ArrowLeft } from 'lucide-react';
import {
  Button,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from '@nextui-org/react';

interface Property {
  id: string;
  name: string;
  city?: string;
  state?: string;
  units?: Array<{ id: string; name: string }>;
}

interface Unit {
  id: string;
  name: string;
  property: Property;
}

interface Inspection {
  id: number;
  type: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  scheduledDate: string;
  completedDate?: string | null;
  notes?: string | null;
  unit: Unit;
  inspector?: {
    id: number;
    username: string;
  } | null;
  findings?: Record<string, unknown>;
  photos?: Array<{
    id: number;
    url: string;
    caption?: string | null;
  }>;
}

const initialFilters = {
  propertyId: '',
  unitId: '',
  status: '',
  type: '',
  startDate: '',
  endDate: '',
};

const getStatusColor = (status: Inspection['status']) => {
  switch (status) {
    case 'SCHEDULED':
      return 'bg-blue-100 text-blue-800';
    case 'IN_PROGRESS':
      return 'bg-yellow-100 text-yellow-800';
    case 'COMPLETED':
      return 'bg-emerald-100 text-emerald-800';
    case 'CANCELLED':
      return 'bg-rose-100 text-rose-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getTypeLabel = (type: string) => {
  return type.replace('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase());
};

export default function InspectionManagementPage(): React.ReactElement {
  const { token, user } = useAuth();
  const isOwnerView = user?.role === 'OWNER';
  const navigate = useNavigate();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [inspectionRequests, setInspectionRequests] = useState<any[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    propertyId: '',
    unitId: '',
    type: 'ROUTINE',
    scheduledDate: '',
    notes: '',
  });
  const [propertyUnits, setPropertyUnits] = useState<Array<{ id: string; name: string }>>([]);
  const [loadingPropertyUnits, setLoadingPropertyUnits] = useState(false);
  const [completionNotes, setCompletionNotes] = useState('');
  const viewport = useViewportCategory();

  const fetchInspections = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          params.append(key, value);
        }
      });

      const queryString = params.toString() ? `?${params.toString()}` : '';
      const [data, requestsResp] = await Promise.all([
        apiFetch(`/inspections${queryString}`, { token: token ?? undefined }),
        apiFetch('/inspections/requests', { token: token ?? undefined }).catch(() => []),
      ]);
      const resolved = (data && typeof data === 'object')
        ? ((data as any).data ?? (data as any).inspections ?? (data as any).items ?? [])
        : [];
      setInspections(Array.isArray(resolved) ? resolved : []);
      setInspectionRequests(Array.isArray(requestsResp) ? requestsResp : ((requestsResp as any)?.data ?? []));
    } catch (err: any) {
      setInspections([]);
      setError(err.message ?? 'Failed to load inspections');
    } finally {
      setLoading(false);
    }
  }, [filters, token]);

  const fetchProperties = useCallback(async () => {
    try {
      const data = await apiFetch('/properties?limit=500', { token: token ?? undefined });
      const list = Array.isArray((data as any)?.data) ? (data as any).data : (Array.isArray(data) ? data : []);
      setProperties(list);
    } catch {
      setProperties([]);
    }
  }, [token]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  useEffect(() => {
    fetchInspections();
  }, [fetchInspections]);

  useEffect(() => {
    const selectedProperty = properties.find((p) => String(p.id) === String(createForm.propertyId));
    const units = Array.isArray(selectedProperty?.units) ? selectedProperty!.units : [];
    setPropertyUnits(units);
    setCreateForm((prev) => ({ ...prev, unitId: units.some((u) => String(u.id) === String(prev.unitId)) ? prev.unitId : '' }));
  }, [createForm.propertyId, properties]);

  useEffect(() => {
    const loadUnitsFallback = async () => {
      if (!token || !createForm.propertyId) {
        return;
      }
      if (propertyUnits.length > 0) {
        return;
      }

      try {
        setLoadingPropertyUnits(true);
        const property = await apiFetch(`/properties/${createForm.propertyId}`, { token });
        const units = Array.isArray((property as any)?.units) ? (property as any).units : [];
        if (units.length > 0) {
          setPropertyUnits(units.map((u: any) => ({ id: String(u.id), name: u.name ?? `Unit ${u.id}` })));
        }
      } catch {
        // fallback stays empty; UI will prompt selection once units are available
      } finally {
        setLoadingPropertyUnits(false);
      }
    };

    loadUnitsFallback();
  }, [createForm.propertyId, propertyUnits.length, token]);

  const handleInspectionClick = (inspection: Inspection) => {
    // Use dedicated detail route for checklist editing + estimate generation
    navigate(`/inspections/${inspection.id}`);
  };

  const handleBackClick = () => {
    setShowDetail(false);
  };

  const handleRequestDecision = async (requestId: number, decision: 'APPROVED' | 'DENIED') => {
    if (!token) return;
    try {
      await apiFetch(`/inspections/requests/${requestId}/decision`, {
        token,
        method: 'PATCH',
        body: { decision },
      });
      await fetchInspections();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update request');
    }
  };

  const handleCreateSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;

    if (!createForm.propertyId || !createForm.unitId || !createForm.scheduledDate) {
      setError('Property, unit, and schedule date are required.');
      return;
    }

    try {
      await apiFetch('/inspections', {
        token,
        method: 'POST',
        body: {
          propertyId: createForm.propertyId,
          unitId: createForm.unitId,
          type: createForm.type,
          scheduledDate: new Date(createForm.scheduledDate).toISOString(),
          notes: createForm.notes || undefined,
        },
      });

      setShowCreateModal(false);
      setCreateForm({
        propertyId: '',
        unitId: '',
        type: 'ROUTINE',
        scheduledDate: '',
        notes: '',
      });
      await fetchInspections();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to schedule inspection');
    }
  };

  const handleCompleteSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowCompleteModal(false);
    setCompletionNotes('');
  };

  const master = (
    <div className="p-6">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-2xl font-semibold">Overview</h2>
          <p className="text-sm text-gray-600">Monitor upcoming, in-progress, and completed inspections.</p>
        </div>
        <Button
          color="primary"
          isDisabled={isOwnerView}
          onClick={() => {
            if (isOwnerView) return;
            setShowCreateModal(true);
          }}
        >
          Schedule Inspection
        </Button>
      </div>

      {isOwnerView && (
        <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          <span className="font-semibold">Owner view:</span> inspection scheduling is managed by your property manager. Data refreshes nightly.
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <label className="flex flex-col text-sm text-gray-600">
            Property
            <select
              className="border border-input rounded px-3 py-2 mt-1"
              value={filters.propertyId}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, propertyId: event.target.value }))
              }
            >
              <option value="">All properties</option>
              {properties.map((property) => (
                <option key={property.id} value={String(property.id)}>
                  {property.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-sm text-gray-600">
            Status
            <select
              className="border border-input rounded px-3 py-2 mt-1"
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              <option value="">Any</option>
              <option value="SCHEDULED">Scheduled</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
          <label className="flex flex-col text-sm text-gray-600">
            Inspection Type
            <input
              className="border border-input rounded px-3 py-2 mt-1"
              placeholder="Routine, Move-in, etc."
              value={filters.type}
              onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
            />
          </label>
        </div>
      </div>

      {error && (
        <div
          className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded mb-4"
          role="alert"
        >
          {error}
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Pending Tenant Inspection Requests</h3>
          <span className="text-xs text-gray-600">{inspectionRequests.filter((r) => r.status === 'PENDING').length} pending</span>
        </div>
        <div className="space-y-2">
          {inspectionRequests.filter((r) => r.status === 'PENDING').slice(0, 8).map((r) => (
            <div key={r.id} className="border border-default-200 rounded p-3 flex items-center gap-3">
              <div>
                <div className="text-sm font-semibold">{getTypeLabel(r.type)} · {r.property?.name ?? 'Property'} / {r.unit?.name ?? 'Unit'}</div>
                <div className="text-xs text-gray-600">Tenant: {r.tenant?.firstName || r.tenant?.username || 'Unknown'} · {new Date(r.createdAt).toLocaleString()}</div>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <Button size="sm" color="success" variant="flat" onClick={() => handleRequestDecision(Number(r.id), 'APPROVED')}>Approve</Button>
                <Button size="sm" color="danger" variant="flat" onClick={() => handleRequestDecision(Number(r.id), 'DENIED')}>Deny</Button>
              </div>
            </div>
          ))}
          {inspectionRequests.filter((r) => r.status === 'PENDING').length === 0 && (
            <div className="text-sm text-gray-600">No pending requests.</div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12" role="status" aria-live="polite">
          Loading inspections...
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <caption className="sr-only">Inspection list</caption>
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Property / Unit
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Type
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Status
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Scheduled
                </th>
                <th scope="col" className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-600">
                  Inspector
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inspections.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-gray-600">
                    No inspections match the current filters.
                  </td>
                </tr>
              )}
              {inspections.map((inspection) => (
                <tr
                  key={inspection.id}
                  onClick={() => handleInspectionClick(inspection)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleInspectionClick(inspection);
                    }
                  }}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open inspection ${inspection.unit.name} (${getTypeLabel(inspection.type)})`}
                  className="cursor-pointer hover:bg-gray-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
                >
                  <td className="px-4 py-3 text-sm">
                    <p className="font-semibold text-foreground">
                      {properties.find((p) => String(p.id) === String(inspection.unit.property.id))?.name}
                    </p>
                    <p className="text-xs text-gray-600">{inspection.unit.name}</p>
                  </td>
                  <td className="px-4 py-3 text-sm">{getTypeLabel(inspection.type)}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(inspection.status)}`}
                    >
                      {inspection.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {new Date(inspection.scheduledDate).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {inspection.inspector?.username ?? 'Unassigned'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );

  const detail = (
    <div className="p-6 h-full">
      <div className="flex items-center justify-center h-full">
        <p className="text-gray-500">Select an inspection to see the details.</p>
      </div>
    </div>
  );

  return (
    <TabletPageShell pageTitle="Inspection Management">
      <TwoPaneLayout master={master} detail={detail} showDetail={showDetail} />

      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)}>
        <ModalContent>
          <ModalHeader>Schedule Inspection</ModalHeader>
          <ModalBody>
            <form id="schedule-inspection-form" onSubmit={handleCreateSubmit} className="space-y-4">
              <label className="flex flex-col text-sm text-gray-600">
                Property
                <select
                  className="border border-input rounded px-3 py-2 mt-1"
                  value={createForm.propertyId}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, propertyId: event.target.value }))}
                >
                  <option value="">Select property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={String(property.id)}>
                      {property.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm text-gray-600">
                Unit
                <select
                  className="border border-input rounded px-3 py-2 mt-1"
                  value={createForm.unitId}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, unitId: event.target.value }))}
                >
                  <option value="">{loadingPropertyUnits ? 'Loading units…' : 'Select unit'}</option>
                  {propertyUnits.map((unit) => (
                    <option key={unit.id} value={String(unit.id)}>
                      {unit.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col text-sm text-gray-600">
                Inspection Type
                <select
                  className="border border-input rounded px-3 py-2 mt-1"
                  value={createForm.type}
                  onChange={(event) => setCreateForm((prev) => ({ ...prev, type: event.target.value }))}
                >
                  <option value="ROUTINE">Routine</option>
                  <option value="MOVE_IN">Move-in</option>
                  <option value="MOVE_OUT">Move-out</option>
                  <option value="EMERGENCY">Emergency</option>
                </select>
              </label>
              <input
                type="datetime-local"
                className="border border-input rounded px-3 py-2"
                aria-label="Scheduled At"
                value={createForm.scheduledDate}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, scheduledDate: event.target.value }))}
              />
              <textarea
                className="border border-input rounded px-3 py-2"
                rows={3}
                placeholder="Notes"
                aria-label="Notes"
                value={createForm.notes}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, notes: event.target.value }))}
              />
            </form>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button color="primary" type="submit" form="schedule-inspection-form">
              Schedule
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={showCompleteModal} onClose={() => setShowCompleteModal(false)}>
        <ModalContent>
          <ModalHeader>Complete Inspection</ModalHeader>
          <ModalBody>
            <form id="complete-inspection-form" onSubmit={handleCompleteSubmit} className="space-y-4">
              <textarea
                className="border border-input rounded px-3 py-2"
                rows={3}
                placeholder="Completion Notes"
                aria-label="Completion Notes"
                value={completionNotes}
                onChange={(event) => setCompletionNotes(event.target.value)}
              />
            </form>
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onClick={() => setShowCompleteModal(false)}>
              Cancel
            </Button>
            <Button color="success" type="submit" form="complete-inspection-form">
              Mark Complete
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </TabletPageShell>
  );
}
