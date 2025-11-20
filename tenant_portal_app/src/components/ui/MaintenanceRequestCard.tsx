import React from 'react';
import { Card, CardBody, CardHeader, Chip, Button, Textarea, Select, SelectItem } from '@nextui-org/react';
import { format } from 'date-fns';

interface MaintenanceRequestCardProps {
  request: {
    id: number;
    title: string;
    description: string;
    status: string;
    priority: string;
    createdAt: string;
    property?: { name: string } | null;
    unit?: { name: string } | null;
    assignee?: { name: string } | null;
    tenant?: { username: string } | null;
  };
  priorityLabel: string;
  statusLabel: string;
  canManage: boolean;
  technicians: Array<{ id: number; name: string }>;
  statusOptions: Array<{ value: string; label: string }>;
  noteDraft: string;
  onStatusUpdate: (requestId: number, status: string) => void;
  onAssigneeUpdate: (requestId: number, assigneeId: string) => void;
  onNoteChange: (requestId: number, note: string) => void;
  onNoteSubmit: (requestId: number) => void;
}

const getPriorityColor = (priority: string) => {
  switch (priority.toUpperCase()) {
    case 'EMERGENCY': return 'danger';
    case 'HIGH': return 'warning';
    case 'MEDIUM': return 'primary';
    case 'LOW': return 'default';
    default: return 'default';
  }
};

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'PENDING': return 'warning';
    case 'IN_PROGRESS': return 'primary';
    case 'COMPLETED': return 'success';
    default: return 'default';
  }
};

export const MaintenanceRequestCard: React.FC<MaintenanceRequestCardProps> = ({
  request,
  priorityLabel,
  statusLabel,
  canManage,
  technicians,
  statusOptions,
  noteDraft,
  onStatusUpdate,
  onAssigneeUpdate,
  onNoteChange,
  onNoteSubmit,
}) => {
  return (
    <Card className="shadow-medium">
      <CardHeader className="flex-col items-start px-6 pt-6 pb-3">
        <div className="flex w-full items-start justify-between">
          <div className="flex flex-col gap-2">
            <h3 className="text-lg font-semibold text-foreground">#{request.id} {request.title}</h3>
            <div className="flex gap-2">
              <Chip color={getPriorityColor(request.priority)} size="sm" variant="flat">
                {priorityLabel}
              </Chip>
              <Chip color={getStatusColor(request.status)} size="sm" variant="flat">
                {statusLabel}
              </Chip>
            </div>
          </div>
          <div className="text-right text-sm text-foreground-500">
            <p>{format(new Date(request.createdAt), 'MMM d, yyyy')}</p>
            <p>{format(new Date(request.createdAt), 'h:mm a')}</p>
          </div>
        </div>
      </CardHeader>
      <CardBody className="px-6 pt-0 pb-6">
        <div className="space-y-4">
          <p className="text-sm text-foreground-600">{request.description}</p>
          
          <div className="grid gap-2 text-sm">
            <div className="flex gap-4">
              <span className="font-medium text-foreground-700">Property:</span>
              <span className="text-foreground-600">{request.property?.name || 'Not specified'}</span>
            </div>
            {request.unit && (
              <div className="flex gap-4">
                <span className="font-medium text-foreground-700">Unit:</span>
                <span className="text-foreground-600">{request.unit.name}</span>
              </div>
            )}
            <div className="flex gap-4">
              <span className="font-medium text-foreground-700">Tenant:</span>
              <span className="text-foreground-600">{request.tenant?.username || 'Not specified'}</span>
            </div>
            <div className="flex gap-4">
              <span className="font-medium text-foreground-700">Assigned to:</span>
              <span className="text-foreground-600">{request.assignee?.name || 'Unassigned'}</span>
            </div>
          </div>

          {canManage && (
            <div className="border-t border-divider pt-4 space-y-3">
              <div className="flex gap-3">
                <Select
                  size="sm"
                  label="Status"
                  selectedKeys={[request.status]}
                  onChange={(e) => onStatusUpdate(request.id, e.target.value)}
                  className="flex-1"
                >
                  {statusOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </Select>
                <Select
                  size="sm"
                  label="Assignee"
                  selectedKeys={request.assignee ? [String(request.assignee)] : []}
                  onChange={(e) => onAssigneeUpdate(request.id, e.target.value)}
                  className="flex-1"
                >
                  {[{ id: '', name: 'Unassigned' }, ...technicians].map((tech) => (
                    <SelectItem key={tech.id || 'unassigned'} value={String(tech.id)}>
                      {tech.name}
                    </SelectItem>
                  ))}
                </Select>
              </div>
              
              <div className="flex gap-2">
                <Textarea
                  size="sm"
                  placeholder="Add a note..."
                  value={noteDraft}
                  onChange={(e) => onNoteChange(request.id, e.target.value)}
                  className="flex-1"
                  minRows={2}
                />
                <Button
                  color="primary"
                  size="sm"
                  isDisabled={!noteDraft.trim()}
                  onClick={() => onNoteSubmit(request.id)}
                  className="self-end"
                >
                  Add Note
                </Button>
              </div>
            </div>
          )}
        </div>
      </CardBody>
    </Card>
  );
};