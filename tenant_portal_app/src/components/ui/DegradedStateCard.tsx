import React from 'react';
import { Card, CardBody, Button } from '@nextui-org/react';
import { AlertTriangle, LifeBuoy } from 'lucide-react';

interface DegradedStateCardProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  homeHref?: string;
  supportHint?: string;
}

export const DegradedStateCard: React.FC<DegradedStateCardProps> = ({
  title = 'We hit a temporary loading issue',
  message,
  onRetry,
  retryLabel = 'Try again',
  homeHref = '/dashboard',
  supportHint = 'If this keeps happening, contact support or your property manager.',
}) => {
  return (
    <Card className="border border-rose-200 bg-rose-50/60">
      <CardBody className="gap-3">
        <div className="flex items-start gap-3">
          <AlertTriangle className="mt-0.5 h-5 w-5 text-rose-700" aria-hidden="true" />
          <div>
            <h2 className="text-base font-semibold text-rose-800">{title}</h2>
            <p className="mt-1 text-sm text-rose-700">{message}</p>
            <p className="mt-2 text-xs text-rose-700/90">{supportHint}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {onRetry && (
            <Button color="danger" variant="flat" onClick={onRetry}>
              {retryLabel}
            </Button>
          )}
          <Button as="a" href={homeHref} variant="light" startContent={<LifeBuoy className="h-4 w-4" aria-hidden="true" />}>
            Go to dashboard
          </Button>
        </div>
      </CardBody>
    </Card>
  );
};
