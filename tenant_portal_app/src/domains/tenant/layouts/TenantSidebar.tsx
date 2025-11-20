/**
 * Tenant Domain - Sidebar Navigation
 * Tenant-specific navigation component
 */

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Wrench, 
  FileText, 
  Wallet, 
  Building2,
  MessageSquare,
  Calendar,
  LayoutDashboard,
  LogOut,
  ChevronRight
} from 'lucide-react';
import { Button } from '@nextui-org/react';

interface SidebarProps {
  className?: string;
  brandTitle?: string;
  onLogout?: () => void;
}

interface NavLink {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number | string;
  showChevron?: boolean;
  showDot?: boolean;
}

// Tenant-specific navigation links
const mainNavigationLinks: NavLink[] = [
  { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, showChevron: true },
  { path: '/maintenance', label: 'Maintenance', icon: Wrench, showChevron: true },
  { path: '/payments', label: 'Payments', icon: Wallet, showChevron: true },
  { path: '/my-lease', label: 'My Lease', icon: FileText, showChevron: true },
  { path: '/messaging', label: 'Messages', icon: MessageSquare },
  { path: '/inspections', label: 'Inspections', icon: Calendar, showChevron: true },
];

const toolsLinks: NavLink[] = [
  // Note: These routes don't exist yet - will be added in Phase 2
  // { path: '/schedule', label: 'Schedule', icon: Calendar, showDot: true },
  // { path: '/documents', label: 'Documents', icon: Files, showDot: true },
];

const supportLinks: NavLink[] = [
  // Note: Help center route doesn't exist yet - will be added in Phase 2
  // { path: '/help', label: 'Help Center', icon: LifeBuoy, showChevron: true },
];

export const TenantSidebar: React.FC<SidebarProps> = ({ 
  className = 'sidebar', 
  brandTitle = 'Tenant Portal',
  onLogout
}) => {
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    } else {
      // Fallback if no handler provided - navigate to login
      // Note: This should ideally be provided by parent component
      console.warn('No logout handler provided to TenantSidebar');
      navigate('/login');
    }
  };

  const renderNavLink = (link: NavLink) => {
    const isActive = location.pathname === link.path;
    const Icon = link.icon;

    return (
      <Link
        key={link.path}
        to={link.path}
        className={`nav-item ${isActive ? 'active' : ''}`}
      >
        <div className="nav-item-content">
          <Icon className="nav-icon" />
          <span className="nav-label">{link.label}</span>
          {link.badge && (
            <span className="nav-badge">{link.badge}</span>
          )}
          {link.showDot && <span className="nav-dot" />}
          {link.showChevron && <ChevronRight className="nav-chevron" />}
        </div>
      </Link>
    );
  };

  return (
    <aside className={className}>
      {/* Brand Section */}
      <div className="brand-section">
        <Building2 className="brand-icon" />
        <h1 className="brand-title">{brandTitle}</h1>
      </div>

      {/* Main Navigation */}
      <nav className="nav-section">
        <div className="nav-group">
          <h2 className="nav-group-title">Main</h2>
          {mainNavigationLinks.map(renderNavLink)}
        </div>

        {/* Tools */}
        <div className="nav-group">
          <h2 className="nav-group-title">Tools</h2>
          {toolsLinks.map(renderNavLink)}
        </div>

        {/* Support */}
        <div className="nav-group">
          <h2 className="nav-group-title">Support</h2>
          {supportLinks.map(renderNavLink)}
        </div>
      </nav>

      {/* Logout Button */}
      <div className="sidebar-footer">
        <Button
          color="danger"
          variant="flat"
          startContent={<LogOut className="w-4 h-4" />}
          onPress={handleLogout}
          className="w-full"
        >
          Logout
        </Button>
      </div>
    </aside>
  );
};
