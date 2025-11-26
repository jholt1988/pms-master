import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Wrench, 
  Wallet, 
  MessageSquare, 
  FileSignature, 
  Building2,
  Home,
  FileText,
  Grid3x3,
  X,
  Calendar,
  Files,
  TrendingUp,
  DollarSign,
  Users,
  Shield,
  ScanLine,
  BarChart3,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../../AuthContext';

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

interface AppItem {
  label: string;
  path: string;
  icon: React.ElementType;
  category?: string;
}

export const DockNavigation: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const userRole = user?.role;
  const [isAllAppsOpen, setIsAllAppsOpen] = useState(false);
  const allAppsRef = useRef<HTMLDivElement>(null);
  
  // Close All Apps menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (allAppsRef.current && !allAppsRef.current.contains(event.target as Node)) {
        setIsAllAppsOpen(false);
      }
    };

    if (isAllAppsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isAllAppsOpen]);
  
  // Define core apps for the dock based on user role
  const getDockItems = (): AppItem[] => {
    if (userRole === 'TENANT') {
      // Tenant-appropriate navigation items
      return [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Maintenance', path: '/maintenance', icon: Wrench },
        { label: 'Payments', path: '/payments', icon: Wallet },
        { label: 'Messages', path: '/messaging', icon: MessageSquare },
        { label: 'My Lease', path: '/my-lease', icon: FileSignature },
        { label: 'Inspections', path: '/inspections', icon: FileText },
      ];
    } else {
      // Property Manager / Admin navigation items
      return [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
        { label: 'Maintenance', path: '/maintenance-management', icon: Wrench },
        { label: 'Payments', path: '/payments', icon: Wallet },
        { label: 'Messages', path: '/messaging', icon: MessageSquare },
        { label: 'Leases', path: '/lease-management', icon: FileSignature },
        { label: 'Properties', path: '/properties', icon: Building2 },
      ];
    }
  };
  
  // Get all available apps for the All Apps menu
  const getAllApps = (): AppItem[] => {
    if (userRole === 'TENANT') {
      return [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'Core' },
        { label: 'Maintenance', path: '/maintenance', icon: Wrench, category: 'Core' },
        { label: 'Payments', path: '/payments', icon: Wallet, category: 'Core' },
        { label: 'Messages', path: '/messaging', icon: MessageSquare, category: 'Core' },
        { label: 'My Lease', path: '/my-lease', icon: FileSignature, category: 'Core' },
        { label: 'Inspections', path: '/inspections', icon: FileText, category: 'Core' },
      ];
    } else {
      return [
        { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, category: 'Core' },
        { label: 'Properties', path: '/properties', icon: Building2, category: 'Core' },
        { label: 'Leases', path: '/lease-management', icon: FileSignature, category: 'Core' },
        { label: 'Maintenance', path: '/maintenance-management', icon: Wrench, category: 'Core' },
        { label: 'Payments', path: '/payments', icon: Wallet, category: 'Core' },
        { label: 'Messages', path: '/messaging', icon: MessageSquare, category: 'Core' },
        { label: 'Applications', path: '/rental-applications-management', icon: ClipboardList, category: 'Management' },
        { label: 'Schedule', path: '/schedule', icon: Calendar, category: 'Management' },
        { label: 'Documents', path: '/documents', icon: Files, category: 'Management' },
        { label: 'Expenses', path: '/expense-tracker', icon: DollarSign, category: 'Financial' },
        { label: 'Rent Estimator', path: '/rent-estimator', icon: ScanLine, category: 'Financial' },
        { label: 'Rent Optimization', path: '/rent-optimization', icon: TrendingUp, category: 'Financial' },
        { label: 'Reporting', path: '/reporting', icon: BarChart3, category: 'Analytics' },
        { label: 'QuickBooks', path: '/quickbooks', icon: DollarSign, category: 'Financial' },
        ...(userRole === 'ADMIN' ? [
          { label: 'User Management', path: '/user-management', icon: Users, category: 'Admin' },
          { label: 'Audit Log', path: '/security-events', icon: Shield, category: 'Admin' },
        ] : []),
      ];
    }
  };
  
  const dockItems = getDockItems();
  const allApps = getAllApps();
  
  const handleAppClick = (path: string) => {
    navigate(path);
    setIsAllAppsOpen(false);
  };

  // Group apps by category
  const appsByCategory = allApps.reduce((acc, app) => {
    const category = app.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(app);
    return acc;
  }, {} as Record<string, AppItem[]>);

  return (
    <>
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

          {/* Divider */}
          <div className="w-px h-12 bg-white/10 mx-2" />

          {/* All Apps Button */}
          <button
            onClick={() => setIsAllAppsOpen(!isAllAppsOpen)}
            className="relative group flex flex-col items-center justify-end pb-2 transition-all duration-300 ease-out"
            style={{
              transform: isAllAppsOpen ? 'translateY(-10px) scale(1.2)' : 'scale(1)',
              margin: '0 8px',
            }}
            aria-label="All Apps"
            aria-expanded={isAllAppsOpen}
          >
            {/* Label Tooltip */}
            <div className={`
              absolute -top-12 bg-deep-800 border border-neon-purple/30 text-neon-purple text-[10px] uppercase tracking-wider px-3 py-1 rounded-full
              opacity-0 transition-opacity duration-200 whitespace-nowrap pointer-events-none
              ${isAllAppsOpen ? 'opacity-100 translate-y-0' : 'translate-y-2'}
            `}>
              All Apps
            </div>

            {/* Icon Container */}
            <div className={`
              relative w-12 h-12 rounded-2xl flex items-center justify-center 
              transition-all duration-300 backdrop-blur-md
              ${isAllAppsOpen 
                ? 'bg-neon-purple/20 border border-neon-purple shadow-[0_0_15px_rgba(112,0,255,0.5)]' 
                : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30'}
            `}>
              <Grid3x3 
                size={24} 
                className={`transition-colors duration-300 ${isAllAppsOpen ? 'text-neon-purple' : 'text-gray-400 group-hover:text-white'}`} 
              />
            </div>
          </button>
        </div>
      </div>

      {/* All Apps Menu */}
      {isAllAppsOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[40] bg-black/60 backdrop-blur-sm"
            onClick={() => setIsAllAppsOpen(false)}
          />
          
          {/* All Apps Grid */}
          <div 
            ref={allAppsRef}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 z-[50] w-full max-w-4xl px-4 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <div className="relative overflow-hidden rounded-3xl bg-glass-surface backdrop-blur-xl border border-glass-highlight shadow-[0_0_100px_-20px_rgba(112,0,255,0.3)] border-neon-purple/30">
              {/* Grid pattern overlay */}
              <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.03]" />
              
              <div className="relative z-10 p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <Grid3x3 size={20} className="text-neon-purple" />
                    <h2 className="text-white font-sans text-lg font-semibold">All Applications</h2>
                  </div>
                  <button
                    onClick={() => setIsAllAppsOpen(false)}
                    className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    aria-label="Close All Apps"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Apps Grid by Category */}
                <div className="space-y-6 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {Object.entries(appsByCategory).map(([category, apps]) => (
                    <div key={category} className="space-y-3">
                      <h3 className="text-xs text-gray-400 font-mono uppercase tracking-wider px-2">
                        {category}
                      </h3>
                      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
                        {apps.map((app) => {
                          const Icon = app.icon;
                          const isActive = location.pathname.startsWith(app.path);
                          return (
                            <button
                              key={app.path}
                              onClick={() => handleAppClick(app.path)}
                              className={`
                                flex flex-col items-center justify-center gap-2 p-4 rounded-xl
                                transition-all duration-200
                                ${isActive
                                  ? 'bg-neon-blue/20 border border-neon-blue/50 shadow-[0_0_15px_rgba(0,240,255,0.3)]'
                                  : 'bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/30 hover:scale-105'}
                              `}
                            >
                              <Icon 
                                size={28} 
                                className={`transition-colors ${isActive ? 'text-neon-blue' : 'text-gray-400'}`}
                              />
                              <span className={`text-xs text-center font-medium ${isActive ? 'text-neon-blue' : 'text-gray-300'}`}>
                                {app.label}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};