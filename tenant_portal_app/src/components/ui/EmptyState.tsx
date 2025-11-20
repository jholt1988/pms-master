import React from 'react';
import { Card, CardBody, Button } from '@nextui-org/react';

interface EmptyStateProps {
  title?: string;
  message?: string;
  icon?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
    color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  };
  className?: string;
  variant?: 'card' | 'inline';
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  title = 'No data found',
  message = 'There are no items to display.',
  icon,
  action,
  className = '',
  variant = 'card',
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-4 text-center">
      {icon && (
        <div className="text-foreground-300">
          {icon}
        </div>
      )}
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-foreground-500">{message}</p>
      </div>
      {action && (
        <Button
          color={action.color || 'primary'}
          variant="flat"
          onClick={action.onClick}
        >
          {action.label}
        </Button>
      )}
    </div>
  );

  if (variant === 'card') {
    return (
      <Card className={`border-dashed ${className}`}>
        <CardBody className="py-12">
          {content}
        </CardBody>
      </Card>
    );
  }

  // inline variant
  return (
    <div className={`py-12 ${className}`}>
      {content}
    </div>
  );
};