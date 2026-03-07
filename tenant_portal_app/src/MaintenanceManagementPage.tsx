import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';
import { normalizeApiList } from './utils/normalizeApiList';
import { MasterDetailLayout } from './components/ui/MasterDetailLayout';
import { useMasterDetail } from './hooks/useMasterDetail';
import { useViewportCategory } from './hooks/useViewportCategory';
import { ArrowLeft } from 'lucide-react';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
  Select,
  SelectItem,
  Textarea,
  useDisclosure,
} from '@nextui-org/react';

interface MaintenanceRequest {
  id: string;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  createdAt: string;
  updatedAt: string;
  dueAt?: string | null;
  unit?: {
    id: string;
    name: string;
    property?: {
      id: string;
      name: string;
    };
  };
  property?: {
    id: string;
    name: string;
  };
  lease?: {
    id: string;
  };
  author?: {
    id: string;
    username: string;
  };
  photos: Array<{
    id: number;
    url: string;
    caption: string | null;
  }>;
}

interface PropertyOption {
  id: string;
  name: string;
  units?: Array<{ id: string; name: string }>;
}

interface LeaseOption {
  id: string;
  unitId: string;
  tenant?: { username?: string | null };
}

const getStatusColor = (status: MaintenanceRequest['status']) => {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'IN_PROGRESS':
      return 'primary';
    case 'COMPLETED':
      return 'success';
    default:
      return 'default';
  }
};

const getPriorityColor = (priority: MaintenanceRequest['priority']) => {
  switch (priority) {
    case 'LOW':
      return 'default';
    case 'MEDIUM':
      return 'primary';
    case 'HIGH':
      return 'warning';
    case 'EMERGENCY':
      return 'danger';
    default:
      return 'default';
  }
};

const getFriendlyApiError = (err: any, fallback: string) => {
  const message = err?.message || '';
  if (typeof message === 'string' && message.startsWith('401')) {
    return 'Session expired or unauthorized. Please sign in again and retry.';
  }
  return message || fallback;
};

export default function MaintenanceManagementPage(): React.ReactElement {
  const { token, user } = useAuth();
  const isOwnerView = user?.role === 'OWNER';
  const isPmAdminView = ['PM', 'PROPERTY_MANAGER', 'ADMIN', 'OPERATOR'].includes((user?.role as string) || '');
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [diagnostics, setDiagnostics] = useState<any | null>(null);
  const [diagnosticsLoading, setDiagnosticsLoading] = useState(false);
  const [featureData, setFeatureData] = useState<any | null>(null);
  const [featureLoading, setFeatureLoading] = useState(false);
  const [properties, setProperties] = useState<PropertyOption[]>([]);
  const [leases, setLeases] = useState<LeaseOption[]>([]);
  const [createError, setCreateError] = useState<string | undefined>(undefined);
  const [creating, setCreating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const { isOpen: isCreateOpen, onOpen: onCreateOpen, onClose: onCreateClose } = useDisclosure();
  const [createForm, setCreateForm] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM' as MaintenanceRequest['priority'],
    propertyId: '',
    unitId: '',
    leaseId: '',
    dueDate: '',
  });
  const { selectedItem: selectedRequest, showDetail, selectItem: selectRequest, clearSelection } = useMasterDetail<MaintenanceRequest>();
  const viewport = useViewportCategory();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const data = await apiFetch('/maintenance', { token: token || undefined });
      console.log('Maintenance data received:', data);
      const normalizedRequests = normalizeApiList<MaintenanceRequest>(data);
      setRequests(normalizedRequests);
    } catch (err: unknown) {
      console.error('Error fetching maintenance requests:', err);
      setRequests([]);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load maintenance requests';
      setError(getFriendlyApiError(err, errorMessage) || undefined);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  useEffect(() => {
    if (!token || !isPmAdminView) return;

    const loadContext = async () => {
      try {
        const [propertyData, leaseData] = await Promise.all([
          apiFetch('/properties', { token }),
          apiFetch('/leases', { token }),
        ]);

        const normalizedProperties = normalizeApiList<PropertyOption>(propertyData);
        const normalizedLeases = normalizeApiList<LeaseOption>(leaseData);

        setProperties(normalizedProperties);
        setLeases(normalizedLeases);
      } catch (err) {
        console.error('Failed to load PM/Admin maintenance create context', err);
      }
    };

    loadContext();
  }, [token, isPmAdminView]);

  const handleBackClick = () => {
    clearSelection();
  };

  const fetchDiagnostics = async () => {
    if (!token) return;
    setDiagnosticsLoading(true);
    try {
      const data = await apiFetch('/maintenance/diagnostics/data-quality', { token });
      setDiagnostics(data);
    } catch (err: any) {
      setError(getFriendlyApiError(err, 'Failed to load diagnostics'));
    } finally {
      setDiagnosticsLoading(false);
    }
  };

  const fetchFeatures = async (requestId: string) => {
    if (!token) return;
    setFeatureLoading(true);
    try {
      const data = await apiFetch(`/maintenance/ai/features/${String(requestId)}`, { token });
      setFeatureData(data);
    } catch (err: any) {
      setError(getFriendlyApiError(err, 'Failed to load AI features'));
    } finally {
      setFeatureLoading(false);
    }
  };

  const selectedProperty = properties.find((property) => property.id === createForm.propertyId);
  const availableUnits = selectedProperty?.units ?? [];
  const availableLeases = createForm.unitId
    ? leases.filter((lease) => lease.unitId === createForm.unitId)
    : leases;

  const handleCreateRequest = async () => {
    if (!token || !isPmAdminView) return;
    setCreating(true);
    setCreateError(undefined);

    try {
      const payload: Record<string, unknown> = {
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        priority: createForm.priority,
      };

      if (createForm.propertyId) payload.propertyId = createForm.propertyId;
      if (createForm.unitId) payload.unitId = createForm.unitId;
      if (createForm.leaseId) payload.leaseId = createForm.leaseId;
      if (createForm.dueDate) payload.dueDate = createForm.dueDate;

      const created = (await apiFetch('/maintenance', {
        token,
        method: 'POST',
        body: payload,
      })) as MaintenanceRequest;

      setRequests((prev) => [created, ...prev.filter((item) => item.id !== created.id)]);
      setCreateForm({
        title: '',
        description: '',
        priority: 'MEDIUM',
        propertyId: '',
        unitId: '',
        leaseId: '',
        dueDate: '',
      });
      onCreateClose();
    } catch (err: any) {
      setCreateError(getFriendlyApiError(err, 'Failed to create maintenance request'));
    } finally {
      setCreating(false);
    }
  };

  const handleAcceptRequest = async (request: MaintenanceRequest) => {
    if (!token || !isPmAdminView) return;

    setUpdatingStatus(true);
    setError(undefined);

    try {
      const updated = (await apiFetch(`/maintenance/${request.id}/status`, {
        token,
        method: 'PATCH',
        body: { status: 'IN_PROGRESS' },
      })) as MaintenanceRequest;

      setRequests((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      selectRequest({ ...request, ...updated });
    } catch (err: unknown) {
      setError(getFriendlyApiError(err, 'Failed to accept maintenance request'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleRejectRequest = async (request: MaintenanceRequest) => {
    if (!token || !isPmAdminView) return;

    const reason = window.prompt('Enter rejection reason (required):');
    if (!reason || !reason.trim()) {
      setError('Rejection reason is required.');
      return;
    }

    setUpdatingStatus(true);
    setError(undefined);

    try {
      await apiFetch(`/maintenance/${request.id}/notes`, {
        token,
        method: 'POST',
        body: { body: `REJECTED: ${reason.trim()}` },
      });

      const updated = (await apiFetch(`/maintenance/${request.id}/status`, {
        token,
        method: 'PATCH',
        body: { status: 'COMPLETED' },
      })) as MaintenanceRequest;

      setRequests((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
      selectRequest({ ...request, ...updated });
    } catch (err: unknown) {
      setError(getFriendlyApiError(err, 'Failed to reject maintenance request'));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const master = (
    <div className="p-4 sm:p-6 w-full">
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Maintenance Requests</h1>
        {isPmAdminView && (
          <div className="flex items-center gap-2">
            <Button size="sm" color="primary" onPress={onCreateOpen}>
              New Request
            </Button>
            <Button size="sm" variant="bordered" onPress={fetchDiagnostics} isLoading={diagnosticsLoading}>
              Data Quality Diagnostics
            </Button>
          </div>
        )}
      </div>
      {isOwnerView && (
        <div className="mb-6 rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-xs text-gray-300">
          <span className="font-mono text-neon-blue uppercase tracking-wider">Owner view</span>
          <span className="ml-2">Read-only ticket status. Updates are managed by the property manager.</span>
        </div>
      )}
      {diagnostics && (
        <Card className="mb-4 bg-white/5 border-white/10">
          <CardBody>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-medium text-white">Diagnostics Snapshot</p>
              <Button
                size="sm"
                variant="light"
                onPress={() => navigator?.clipboard?.writeText(JSON.stringify(diagnostics, null, 2))}
              >
                Copy JSON
              </Button>
            </div>
            <pre className="text-xs text-gray-300 overflow-auto max-h-48">{JSON.stringify(diagnostics, null, 2)}</pre>
          </CardBody>
        </Card>
      )}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-300">Loading maintenance requests...</p>
        </div>
      ) : error ? (
        <Card className="border-danger-200 bg-danger-50">
          <CardBody>
            <p className="text-sm text-danger-700">{error}</p>
          </CardBody>
        </Card>
      ) : requests.length === 0 ? (
        <Card className="border-dashed border-gray-600">
          <CardBody className="py-12 text-center">
            <p className="text-sm text-gray-300">No maintenance requests found.</p>
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <Card key={request.id} isPressable onPress={() => selectRequest(request)} className="bg-white/5 border-white/10">
              <CardBody>
                <div className="flex justify-between">
                  <h3 className="font-bold text-white">{request.title}</h3>
                  <Chip color={getStatusColor(request.status)} size="sm">{request.status}</Chip>
                </div>
                <p className="text-sm text-gray-300 mt-2">{request.unit?.property?.name || 'Unknown'} - {request.unit?.name || 'Unknown'}</p>
                <div className="flex justify-between items-center mt-4">
                  <p className="text-xs text-gray-400">Created: {new Date(request.createdAt).toLocaleDateString()}</p>
                  <Chip color={getPriorityColor(request.priority)} size="sm">{request.priority}</Chip>
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  );

  const detail = (
    <div className="p-4 sm:p-6">
      {selectedRequest ? (
        <>
          {(viewport === 'mobile' || viewport === 'tablet-portrait') && (
            <Button isIconOnly variant="light" onClick={handleBackClick} className="mb-4">
              <ArrowLeft size={20} />
            </Button>
          )}
          <Card>
            <CardHeader>
              <h2 className="text-2xl font-bold">{selectedRequest.title}</h2>
            </CardHeader>
            <CardBody>
              <p>{selectedRequest.description}</p>
              {isPmAdminView && (
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {selectedRequest.status === 'PENDING' && (
                    <>
                      <Button
                        size="sm"
                        color="success"
                        onPress={() => handleAcceptRequest(selectedRequest)}
                        isLoading={updatingStatus}
                      >
                        Accept Request
                      </Button>
                      <Button
                        size="sm"
                        color="danger"
                        variant="flat"
                        onPress={() => handleRejectRequest(selectedRequest)}
                        isLoading={updatingStatus}
                      >
                        Reject Request
                      </Button>
                    </>
                  )}
                  <Button size="sm" variant="bordered" onPress={() => fetchFeatures(selectedRequest.id)} isLoading={featureLoading}>
                    View AI Features
                  </Button>
                </div>
              )}
              {featureData && (
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium text-white">AI Features</p>
                    <Button
                      size="sm"
                      variant="light"
                      onPress={() => navigator?.clipboard?.writeText(JSON.stringify(featureData, null, 2))}
                    >
                      Copy JSON
                    </Button>
                  </div>
                  <pre className="text-xs text-gray-300 overflow-auto max-h-56">{JSON.stringify(featureData, null, 2)}</pre>
                </div>
              )}
            </CardBody>
          </Card>
        </>
      ) : (
        <div className="flex items-center justify-center h-full">
          <p className="text-gray-300">Select a request to see the details</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <MasterDetailLayout
        master={master}
        detail={detail}
        showDetail={showDetail}
      />

      <Modal isOpen={isCreateOpen} onClose={onCreateClose} size="2xl" scrollBehavior="inside">
        <ModalContent>
          <ModalHeader>Create Maintenance Request</ModalHeader>
          <ModalBody>
            {createError && <p className="text-sm text-danger">{createError}</p>}
            <Input
              label="Title"
              value={createForm.title}
              onValueChange={(value) => setCreateForm((prev) => ({ ...prev, title: value }))}
              isRequired
            />
            <Textarea
              label="Description"
              value={createForm.description}
              onValueChange={(value) => setCreateForm((prev) => ({ ...prev, description: value }))}
              minRows={4}
              isRequired
            />
            <Select
              label="Priority"
              selectedKeys={[createForm.priority]}
              onSelectionChange={(keys) => {
                const selected = Array.from(keys)[0] as MaintenanceRequest['priority'] | undefined;
                setCreateForm((prev) => ({ ...prev, priority: selected ?? 'MEDIUM' }));
              }}
            >
              {(['LOW', 'MEDIUM', 'HIGH', 'EMERGENCY'] as const).map((priority) => (
                <SelectItem key={priority} value={priority}>{priority}</SelectItem>
              ))}
            </Select>
            <Select
              label="Property (optional)"
              selectedKeys={createForm.propertyId ? [createForm.propertyId] : []}
              onSelectionChange={(keys) => {
                const selected = (Array.from(keys)[0] as string | undefined) ?? '';
                setCreateForm((prev) => ({ ...prev, propertyId: selected, unitId: '', leaseId: '' }));
              }}
            >
              {properties.map((property) => (
                <SelectItem key={property.id} value={property.id}>{property.name}</SelectItem>
              ))}
            </Select>
            <Select
              label="Unit (optional)"
              selectedKeys={createForm.unitId ? [createForm.unitId] : []}
              isDisabled={!selectedProperty}
              onSelectionChange={(keys) => {
                const selected = (Array.from(keys)[0] as string | undefined) ?? '';
                setCreateForm((prev) => ({ ...prev, unitId: selected, leaseId: '' }));
              }}
            >
              {availableUnits.map((unit) => (
                <SelectItem key={unit.id} value={unit.id}>{unit.name}</SelectItem>
              ))}
            </Select>
            <Select
              label="Lease (optional)"
              selectedKeys={createForm.leaseId ? [createForm.leaseId] : []}
              onSelectionChange={(keys) => {
                const selected = (Array.from(keys)[0] as string | undefined) ?? '';
                setCreateForm((prev) => ({ ...prev, leaseId: selected }));
              }}
            >
              {availableLeases.map((lease) => (
                <SelectItem key={lease.id} value={lease.id}>
                  {lease.id.slice(0, 8)}{lease.tenant?.username ? ` · ${lease.tenant.username}` : ''}
                </SelectItem>
              ))}
            </Select>
            <Input
              type="date"
              label="Due date (optional)"
              value={createForm.dueDate}
              onValueChange={(value) => setCreateForm((prev) => ({ ...prev, dueDate: value }))}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="light" onPress={onCreateClose}>Cancel</Button>
            <Button
              color="primary"
              onPress={handleCreateRequest}
              isLoading={creating}
              isDisabled={!createForm.title.trim() || !createForm.description.trim()}
            >
              Create Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
}
