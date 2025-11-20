import React from 'react';
import { Chip } from '@nextui-org/react';

interface StatusBadgeProps {
  status: string;
  variant?: 'flat' | 'solid' | 'bordered' | 'light' | 'faded' | 'shadow' | 'dot';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const getStatusColor = (status: string) => {
  const normalizedStatus = status.toUpperCase().replace(/[_\s]/g, '');
  
  // Success states
  if (['ACTIVE', 'COMPLETED', 'APPROVED', 'PAID', 'SUCCESS', 'DELIVERED', 'CONFIRMED'].includes(normalizedStatus)) {
    return 'success';
  }
  
  // Warning states
  if (['PENDING', 'INPROGRESS', 'PROCESSING', 'REVIEW', 'WAITING', 'SCHEDULED', 'PARTIAL'].includes(normalizedStatus)) {
    return 'warning';
  }
  
  // Danger states
  if (['FAILED', 'ERROR', 'REJECTED', 'CANCELLED', 'OVERDUE', 'EXPIRED', 'TERMINATED', 'BLOCKED'].includes(normalizedStatus)) {
    return 'danger';
  }
  
  // Primary states
  if (['NEW', 'DRAFT', 'CREATED', 'ASSIGNED', 'OFFERED', 'RENEWAL'].includes(normalizedStatus)) {
    return 'primary';
  }
  
  // Secondary states
  if (['CLOSED', 'ARCHIVED', 'INACTIVE', 'DISABLED', 'HIDDEN'].includes(normalizedStatus)) {
    return 'secondary';
  }
  
  // Default
  return 'default';
};

const formatStatusLabel = (status: string): string => {
  return status
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant = 'flat',
  size = 'sm',
  className = '',
}) => {
  const color = getStatusColor(status);
  const label = formatStatusLabel(status);

  return (
    <Chip
      color={color}
      variant={variant}
      size={size}
      className={className}
    >
      {label}
    </Chip>
  );
};