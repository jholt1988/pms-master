import React from 'react';
import { Card, CardBody, Spinner } from '@nextui-org/react';

interface LoadingStateProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  variant?: 'card' | 'inline' | 'overlay';
}

export const LoadingState: React.FC<LoadingStateProps> = ({
  message = 'Loading...',
  size = 'md',
  className = '',
  variant = 'card',
}) => {
  const content = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Spinner size={size} />
      <p className="text-sm text-foreground-500">{message}</p>
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

  if (variant === 'overlay') {
    return (
      <div className={`absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 ${className}`}>
        {content}
      </div>
    );
  }

  // inline variant
  return (
    <div className={`py-8 ${className}`}>
      {content}
    </div>
  );
};