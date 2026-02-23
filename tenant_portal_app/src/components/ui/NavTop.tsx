import React from 'react';
import { Search, Bell, Inbox } from 'lucide-react';

interface NavTopProps {
  className?: string;
  userAvatar?: string;
  searchPlaceholder?: string;
  onSearchClick?: () => void;
  onNotificationsClick?: () => void;
  onInboxClick?: () => void;
  onAvatarClick?: () => void;
}

export const NavTop: React.FC<NavTopProps> = ({ 
  className = 'top-nav',
  userAvatar = 'https://app.banani.co/avatar3.jpeg',
  searchPlaceholder = 'Search',
  onSearchClick,
  onNotificationsClick,
  onInboxClick,
  onAvatarClick
}) => {
  return (
    <div className={`${className}`}>
      <div className="left">
        <button 
          className="search" 
          onClick={onSearchClick}
          aria-label={searchPlaceholder}
          type="button"
        >
          <Search className="" aria-hidden="true" />
          <span className="sr-only">{searchPlaceholder}</span>
        </button>
      </div>
      
      <div className="row">
        <button 
          className="btn" 
          onClick={onNotificationsClick}
          aria-label="View notifications, 3 unread alerts"
          type="button"
        >
          <Bell className="w-[16px] h-[16px] mr-1" aria-hidden="true" />
          <span className="sr-only">View</span>Alerts
        </button>
        
        <button 
          className="btn" 
          onClick={onInboxClick}
          aria-label="View inbox"
          type="button"
        >
          <Inbox className="w-[16px] h-[16px] mr-1" aria-hidden="true" />
          <span className="sr-only">View</span>Inbox
        </button>
        
        <button 
          className="avatar" 
          onClick={onAvatarClick}
          aria-label="User profile menu"
          type="button"
        >
          <img 
            src={userAvatar} 
            alt="User avatar" 
            style={{ width: '28px', height: '28px', objectFit: 'cover' }}
          />
        </button>
      </div>
    </div>
  );
};