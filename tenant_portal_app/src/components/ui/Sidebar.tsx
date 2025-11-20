import React, { useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  FileSignature, 
  FileText, 
  Wallet, 
  ScanLine, 
  Shield,
  Calendar,
  DollarSign,
  Users,
  Building2,
  LayoutDashboard,
  MessageSquare,
  Files,
  LifeBuoy,
  LogOut,
  ChevronRight,
  TrendingUp
} from 'lucide-react';

export type UserRole = 'TENANT' | 'PROPERTY_MANAGER' | 'ADMIN';

interface SidebarProps {
  className?: string;
  userRole?: UserRole;
  brandTitle?: string;
  messageCount?: number;
  onLogout?: () => void;
}

interface NavLink {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: UserRole[];
  badge?: number | string;
  showChevron?: boolean;
  showDot?: boolean;
}

const mainNavigationLinks: NavLink[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['TENANT', 'PROPERTY_MANAGER', 'ADMIN'], showChevron: true },
  { path: '/maintenance', label: 'Maintenance', icon: Wrench, roles: ['TENANT'], showChevron: true },
  { path: '/maintenance-management', label: 'Maintenance', icon: Wrench, roles: ['PROPERTY_MANAGER', 'ADMIN'], showChevron: true },
  { path: '/payments', label: 'Payments', icon: Wallet, roles: ['TENANT', 'PROPERTY_MANAGER', 'ADMIN'], showChevron: true },
  { path: '/messaging', label: 'Messages', icon: MessageSquare, roles: ['TENANT', 'PROPERTY_MANAGER', 'ADMIN'] },
  { path: '/lease-management', label: 'Leases', icon: FileSignature, roles: ['PROPERTY_MANAGER', 'ADMIN'] },
  { path: '/rental-applications-management', label: 'Applications', icon: FileText, roles: ['PROPERTY_MANAGER', 'ADMIN'] },
];

const toolsLinks: NavLink[] = [
  { path: '/schedule', label: 'Schedule', icon: Calendar, roles: ['TENANT', 'PROPERTY_MANAGER', 'ADMIN'], showDot: true },
  { path: '/properties', label: 'Properties', icon: Building2, roles: ['PROPERTY_MANAGER', 'ADMIN'], showDot: true },
  { path: '/documents', label: 'Documents', icon: Files, roles: ['TENANT', 'PROPERTY_MANAGER', 'ADMIN'], showDot: true },
  { path: '/expense-tracker', label: 'Expenses', icon: Wallet, roles: ['PROPERTY_MANAGER', 'ADMIN'] },
  { path: '/rent-estimator', label: 'Rent Estimator', icon: ScanLine, roles: ['PROPERTY_MANAGER', 'ADMIN'] },
  { path: '/rent-optimization', label: 'AI Rent Optimization', icon: TrendingUp, roles: ['PROPERTY_MANAGER', 'ADMIN'], showDot: true },
  { path: '/quickbooks', label: 'QuickBooks', icon: DollarSign, roles: ['PROPERTY_MANAGER', 'ADMIN'] },
  { path: '/user-management', label: 'User Management', icon: Users, roles: ['ADMIN'] },
];

const supportLinks: NavLink[] = [
  { path: '/help', label: 'Help Center', icon: LifeBuoy, roles: ['TENANT', 'PROPERTY_MANAGER', 'ADMIN'], showChevron: true },
  { path: '/security-events', label: 'Audit Log', icon: Shield, roles: ['PROPERTY_MANAGER', 'ADMIN'] },
];

export const Sidebar: React.FC<SidebarProps> = ({ 
  className = 'sidebar', 
  userRole = 'TENANT',
  brandTitle = 'Property Suite',
  messageCount = 0,
  onLogout
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const mainLinks = useMemo(() => 
    mainNavigationLinks.filter(link => link.roles.includes(userRole)),
    [userRole]
  );

  const tools = useMemo(() => 
    toolsLinks.filter(link => link.roles.includes(userRole)),
    [userRole]
  );

  const support = useMemo(() => 
    supportLinks.filter(link => link.roles.includes(userRole)),
    [userRole]
  );

  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      navigate('/login');
    }
  };

  return (
    <div className={`${className}`}>
      <div className="brand">
        <div className="logo">
          <Building2 className="w-[18px] h-[18px]" />
        </div>
        <div className="title">{brandTitle}</div>
      </div>

      <div className="side-group">
        <div className="side-label">Main</div>
        {mainLinks.map((link) => {
          const Icon = link.icon;
          const active = isActive(link.path);
          return (
           
              <Link
                key={link.path}
                to={link.path}
                className={`side-item ${active ? 'active' : ''}`}
              >
            
            
              <div className="left">
                <Icon className="icon" />
                <span>{link.label}</span>
              </div>
              {link.badge && <span className="pill">{link.badge}</span>}
              {link.path === '/messaging' && messageCount > 0 && (
                <div className="badge">{messageCount}</div>
              )}
              {link.showChevron && <ChevronRight className="icon" />}
            </Link>
            
            
          );
        })}
      </div>

      {tools.length > 0 && (
        <div className="side-group">
          <div className="side-label">Tools</div>
          {tools.map((link) => {
            const Icon = link.icon;
            return (
             
              <Link
                key={link.path}
                to={link.path}
                data-media-type = "banani button"
                className={`side-item ${isActive(link.path) ? 'active' : ''}`}
              >
                <div className="left">
                  <Icon className="icon" />
                  <span>{link.label}</span>
                </div>
                {link.showDot && <div className="badge-dot"></div>}
              </Link>
                
            );
          })}
        </div>
      )}

      {support.length > 0 && (
        <div className="side-group">
          <div className="side-label">Support</div>
          {support.map((link) => {
            const Icon = link.icon;
            return (
             
              <Link
                key={link.path}
                to={link.path}
                className={`side-item ${isActive(link.path) ? 'active' : ''}`}
                data-media-type = "banani button"
              >
                <div className="left">
                  <Icon className='icon' />
                  <span>{link.label}</span>
                </div>
                {link.showChevron && <ChevronRight className="icon" />}
              </Link>
                
            );
          })}
          <div className="side-item" onClick={handleLogout}>
            <div className="left">
              <LogOut className="w-[16px] h-[16px]" />
              <span>Log out</span>
            </div>
            <div className="badge-dot"></div>
          </div>
        </div>
      )}
    </div>
  );
};