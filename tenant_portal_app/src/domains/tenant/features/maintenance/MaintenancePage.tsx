import React, { useState, useMemo, useEffect } from 'react';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Input,
  Textarea,
  Select,
  SelectItem,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Tabs,
  Tab
} from '@nextui-org/react';
import {
  Plus,
  Wrench,
  Calendar,
  User,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { format } from 'date-fns';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { SearchInput } from '../../../../components/ui/SearchInput';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { useAuth } from '../../../../AuthContext';
import { apiFetch } from '../../../../services/apiClient';

// Aligned with Backend Enums
type MaintenanceStatus = 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';
type MaintenancePriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'EMERGENCY';

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  status: MaintenanceStatus;
  priority: MaintenancePriority;
  category?: string; // Backend might not return this directly unless mapped, defaulting to optional
  createdAt: string;
  scheduledDate?: string;
  completedAt?: string;
  assignee?: {
    name: string;
    phone?: string;
    email?: string;
  };
  unit?: {
    name: string;
    unitNumber?: string;
  };
  property?: {
    name: string;
  };
  notes?: { id: number; body: string; createdAt: string }[];
  slaPolicy?: any;
}

const categories = [
  'Plumbing',
  'Electrical',
  'HVAC',
  'Appliance',
  'Structural',
  'Pest Control',
  'Locks & Security',
  'Other'
];

const priorityOptions = [
  { value: 'LOW', label: 'Low - Can wait' },
  { value: 'MEDIUM', label: 'Medium - Within a week' },
  { value: 'HIGH', label: 'High - Within 2-3 days' },
  { value: 'EMERGENCY', label: 'Emergency - Immediate attention' }
];

const MaintenancePage: React.FC = () => {
  const { token } = useAuth();
  const [requests, setRequests] = useState<MaintenanceRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const { isOpen, onOpen, onClose } = useDisclosure();

  // New request form state
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'MEDIUM' as MaintenancePriority,
    preferredDate: '',
    preferredTime: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const fetchRequests = async () => {
    if (!token) return;
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiFetch('/maintenance', { token });
      setRequests(data);
    } catch (err) {
      console.error('Failed to fetch maintenance requests', err);
      setError('Failed to load maintenance requests. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [token]);

  const filteredRequests = useMemo(() => {
    let filtered = requests;

    // Filter by tab - Backend uses uppercase status
    if (selectedTab !== 'all') {
      filtered = filtered.filter(req => req.status === selectedTab.toUpperCase());
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(req =>
        req.title?.toLowerCase().includes(query) ||
        req.description?.toLowerCase().includes(query) ||
        req.category?.toLowerCase().includes(query)
      );
    }

    return filtered.sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [requests, selectedTab, searchQuery]);

  const handleSubmitRequest = async () => {
    if (!token) return;

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      // Construct description with category and preferred time prefixed
      // since backend might not have separate fields for them in DTO
      const fullDescription = `[Category: ${newRequest.category}]\n` +
        (newRequest.preferredDate ? `[Preferred: ${newRequest.preferredDate} ${newRequest.preferredTime}]\n` : '') +
        newRequest.description;

      const payload = {
        title: newRequest.title,
        description: fullDescription,
        priority: newRequest.priority,
        // Assuming connection to user's property/unit is handled by backend logic/auth
      };

      await apiFetch('/maintenance', {
        token,
        method: 'POST',
        body: payload
      });

      // Refresh list
      await fetchRequests();

      // Reset form
      setNewRequest({
        title: '',
        description: '',
        category: '',
        priority: 'MEDIUM',
        preferredDate: '',
        preferredTime: ''
      });
      onClose();
    } catch (err: any) {
      console.error('Failed to submit request', err);
      setSubmitError(err.message || 'Failed to submit request');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityColor = (priority: string): 'default' | 'primary' | 'warning' | 'danger' => {
    switch (priority) {
      case 'EMERGENCY': return 'danger';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'primary';
      default: return 'default';
    }
  };

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'PENDING').length,
    in_progress: requests.filter(r => r.status === 'IN_PROGRESS').length,
    completed: requests.filter(r => r.status === 'COMPLETED').length
  }), [requests]);

  if (isLoading && requests.length === 0) {
    return (
      <div className="section min-h-[50vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="section">
      <PageHeader
        title="Maintenance Requests"
        subtitle="Submit and track maintenance requests for your unit"
        actions={
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" aria-hidden="true" />}
            onPress={onOpen}
            aria-label="Submit new maintenance request"
          >
            Submit Request
          </Button>
        }
      />

      {error && (
        <Card className="mb-6 bg-danger-50 border-danger-100">
          <CardBody className="text-danger-700">
            {error}
          </CardBody>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-medium">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-500">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Wrench className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-medium">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-500">Pending</p>
                <p className="text-2xl font-bold text-warning">{stats.pending}</p>
              </div>
              <Clock className="w-8 h-8 text-warning" aria-hidden="true" />
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-medium">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-500">In Progress</p>
                <p className="text-2xl font-bold text-primary">{stats.in_progress}</p>
              </div>
              <Wrench className="w-8 h-8 text-primary" aria-hidden="true" />
            </div>
          </CardBody>
        </Card>

        <Card className="shadow-medium">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-500">Completed</p>
                <p className="text-2xl font-bold text-success">{stats.completed}</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-success" aria-hidden="true" />
            </div>
          </CardBody>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex gap-4 items-center">
        <div className="flex-1">
          <SearchInput
            value={searchQuery}
            onSearch={setSearchQuery}
            placeholder="Search requests..."
          />
        </div>
      </div>

      {/* Tabs for filtering */}
      <Tabs
        selectedKey={selectedTab}
        onSelectionChange={(key) => setSelectedTab(key as string)}
        variant="underlined"
        color="primary"
      >
        <Tab key="all" title="All Requests" />
        <Tab key="pending" title="Pending" />
        <Tab key="in_progress" title="In Progress" />
        <Tab key="completed" title="Completed" />
      </Tabs>

      {/* Requests List */}
      <div className="space-y-4">
        {filteredRequests.length === 0 ? (
          <Card className="shadow-medium">
            <CardBody className="p-8 text-center">
              <Wrench className="w-12 h-12 mx-auto mb-4 text-foreground-300" aria-hidden="true" />
              <p className="text-foreground-500">No maintenance requests found</p>
              <Button
                color="primary"
                variant="flat"
                className="mt-4"
                onPress={onOpen}
              >
                Submit Your First Request
              </Button>
            </CardBody>
          </Card>
        ) : (
          filteredRequests.map((request) => (
            <Card key={request.id} className="shadow-medium">
              <CardHeader className="flex-col items-start px-6 pt-6 pb-3">
                <div className="flex w-full items-start justify-between">
                  <div className="flex flex-col gap-2">
                    <h3 className="text-lg font-semibold">
                      #{request.id} {request.title}
                    </h3>
                    <div className="flex gap-2 flex-wrap">
                      {request.category && (
                        <Chip size="sm" variant="flat">
                          {request.category}
                        </Chip>
                      )}
                      <Chip
                        size="sm"
                        color={getPriorityColor(request.priority)}
                        variant="flat"
                      >
                        {request.priority}
                      </Chip>
                      <StatusBadge status={request.status} />
                    </div>
                  </div>
                  <div className="text-right text-sm text-foreground-500">
                    <p>Submitted</p>
                    <p className="font-medium">{format(new Date(request.createdAt), 'MMM d, yyyy')}</p>
                    <p>{format(new Date(request.createdAt), 'h:mm a')}</p>
                  </div>
                </div>
              </CardHeader>

              <CardBody className="px-6 pt-0 pb-6">
                <div className="space-y-4">
                  <p className="text-sm text-foreground-600 whitespace-pre-wrap">{request.description}</p>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-foreground-700 mb-2">Property Details</p>
                      <div className="space-y-1">
                        <p className="text-foreground-600">
                          <span className="font-medium">Property:</span> {request.property?.name || 'N/A'}
                        </p>
                        <p className="text-foreground-600">
                          <span className="font-medium">Unit:</span> {request.unit?.name || request.unit?.unitNumber || 'N/A'}
                        </p>
                      </div>
                    </div>

                    {request.assignee && (
                      <div>
                        <p className="font-medium text-foreground-700 mb-2 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Assigned Technician
                        </p>
                        <div className="space-y-1">
                          <p className="text-foreground-600">
                            <span className="font-medium">Name:</span> {request.assignee.name}
                          </p>
                          {request.assignee.phone && (
                            <p className="text-foreground-600">
                              <span className="font-medium">Phone:</span> {request.assignee.phone}
                            </p>
                          )}
                        </div>
                      </div>
                    )}

                    {request.completedAt && (
                      <div>
                        <p className="font-medium text-foreground-700 mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Completed
                        </p>
                        <p className="text-foreground-600">
                          {format(new Date(request.completedAt), 'MMM d, yyyy h:mm a')}
                        </p>
                      </div>
                    )}
                  </div>

                  {request.notes && request.notes.length > 0 && (
                    <div>
                      <p className="font-medium text-foreground-700 mb-2">Updates</p>
                      <div className="bg-default-100 rounded-lg p-3 space-y-1">
                        {request.notes.map((note) => (
                          <p key={note.id} className="text-sm text-foreground-600">• {note.body}</p>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardBody>
            </Card>
          ))
        )}
      </div>

      {/* Submit Request Modal */}
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        size="2xl"
        scrollBehavior="inside"
        aria-labelledby="submit-maintenance-request-title"
        aria-describedby="submit-maintenance-request-description"
      >
        <ModalContent className="bg-deep-900 border border-white/10">
          <ModalHeader>
            <h2 id="submit-maintenance-request-title" className="text-xl font-semibold">Submit Maintenance Request</h2>
          </ModalHeader>
          <ModalBody id="submit-maintenance-request-description">
            {submitError && (
              <div className="p-3 bg-danger-50 text-danger-700 rounded-md text-sm mb-4">
                {submitError}
              </div>
            )}
            <div className="space-y-4">
              <Input
                label="Request Title"
                placeholder="Brief description of the issue"
                value={newRequest.title}
                onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                isRequired
                aria-label="Maintenance request title"
                classNames={{
                  label: "sr-only", // Visually hidden but accessible
                }}
              />

              <Select
                label="Category"
                placeholder="Select category"
                selectedKeys={newRequest.category ? [newRequest.category] : []}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string | undefined;
                  setNewRequest({ ...newRequest, category: selected || '' });
                }}
                isRequired
                classNames={{
                  label: "sr-only", // Visually hidden but accessible
                }}
              >
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </Select>

              <Select
                label="Priority"
                placeholder="Select priority level"
                selectedKeys={[newRequest.priority]}
                onSelectionChange={(keys) => {
                  const selected = Array.from(keys)[0] as string | undefined;
                  setNewRequest({ ...newRequest, priority: (selected || 'MEDIUM') as MaintenancePriority });
                }}
                isRequired
                classNames={{
                  label: "sr-only", // Visually hidden but accessible
                }}
              >
                {priorityOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>

              <Textarea
                label="Description"
                placeholder="Provide detailed information about the issue..."
                value={newRequest.description}
                onChange={(e) => setNewRequest({ ...newRequest, description: e.target.value })}
                minRows={4}
                isRequired
                classNames={{
                  label: "sr-only", // Visually hidden but accessible
                }}
              />

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Preferred Date (Optional)"
                  value={newRequest.preferredDate}
                  onChange={(e) => setNewRequest({ ...newRequest, preferredDate: e.target.value })}
                  classNames={{
                    label: "sr-only", // Visually hidden but accessible
                  }}
                />
                <Input
                  type="time"
                  label="Preferred Time (Optional)"
                  value={newRequest.preferredTime}
                  onChange={(e) => setNewRequest({ ...newRequest, preferredTime: e.target.value })}
                  classNames={{
                    label: "sr-only", // Visually hidden but accessible
                  }}
                />
              </div>

              <div className="bg-primary-50 border border-primary-200 rounded-lg p-4">
                <p className="text-sm text-foreground-600">
                  <strong>Note:</strong> Emergency requests will be prioritized and addressed within 24 hours.
                  For non-emergency issues, please allow 2-5 business days for scheduling.
                </p>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <Button
              variant="flat"
              onPress={onClose}
              aria-label="Cancel maintenance request submission"
            >
              Cancel
            </Button>
            <Button
              color="primary"
              onPress={handleSubmitRequest}
              isLoading={isSubmitting}
              isDisabled={!newRequest.title || !newRequest.description || !newRequest.category}
              aria-label="Submit maintenance request"
            >
              Submit Request
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default MaintenancePage;
