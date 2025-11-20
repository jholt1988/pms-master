import React from 'react';
import { Sidebar } from './Sidebar';
import { Content } from './Content';
import { PageHeader } from './PageHeader';
import { NavTop } from './NavTop';

interface TenantShellProps {
  className?: string;
  children?: React.ReactNode;
  userAvatar?: string;
  onNotificationsClick?: () => void;
  onMessagesClick?: () => void;
}

export const TenantShell: React.FC<TenantShellProps> = ({ 
  className = 'layout',
  children,
  userAvatar = 'https://app.banani.co/avatar1.jpeg',
  onNotificationsClick,
  onMessagesClick
}) => {
  return (
    <div className={`${className}`}>
      <Sidebar userRole="TENANT" />

        <Content>
         
          <NavTop
            userAvatar={userAvatar}
            onNotificationsClick={onNotificationsClick}
            
          />
          <PageHeader title="Tenant Portal" />
            {children}
          </Content>
        </div>

  );
};