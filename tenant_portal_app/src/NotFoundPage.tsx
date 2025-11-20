/**
 * NotFoundPage Component
 * 404 error page with role-based navigation suggestions
 */

import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardBody, Button } from '@nextui-org/react';
import { Home, FileQuestion, ArrowLeft } from 'lucide-react';
import { useAuth } from './AuthContext';

export const NotFoundPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGoBack = () => {
    navigate(-1);
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    return '/dashboard'; // Both roles now have a dashboard
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="max-w-2xl w-full">
        <CardBody className="p-12">
          <div className="text-center space-y-6">
            {/* 404 Icon */}
            <div className="flex justify-center">
              <FileQuestion className="w-24 h-24 text-gray-400" />
            </div>

            {/* Error Code */}
            <div>
              <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Page Not Found
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                The page you're looking for doesn't exist or has been moved.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button
                color="default"
                variant="bordered"
                startContent={<ArrowLeft className="w-4 h-4" />}
                onPress={handleGoBack}
              >
                Go Back
              </Button>
              
              {user ? (
                <Link to={getDashboardLink()}>
                  <Button
                    color="primary"
                    startContent={<Home className="w-4 h-4" />}
                  >
                    Go to Dashboard
                  </Button>
                </Link>
              ) : (
                <Link to="/login">
                  <Button
                    color="primary"
                    startContent={<Home className="w-4 h-4" />}
                  >
                    Go to Login
                  </Button>
                </Link>
              )}
            </div>

            {/* Helpful Links */}
            {user && (
              <div className="pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-600 mb-3">Quick Links:</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {user.role === 'TENANT' ? (
                    <>
                      <Link to="/maintenance">
                        <Button size="sm" variant="flat" color="primary">
                          Maintenance
                        </Button>
                      </Link>
                      <Link to="/payments">
                        <Button size="sm" variant="flat" color="primary">
                          Payments
                        </Button>
                      </Link>
                      <Link to="/my-lease">
                        <Button size="sm" variant="flat" color="primary">
                          My Lease
                        </Button>
                      </Link>
                      <Link to="/messaging">
                        <Button size="sm" variant="flat" color="primary">
                          Messages
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      <Link to="/lease-management">
                        <Button size="sm" variant="flat" color="primary">
                          Leases
                        </Button>
                      </Link>
                      <Link to="/rental-applications-management">
                        <Button size="sm" variant="flat" color="primary">
                          Applications
                        </Button>
                      </Link>
                      <Link to="/maintenance">
                        <Button size="sm" variant="flat" color="primary">
                          Maintenance
                        </Button>
                      </Link>
                      <Link to="/expense-tracker">
                        <Button size="sm" variant="flat" color="primary">
                          Expenses
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default NotFoundPage;
