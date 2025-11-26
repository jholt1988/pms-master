import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Building2, 
  LogOut,
  Bell,
  User,
  Search
} from 'lucide-react';
import { AIOperatingSystem } from './AIOperatingSystem'; // Assuming you have this from previous step

interface TopbarProps {
  className?: string;
  userRole?: string;
  onLogout?: () => void;
}

export const Topbar: React.FC<TopbarProps> = ({ 
  className = '', 
  userRole = 'Property Manager',
  onLogout 
}) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      navigate('/login');
    }
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

        {/* User Profile Pill */}
        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <div className="text-right hidden sm:block">
                <div className="text-xs text-white font-medium">Admin User</div>
                <div className="text-[10px] text-neon-blue font-mono">{userRole}</div>
            </div>
            <div className="w-8 h-8 rounded-full bg-linear-to-tr(from-neon-blue to-purple-500) p-[1px]">
                <div className="w-full h-full rounded-full bg-black flex items-center justify-center">
                    <User size={14} className="text-white" />
                </div>
            </div>
        </div>
        
        {/* Logout */}
        <button 
            onClick={handleLogout}
            className="ml-2 p-2 text-red-400/70 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-all"
            title="Terminate Session"
            aria-label="Logout"
        >
          <LogOut size={18} />
        </button>
      </div>
    </div>
  );
};