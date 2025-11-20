import React from 'react';
import { Button, Dropdown, DropdownTrigger, DropdownMenu, DropdownItem } from '@nextui-org/react';
import { ChevronDownIcon } from 'lucide-react';

interface ActionItem {
  key: string;
  label: string;
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  startContent?: React.ReactNode;
  isDisabled?: boolean;
  onAction: () => void;
}

interface ActionButtonProps {
  actions: ActionItem[];
  trigger?: React.ReactNode;
  placement?: 'top' | 'bottom' | 'left' | 'right' | 'top-start' | 'top-end' | 'bottom-start' | 'bottom-end' | 'left-start' | 'left-end' | 'right-start' | 'right-end';
  size?: 'sm' | 'md' | 'lg';
  variant?: 'solid' | 'bordered' | 'light' | 'flat' | 'faded' | 'shadow' | 'ghost';
  color?: 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger';
  isDisabled?: boolean;
  className?: string;
}

export const ActionButton: React.FC<ActionButtonProps> = ({
  actions,
  trigger,
  placement = 'bottom-end',
  size = 'sm',
  variant = 'flat',
  color = 'default',
  isDisabled = false,
  className = '',
}) => {
  const handleAction = (key: string) => {
    const action = actions.find(a => a.key === key);
    if (action && !action.isDisabled) {
      action.onAction();
    }
  };

  const defaultTrigger = (
    <Button
      size={size}
      variant={variant}
      color={color}
      isDisabled={isDisabled}
      className={className}
      endContent={<ChevronDownIcon className="w-4 h-4" />}
    >
      Actions
    </Button>
  );

  return (
    <Dropdown placement={placement}>
      <DropdownTrigger>
        {trigger || defaultTrigger}
      </DropdownTrigger>
      <DropdownMenu 
        aria-label="Actions"
        onAction={(key) => handleAction(String(key))}
      >
        {actions.map((action) => (
          <DropdownItem
            key={action.key}
            color={action.color}
            startContent={action.startContent}
            isDisabled={action.isDisabled}
          >
            {action.label}
          </DropdownItem>
        ))}
      </DropdownMenu>
    </Dropdown>
  );
};