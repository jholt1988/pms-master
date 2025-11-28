import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';
import { MasterDetailLayout } from './components/ui/MasterDetailLayout';
import { useMasterDetail } from './hooks/useMasterDetail';
import { useViewportCategory } from './hooks/useViewportCategory';
import { ArrowLeft } from 'lucide-react';
import { Button, Card, CardBody, CardHeader, Chip } from '@nextui-org/react';

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';
  createdAt: string;
  updatedAt: string;
  unit: {
    id: number;
    name: string;
    property: {
      id: number;
      name: string;
    };
  };
  author: {
    id: number;
    username: string;
  };
  photos: Array<{
    id: number;
    url: string;
    caption: string | null;
  }>;
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

export default function MaintenanceManagementPage(): React.ReactElement {
  const { token } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const { selectedItem: selectedRequest, showDetail, selectItem: selectRequest, clearSelection } = useMasterDetail<MaintenanceRequest>();
  const viewport = useViewportCategory();

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const data = await apiFetch('/maintenance', { token: token || undefined });
      console.log('Maintenance data received:', data);
      // Handle both { data: [...] } and [...] formats
      const requests = Array.isArray(data) ? data : (data?.data || data || []);
      setRequests(requests);
    } catch (err: unknown) {
      console.error('Error fetching maintenance requests:', err);
      setRequests([]);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load maintenance requests';
      setError(errorMessage || undefined);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleBackClick = () => {
    clearSelection();
  };

  const master = (
    <div className="p-4 sm:p-6 w-full">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 text-white">Maintenance Requests</h1>
      <div className="mb-4 text-sm text-gray-300">
        Debug: {requests.length} requests loaded, loading: {loading ? 'true' : 'false'}
      </div>
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
              {/* Add more details and actions here */}
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
    <MasterDetailLayout
      master={master}
      detail={detail}
      showDetail={showDetail}
    />
  );
}
