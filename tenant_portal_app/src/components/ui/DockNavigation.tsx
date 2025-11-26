import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wrench, 
  Wallet, 
  MessageSquare, 
  FileSignature, 
  Building2
} from 'lucide-react';

interface DockItemProps {
  icon: React.ElementType;
  label: string;
  path: string;
  isActive: boolean;
}

const DockItem: React.FC<DockItemProps> = ({ icon: Icon, label, path, isActive }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Link 
      to={path}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative group flex flex-col items-center justify-end pb-2 transition-all duration-300 ease-out"
      style={{
        // Dynamic scaling for that "macOS Dock" wave effect
        transform: isHovered ? 'translateY(-10px) scale(1.2)' : 'scale(1)',
        margin: '0 8px', // Spacing between icons
      }}
      aria-label={label}
      role="button"
      tabIndex={0}
    >
      {/* Label Tooltip (Digital Twin Style) */}
      <div className={`
        absolute -top-12 bg-deep-800 border border-neon-blue/30 text-neon-blue text-[10px] uppercase tracking-wider px-3 py-1 rounded-full
        opacity-0 transition-opacity duration-200 whitespace-nowrap pointer-events-none
        ${isHovered ? 'opacity-100 translate-y-0' : 'translate-y-2'}
      `}>
        {label}
      </div>

      {/* Icon Container */}
      <div className={`
        relative w-12 h-12 rounded-2xl flex items-center justify-center 
        transition-all duration-300 backdrop-blur-md
        ${isActive 
          ? 'bg-neon-blue/20 border border-neon-blue shadow-[0_0_15px_rgba(0,240,255,0.5)]' 
          : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30'}
      `}>
        <Icon 
          size={24} 
          className={`transition-colors duration-300 ${isActive ? 'text-neon-blue' : 'text-gray-400 group-hover:text-white'}`} 
        />
        
        {/* Active Indicator Dot */}
        {isActive && (
          <div className="absolute -bottom-2 w-1 h-1 bg-neon-blue rounded-full shadow-[0_0_5px_#00f0ff]" />
        )}
      </div>
    </Link>
  );
};

export const DockNavigation: React.FC = () => {
  const location = useLocation();
  
  // Define core apps for the dock (High Frequency Usage) - Exactly 6 items
  const dockItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Maintenance', path: '/maintenance-management', icon: Wrench },
    { label: 'Payments', path: '/payments', icon: Wallet },
    { label: 'Messages', path: '/messaging', icon: MessageSquare },
    { label: 'Leases', path: '/lease-management', icon: FileSignature },
    { label: 'Properties', path: '/properties', icon: Building2 },
  ];

  return (
    <div className="flex items-end">
      {/* The Glass Dock Container */}
      <div className="
        flex items-center px-4 pb-2 pt-3 h-20
        bg-glass-surface backdrop-blur-2xl 
        border border-white/10 border-b-0 rounded-t-3xl rounded-b-3xl
        shadow-[0_10px_50px_-10px_rgba(0,0,0,0.5)]
      ">
        {/* Render Core Dock Items */}
        {dockItems.map((item) => (
          <DockItem 
            key={item.path}
            {...item}
            isActive={location.pathname.startsWith(item.path)}
          />
        ))}

      </div>
    </div>
  );
};