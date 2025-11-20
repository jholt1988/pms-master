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
        <div className="search" onClick={onSearchClick}>
          <Search className="" />
          <span>{searchPlaceholder}</span>
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
  );
};