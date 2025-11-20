/**
 * Tenant Domain - Shell Layout
 * Main layout wrapper for tenant portal
 */

import React from 'react';
import { Outlet } from 'react-router-dom';
import { TenantSidebar } from './TenantSidebar';
import { Search, Bell, Inbox } from 'lucide-react';

interface TenantShellProps {
  className?: string;
  userAvatar?: string;
  onNotificationsClick?: () => void;
  onInboxClick?: () => void;
  onSearchClick?: () => void;
  onAvatarClick?: () => void;
  onLogout?: () => void;
}

export const TenantShell: React.FC<TenantShellProps> = ({ 
  className = 'layout',
  userAvatar = 'https://app.banani.co/avatar1.jpeg',
  onNotificationsClick,
  onInboxClick,
  onSearchClick,
  onAvatarClick,
  onLogout
}) => {
  return (
    <div className={className}>
      <TenantSidebar onLogout={onLogout} />

      <div className="content">
        {/* Top Navigation Bar */}
        <div className="top-nav">
          <div className="left">
            <div className="search" onClick={onSearchClick}>
              <Search />
              <span>Search</span>
            </div>
          </div>
          
          <div className="row">
            <div className="btn" onClick={onNotificationsClick}>
              <Bell className="w-[16px] h-[16px] mr-1" />
              Alerts
            </div>
            
            <div className="btn" onClick={onInboxClick}>
              <Inbox className="w-[16px] h-[16px] mr-1" />
              Inbox
            </div>
            
            <div className="avatar" onClick={onAvatarClick}>
              <img 
                src={userAvatar} 
                alt="User avatar" 
                style={{ width: '28px', height: '28px', objectFit: 'cover' }}
              />
            </div>
          </div>
        </div>

        {/* Main Content Area - renders routed components */}
        <Outlet />
      </div>
    </div>
  );
};
