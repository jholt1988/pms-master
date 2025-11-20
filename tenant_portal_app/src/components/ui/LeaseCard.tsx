import React from 'react';
import { Card, CardBody, CardHeader, Chip, Button } from '@nextui-org/react';
import { format } from 'date-fns';

interface LeaseCardProps {
  lease: {
    id: number;
    tenant?: { username: string };
    unit: {
      name: string;
      property?: { name: string } | null;
    };
    endDate: string;
    status: string;
    rentAmount?: number;
  };
  onManage: (leaseId: number) => void;
}

const getStatusColor = (status: string) => {
  switch (status.toUpperCase()) {
    case 'ACTIVE': return 'success';
    case 'DRAFT': return 'default';
    case 'PENDING_APPROVAL': return 'warning';
    case 'RENEWAL_PENDING': return 'primary';
    case 'NOTICE_GIVEN': return 'warning';
    case 'TERMINATING': return 'danger';
    case 'TERMINATED': return 'danger';
    case 'HOLDOVER': return 'warning';
    case 'CLOSED': return 'default';
    default: return 'default';
  }
};

const formatDate = (dateString: string) => {
  try {
    return format(new Date(dateString), 'MMM d, yyyy');
  } catch {
    return dateString;
  }
};

export const LeaseCard: React.FC<LeaseCardProps> = ({ lease, onManage }) => {
  return (
    <Card className="shadow-medium">
      <CardHeader className="flex-row items-center justify-between px-4 py-3">
        <div className="flex flex-col gap-1">
          <h3 className="font-semibold text-foreground">{lease.tenant?.username ?? 'Tenant'}</h3>
          <p className="text-sm text-foreground-500">
            {lease.unit.property ? `${lease.unit.property.name} · ` : ''}{lease.unit.name}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <Chip color={getStatusColor(lease.status)} size="sm" variant="flat">
            {lease.status.replace('_', ' ')}
          </Chip>
          <span className="text-xs text-foreground-500">End {formatDate(lease.endDate)}</span>
        </div>
      </CardHeader>
      <CardBody className="px-4 py-3 pt-0">
        <div className="flex items-center justify-between">
          {lease.rentAmount && (
            <span className="text-sm font-medium text-foreground">
              ${lease.rentAmount.toLocaleString()}/mo
            </span>
          )}
          <Button
            size="sm"
            color="primary"
            variant="flat"
            onClick={() => onManage(lease.id)}
          >
            Manage
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};
