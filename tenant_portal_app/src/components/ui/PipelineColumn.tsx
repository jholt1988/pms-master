import React from 'react';
import { Card, CardBody, CardHeader, Badge } from '@nextui-org/react';

interface PipelineColumnProps {
  title: string;
  description: string;
  count: number;
  leases: Array<{
    id: number;
    tenant: { username: string };
    unit: {
      name: string;
      property?: { name: string } | null;
    };
    endDate: string;
    status: string;
    rentAmount?: number;
  }>;
  onManageLease: (leaseId: number) => void;
}

export const PipelineColumn: React.FC<PipelineColumnProps> = ({
  title,
  description,
  count,
  leases,
  onManageLease,
}) => {
  const displayLeases = leases.slice(0, 4);
  const hasMore = leases.length > 4;

  return (
    <Card className="shadow-medium" role="region" aria-labelledby={`pipeline-${title.replace(/\s+/g, '-').toLowerCase()}`}>
      <CardHeader className="flex-row items-center justify-between px-4 py-3">
        <div className="flex flex-col gap-1">
          <h3 
            id={`pipeline-${title.replace(/\s+/g, '-').toLowerCase()}`}
            className="text-sm font-semibold text-foreground"
          >
            {title}
          </h3>
          <p className="text-xs text-foreground-500">{description}</p>
        </div>
        <Badge 
          content={count} 
          color="primary" 
          size="sm"
          aria-label={`${count} items in ${title}`}
        >
          <div className="w-4 h-4" aria-hidden="true" />
        </Badge>
      </CardHeader>
      <CardBody className="px-4 py-3 pt-0">
        <div className="space-y-2" role="list" aria-label={`Leases in ${title}`}>
          {displayLeases.length === 0 ? (
            <div 
              className="rounded border border-dashed border-default-200 py-6 text-center"
              role="status"
              aria-live="polite"
            >
              <p className="text-xs text-foreground-400">Empty</p>
            </div>
          ) : (
            <>
              {displayLeases.map((lease) => (
                <div 
                  key={lease.id} 
                  className="rounded border border-default-200 bg-default-50 p-2"
                  role="listitem"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold text-foreground">
                      {lease.tenant.username}
                    </span>
                    <span className="text-xs text-foreground-500" aria-label={`Lease ends ${new Date(lease.endDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`}>
                      End {new Date(lease.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    </span>
                  </div>
                  <p className="text-xs text-foreground-500 mb-2">
                    {lease.unit.property ? `${lease.unit.property.name} · ` : ''}{lease.unit.name}
                  </p>
                  <button
                    type="button"
                    onClick={() => onManageLease(lease.id)}
                    className="text-xs font-semibold text-primary hover:text-primary-600"
                    aria-label={`Manage lease for ${lease.tenant.username}`}
                  >
                    Manage
                  </button>
                </div>
              ))}
              {hasMore && (
                <div className="text-center text-xs text-foreground-500" role="status" aria-live="polite">
                  +{leases.length - 4} more
                </div>
              )}
            </>
          )}
        </div>
      </CardBody>
    </Card>
  );
};