import React, { useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import NotificationCenter from './NotificationCenter';

export default function StaffShell(): React.ReactElement {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navigationItems = [
    { to: '/', label: 'Maintenance', icon: '🔧' },
    { to: '/payments', label: 'Payments', icon: '💳' },
    { to: '/messaging', label: 'Messaging', icon: '💬' },
    { to: '/lease-management', label: 'Lease Management', icon: '📄' },
    { to: '/rental-applications-management', label: 'Applications', icon: '📋' },
    { to: '/expense-tracker', label: 'Expense Tracker', icon: '💰' },
    { to: '/rent-estimator', label: 'Rent Estimator', icon: '📊' },
    { to: '/inspection-management', label: 'Inspections', icon: '🔍' },
    { to: '/user-management', label: 'User Management', icon: '👥' },
    { to: '/documents', label: 'Documents', icon: '📁' },
    { to: '/reporting', label: 'Reports', icon: '📈' },
    { to: '/security-events', label: 'Audit Log', icon: '🔒' },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        } fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
            <h1 className="text-lg font-bold text-gray-900">Property Management</h1>
            <button
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              ✕
            </button>
          </div>
          <nav className="flex-1 overflow-y-auto py-4">
            {navigationItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                onClick={() => setSidebarOpen(false)}
              >
                <span className="mr-3">{item.icon}</span>
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden text-gray-500 hover:text-gray-700"
              >
                ☰
              </button>
              <div className="flex-1" />
              <div className="flex items-center space-x-4">
                <NotificationCenter />
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-md"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-4 sm:px-6 lg:px-8 py-8">
            <div className="space-y-8">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

