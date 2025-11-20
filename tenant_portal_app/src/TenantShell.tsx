import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from './AuthContext';
import NotificationCenter from './NotificationCenter';


export default function TenantShell(): React.ReactElement {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Property Management</h1>
            </div>
            <nav className="hidden md:flex space-x-4">
              <Link
                to="/"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                Maintenance
              </Link>
              <Link
                to="/payments"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                Payments
              </Link>
              <Link
                to="/messaging"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                Messaging
              </Link>
              <Link
                to="/my-lease"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                My Lease
              </Link>
              <Link
                to="/inspections"
                className="px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100"
              >
                Inspections
              </Link>
            </nav>
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
        {/* Mobile Navigation */}
        <div className="md:hidden border-t border-gray-200">
          <nav className="flex space-x-1 px-2 py-2 overflow-x-auto">
            <Link
              to="/"
              className="px-3 py-2 rounded-md text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
            >
              Maintenance
            </Link>
            <Link
              to="/payments"
              className="px-3 py-2 rounded-md text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
            >
              Payments
            </Link>
            <Link
              to="/messaging"
              className="px-3 py-2 rounded-md text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
            >
              Messaging
            </Link>
            <Link
              to="/my-lease"
              className="px-3 py-2 rounded-md text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
            >
              My Lease
            </Link>
            <Link
              to="/inspections"
              className="px-3 py-2 rounded-md text-xs font-medium text-gray-700 hover:text-gray-900 hover:bg-gray-100 whitespace-nowrap"
            >
              Inspections
            </Link>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-6">
          <Outlet />
        </div>
      </main>
    </div>
    </>
  );
}
