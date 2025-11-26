import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  LogOut,
  Bell,
  User,
  Search,
  Settings
} from 'lucide-react';
import { AIOperatingSystem } from './AIOperatingSystem';
import { UserProfileMenu } from './UserProfileMenu';
import { SettingsMenu } from './SettingsMenu';
import { useAuth } from '../../AuthContext';

interface TopbarProps {
  className?: string;
  userRole?: string;
  onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ 
  className = '', 
  userRole: propUserRole,
  onLogout 
}) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isSettingsMenuOpen, setIsSettingsMenuOpen] = useState(false);
  
  // Use user role from auth context, fallback to prop
  const userRole = user?.role === 'TENANT' 
    ? 'Tenant' 
    : user?.role === 'PROPERTY_MANAGER' 
      ? 'Property Manager'
      : user?.role === 'ADMIN'
        ? 'Administrator'
        : propUserRole || 'User';
  
  const displayName = user?.username || 'User';

  const handleLogout = () => {
    // Close any open menus
    setIsProfileMenuOpen(false);
    setIsSettingsMenuOpen(false);
    
    // Call logout from auth context
    logout();
    
    // Call custom logout handler if provided
    if (onLogout) {
      onLogout();
    }
    
    // Navigate to login page
    navigate('/login');
  };

  return (
    <div className={`
      fixed top-0 left-0 w-full h-16 z-50 px-6 
      flex items-center justify-between 
      bg-deep-900/80 backdrop-blur-md border-b border-white/5
      ${className}
    `}>
      {/* Left: Brand & Search */}
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-2 text-white">
          <div className="p-1.5 bg-neon-blue/20 rounded-lg border border-neon-blue/50">
            <Building2 className="w-5 h-5 text-neon-blue" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold tracking-wide leading-none">PMS.OS</span>
            <span className="text-[10px] text-gray-500 font-mono">V4.0.1</span>
          </div>
        </div>

        {/* Quick Search HUD */}
        <div className="hidden md:flex items-center relative group">
            <Search className="absolute left-3 text-gray-600 w-4 h-4 group-focus-within:text-neon-blue transition-colors" />
            <input 
                type="text" 
                placeholder="Search protocols..." 
                className="bg-black/20 border border-white/10 rounded-full py-1.5 pl-9 pr-4 text-xs text-white w-64 focus:w-80 transition-all focus:border-neon-blue/30 focus:outline-none font-mono"
                aria-label="Search"
                role="searchbox"
            />
        </div>
      </div>
      
      {/* Center: AI Orb (The visual anchor) */}
      <div className="absolute left-1/2 -translate-x-1/2">
          <AIOperatingSystem  />
      </div>
      
      {/* Right: User & Actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <button 
          className="relative p-2 text-gray-400 hover:text-white transition-colors"
          aria-label="View notifications"
          aria-describedby="notification-count"
        >
            <Bell size={18} />
            <span 
              id="notification-count"
              className="absolute top-1.5 right-2 w-2 h-2 bg-neon-pink rounded-full animate-pulse"
              aria-label="Unread notifications"
            ></span>
        </button>

        {/* Settings Button */}
        <button
          onClick={() => setIsSettingsMenuOpen(true)}
          className="p-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-all"
          aria-label="Open settings"
        >
          <Settings size={18} />
        </button>

        {/* User Profile Pill */}
        <button
          onClick={() => setIsProfileMenuOpen(true)}
          className="flex items-center gap-3 pl-4 border-l border-white/10 hover:bg-white/5 rounded-lg transition-all"
        >
          <div className="text-right hidden sm:block">
            <div className="text-xs text-white font-medium">{displayName}</div>
            <div className="text-[10px] text-neon-blue font-mono">{userRole}</div>
          </div>
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-neon-blue to-purple-500 p-[1px]">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
              <User size={14} className="text-white" />
            </div>
          </div>
        </button>
      </div>

      {/* User Profile Menu */}
      <UserProfileMenu
        isOpen={isProfileMenuOpen}
        onClose={() => setIsProfileMenuOpen(false)}
        user={{
          id: user?.sub as number || 0,
          username: displayName,
          email: (user as any)?.email || '',
          phone: (user as any)?.phone || '',
          role: userRole,
        }}
        onLogout={handleLogout}
      />

      {/* Settings Menu */}
      <SettingsMenu
        isOpen={isSettingsMenuOpen}
        onClose={() => setIsSettingsMenuOpen(false)}
      />
    </div>
  );
};