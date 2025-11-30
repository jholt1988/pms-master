import React, { useState, useMemo } from 'react';
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

interface MaintenanceRequest {
  id: number;
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'emergency';
  category: string;
  createdAt: string;
  scheduledDate?: string;
  completedDate?: string;
  assignedContractor?: {
    name: string;
    phone: string;
    company: string;
  };
  unit: string;
  property: string;
  imageUrls?: string[];
  notes?: string[];
}

const mockRequests: MaintenanceRequest[] = [
  {
    id: 1,
    title: 'Leaky faucet in kitchen',
    description: 'The kitchen faucet has been dripping constantly for the past 3 days. Water is pooling under the sink.',
    status: 'in_progress',
    priority: 'high',
    category: 'Plumbing',
    createdAt: '2025-11-03T10:30:00',
    scheduledDate: '2025-11-06T09:00:00',
    unit: '2B',
    property: 'Maple Street Apartments',
    assignedContractor: {
      name: 'John Smith',
      phone: '(555) 123-4567',
      company: 'Quick Fix Plumbing'
    },
    notes: ['Technician contacted', 'Parts ordered']
  },
  {
    id: 2,
    title: 'AC not cooling properly',
    description: 'Air conditioning unit runs but does not cool the apartment. Temperature remains above 78°F.',
    status: 'pending',
    priority: 'medium',
    category: 'HVAC',
    createdAt: '2025-11-04T14:15:00',
    unit: '2B',
    property: 'Maple Street Apartments'
  },
  {
    id: 3,
    title: 'Broken window lock',
    description: 'Living room window lock is broken and window won\'t stay closed properly.',
    status: 'completed',
    priority: 'medium',
    category: 'Repair',
    createdAt: '2025-10-28T11:00:00',
    completedDate: '2025-10-30T15:30:00',
    unit: '2B',
    property: 'Maple Street Apartments',
    assignedContractor: {
      name: 'Mike Johnson',
      phone: '(555) 987-6543',
      company: 'General Repairs Inc'
    }
  }
];

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
  { value: 'low', label: 'Low - Can wait' },
  { value: 'medium', label: 'Medium - Within a week' },
  { value: 'high', label: 'High - Within 2-3 days' },
  { value: 'emergency', label: 'Emergency - Immediate attention' }
];

const MaintenancePage: React.FC = () => {
  const [requests, setRequests] = useState<MaintenanceRequest[]>(mockRequests);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('all');
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  // New request form state
  const [newRequest, setNewRequest] = useState({
    title: '',
    description: '',
    category: '',
    priority: 'medium' as MaintenanceRequest['priority'],
    preferredDate: '',
    preferredTime: ''
  });

  const filteredRequests = useMemo(() => {
    let filtered = requests;

    // Filter by tab
    if (selectedTab !== 'all') {
      filtered = filtered.filter(req => req.status === selectedTab);
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(req => 
        req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        req.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }, [requests, selectedTab, searchQuery]);

  const handleSubmitRequest = () => {
    const request: MaintenanceRequest = {
      id: requests.length + 1,
      title: newRequest.title,
      description: newRequest.description,
      category: newRequest.category,
      priority: newRequest.priority,
      status: 'pending',
      createdAt: new Date().toISOString(),
      unit: '2B',
      property: 'Maple Street Apartments'
    };

    setRequests([request, ...requests]);
    setNewRequest({
      title: '',
      description: '',
      category: '',
      priority: 'medium',
      preferredDate: '',
      preferredTime: ''
    });
    onClose();
  };

  const getPriorityColor = (priority: string): 'default' | 'primary' | 'warning' | 'danger' => {
    switch (priority) {
      case 'emergency': return 'danger';
      case 'high': return 'warning';
      case 'medium': return 'primary';
      default: return 'default';
    }
  };

  const stats = useMemo(() => ({
    total: requests.length,
    pending: requests.filter(r => r.status === 'pending').length,
    in_progress: requests.filter(r => r.status === 'in_progress').length,
    completed: requests.filter(r => r.status === 'completed').length
  }), [requests]);

  return (
    <div className="section">
      <PageHeader
        title="Maintenance Requests"
        subtitle="Submit and track maintenance requests for your unit"
        actions={
          <Button
            color="primary"
            startContent={<Plus className="w-4 h-4" />}
            onPress={onOpen}
          >
            Submit Request
          </Button>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-medium">
          <CardBody className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground-500">Total Requests</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <Wrench className="w-8 h-8 text-primary" />
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
              <Clock className="w-8 h-8 text-warning" />
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
              <Wrench className="w-8 h-8 text-primary" />
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
              <CheckCircle2 className="w-8 h-8 text-success" />
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
              <Wrench className="w-12 h-12 mx-auto mb-4 text-foreground-300" />
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
                      <Chip size="sm" variant="flat">
                        {request.category}
                      </Chip>
                      <Chip 
                        size="sm" 
                        color={getPriorityColor(request.priority)}
                        variant="flat"
                      >
                        {request.priority.toUpperCase()}
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
                  <p className="text-sm text-foreground-600">{request.description}</p>

                  <div className="grid md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-foreground-700 mb-2">Property Details</p>
                      <div className="space-y-1">
                        <p className="text-foreground-600">
                          <span className="font-medium">Property:</span> {request.property}
                        </p>
                        <p className="text-foreground-600">
                          <span className="font-medium">Unit:</span> {request.unit}
                        </p>
                      </div>
                    </div>

                    {request.assignedContractor && (
                      <div>
                        <p className="font-medium text-foreground-700 mb-2 flex items-center gap-2">
                          <User className="w-4 h-4" />
                          Assigned Contractor
                        </p>
                        <div className="space-y-1">
                          <p className="text-foreground-600">
                            <span className="font-medium">Name:</span> {request.assignedContractor.name}
                          </p>
                          <p className="text-foreground-600">
                            <span className="font-medium">Company:</span> {request.assignedContractor.company}
                          </p>
                          <p className="text-foreground-600">
                            <span className="font-medium">Phone:</span> {request.assignedContractor.phone}
                          </p>
                        </div>
                      </div>
                    )}

                    {request.scheduledDate && (
                      <div>
                        <p className="font-medium text-foreground-700 mb-2 flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          Scheduled Visit
                        </p>
                        <p className="text-foreground-600">
                          {format(new Date(request.scheduledDate), 'EEEE, MMM d, yyyy')}
                        </p>
                        <p className="text-foreground-600">
                          {format(new Date(request.scheduledDate), 'h:mm a')}
                        </p>
                      </div>
                    )}

                    {request.completedDate && (
                      <div>
                        <p className="font-medium text-foreground-700 mb-2 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" />
                          Completed
                        </p>
                        <p className="text-foreground-600">
                          {format(new Date(request.completedDate), 'MMM d, yyyy')}
                        </p>
                        <p className="text-foreground-600">
                          {format(new Date(request.completedDate), 'h:mm a')}
                        </p>
                      </div>
                    )}
                  </div>

                  {request.notes && request.notes.length > 0 && (
                    <div>
                      <p className="font-medium text-foreground-700 mb-2">Updates</p>
                      <div className="bg-default-100 rounded-lg p-3 space-y-1">
                        {request.notes.map((note, index) => (
                          <p key={index} className="text-sm text-foreground-600">• {note}</p>
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
      >
        <ModalContent>
          <ModalHeader>
            <h2 className="text-xl font-semibold">Submit Maintenance Request</h2>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4">
              <Input
                label="Request Title"
                placeholder="Brief description of the issue"
                value={newRequest.title}
                onChange={(e) => setNewRequest({ ...newRequest, title: e.target.value })}
                isRequired
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
                  setNewRequest({ ...newRequest, priority: (selected || 'medium') as MaintenanceRequest['priority'] });
                }}
                isRequired
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
              />

              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  type="date"
                  label="Preferred Date (Optional)"
                  value={newRequest.preferredDate}
                  onChange={(e) => setNewRequest({ ...newRequest, preferredDate: e.target.value })}
                />
                <Input
                  type="time"
                  label="Preferred Time (Optional)"
                  value={newRequest.preferredTime}
                  onChange={(e) => setNewRequest({ ...newRequest, preferredTime: e.target.value })}
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
            <Button variant="flat" onPress={onClose}>
              Cancel
            </Button>
            <Button 
              color="primary" 
              onPress={handleSubmitRequest}
              isDisabled={!newRequest.title || !newRequest.description || !newRequest.category}
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
