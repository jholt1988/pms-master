import React, { useState, useEffect, useCallback } from 'react';
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
  id: number;
  name: string;
  city?: string;
  state?: string;
}

interface Unit {
  id: number;
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
  const { token } = useAuth();
  const [inspections, setInspections] = useState<Inspection[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedInspection, setSelectedInspection] = useState<Inspection | null>(null);
  const [filters, setFilters] = useState(initialFilters);
  const [showDetail, setShowDetail] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    propertyId: '',
    unitName: '',
    type: 'ROUTINE',
    scheduledDate: '',
    notes: '',
  });
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
      const data = await apiFetch(`/inspections${queryString}`, { token });
      setInspections(data?.data ?? []);
    } catch (err: any) {
      setInspections([]);
      setError(err.message ?? 'Failed to load inspections');
    } finally {
      setLoading(false);
    }
  }, [filters, token]);

  const fetchProperties = useCallback(async () => {
    try {
      const data = await apiFetch('/properties?limit=500', { token });
      setProperties(data?.data ?? []);
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

  const handleInspectionClick = (inspection: Inspection) => {
    setSelectedInspection(inspection);
    if (viewport === 'mobile' || viewport === 'tablet-portrait') {
      setShowDetail(true);
    }
  };

  const handleBackClick = () => {
    setShowDetail(false);
  };

  const handleCreateSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowCreateModal(false);
    setCreateForm({
      propertyId: '',
      unitName: '',
      type: 'ROUTINE',
      scheduledDate: '',
      notes: '',
    });
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
          <h1 className="text-3xl font-bold">Inspection Management</h1>
          <p className="text-sm text-foreground-500">Monitor upcoming, in-progress, and completed inspections.</p>
        </div>
        <Button color="primary" onClick={() => setShowCreateModal(true)}>
          Schedule Inspection
        </Button>
      </div>

      <div className="bg-white p-4 rounded-lg shadow mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
          <label className="flex flex-col text-sm text-foreground-500">
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
          <label className="flex flex-col text-sm text-foreground-500">
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
          <input
            className="border border-input rounded px-3 py-2"
            placeholder="Inspection Type (Routine, Move-in, etc.)"
            aria-label="Inspection Type"
            value={filters.type}
            onChange={(event) => setFilters((prev) => ({ ...prev, type: event.target.value }))}
          />
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center py-12">Loading inspections...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground-500">
                  Property / Unit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground-500">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground-500">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground-500">
                  Scheduled
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-foreground-500">
                  Inspector
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inspections.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-sm text-foreground-500">
                    No inspections match the current filters.
                  </td>
                </tr>
              )}
              {inspections.map((inspection) => (
                <tr
                  key={inspection.id}
                  onClick={() => handleInspectionClick(inspection)}
                  className="cursor-pointer hover:bg-gray-50"
                >
                  <td className="px-4 py-3 text-sm">
                    <p className="font-semibold text-foreground">{inspection.unit.property.name}</p>
                    <p className="text-xs text-foreground-500">{inspection.unit.name}</p>
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
      {selectedInspection ? (
        <>
          {(viewport === 'mobile' || viewport === 'tablet-portrait') && (
            <Button
              isIconOnly
              variant="light"
              onClick={handleBackClick}
              className="mb-4"
            >
              <ArrowLeft size={20} />
            </Button>
          )}
          <div className="bg-white rounded-lg shadow overflow-hidden p-6 flex flex-col gap-4 h-full">
            <div>
              <h2 className="text-2xl font-bold mb-1">
                {getTypeLabel(selectedInspection.type)} Inspection
              </h2>
              <p className="text-sm text-foreground-500">
                {selectedInspection.unit.property.name} · {selectedInspection.unit.name}
              </p>
            </div>
            <div className="flex flex-wrap gap-4">
              <span className={`px-3 py-1 rounded text-sm font-semibold ${getStatusColor(selectedInspection.status)}`}>
                {selectedInspection.status}
              </span>
              <span className="text-sm text-foreground-500">
                Scheduled: {new Date(selectedInspection.scheduledDate).toLocaleString()}
              </span>
              {selectedInspection.completedDate && (
                <span className="text-sm text-foreground-500">
                  Completed: {new Date(selectedInspection.completedDate).toLocaleString()}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-foreground-500">Inspector</h3>
              <p className="text-sm">{selectedInspection.inspector?.username ?? 'Unassigned'}</p>
            </div>
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-semibold text-foreground-500">Notes</h3>
              <p className="text-sm text-foreground">{selectedInspection.notes ?? 'No notes yet'}</p>
            </div>
            {selectedInspection.findings && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-foreground-500">Findings</h3>
                <pre className="text-xs text-foreground-500 bg-slate-50 p-3 rounded whitespace-pre-wrap wrap-break-word">
                  {JSON.stringify(selectedInspection.findings, null, 2)}
                </pre>
              </div>
            )}
            {selectedInspection.photos && selectedInspection.photos.length > 0 && (
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-semibold text-foreground-500">Photos</h3>
                <div className="grid grid-cols-2 gap-2">
                  {selectedInspection.photos.map((photo) => (
                    <img
                      key={photo.id}
                      src={photo.url}
                      alt={photo.caption || 'Inspection photo'}
                      className="w-full h-24 object-cover rounded"
                    />
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2 mt-auto">
              <Button variant="light" onClick={() => setShowCompleteModal(true)}>
                Mark Complete
              </Button>
            </div>
          </div>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-500">Select an inspection to see the details.</p>
        </div>
      )}
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
              <label className="flex flex-col text-sm text-foreground-500">
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
              <input
                className="border border-input rounded px-3 py-2"
                placeholder="Unit name or identifier"
                aria-label="Unit"
                value={createForm.unitName}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, unitName: event.target.value }))}
              />
              <input
                className="border border-input rounded px-3 py-2"
                placeholder="Inspection Type (Routine, Move-in, Move-out)"
                aria-label="Inspection Type"
                value={createForm.type}
                onChange={(event) => setCreateForm((prev) => ({ ...prev, type: event.target.value }))}
              />
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
