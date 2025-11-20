import React from 'react';
import { Card, CardBody } from '@nextui-org/react';

interface StatsCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon?: React.ReactNode;
  valueColor?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  subtitle,
  icon,
  valueColor = 'default',
  className = '',
}) => {
  const getValueColorClass = () => {
    switch (valueColor) {
      case 'primary':
        return 'text-primary-600';
      case 'secondary':
        return 'text-secondary-600';
      case 'success':
        return 'text-success-600';
      case 'warning':
        return 'text-warning-600';
      case 'danger':
        return 'text-danger-600';
      default:
        return 'text-foreground';
    }
  };

  return (
    <Card className={`shadow-medium ${className}`}>
      <CardBody className="p-6">
        <div className="flex items-center justify-between mb-2">
          <p className="text-small font-medium text-foreground-500">{title}</p>
          {icon && <div className="text-foreground-400">{icon}</div>}
        </div>
        <p className={`text-2xl font-bold mb-1 ${getValueColorClass()}`}>
          {value}
        </p>
        {subtitle && (
          <p className="text-tiny text-foreground-400">{subtitle}</p>
        )}
      </CardBody>
    </Card>
  );
};