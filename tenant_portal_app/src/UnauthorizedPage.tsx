/**
 * UnauthorizedPage Component
 * 403 error page for access denied scenarios
 */

import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Card, CardBody, Button } from '@nextui-org/react';
import { ShieldAlert, Home, ArrowLeft, Mail } from 'lucide-react';
import { useAuth } from './AuthContext';

export const UnauthorizedPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const requestedPath = location.state?.from?.pathname || 'the requested page';

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
            {/* Access Denied Icon */}
            <div className="flex justify-center">
              <ShieldAlert className="w-24 h-24 text-warning" />
            </div>

            {/* Error Message */}
            <div>
              <h1 className="text-6xl font-bold text-warning mb-2">403</h1>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Access Denied
              </h2>
              <p className="text-gray-600 max-w-md mx-auto">
                You don't have permission to access this page.
              </p>
            </div>

            {/* Requested Path Info */}
            {requestedPath !== 'the requested page' && (
              <div className="bg-gray-100 rounded-lg p-4 max-w-md mx-auto">
                <p className="text-sm text-gray-700">
                  <strong>Requested:</strong> <code className="text-xs bg-white px-2 py-1 rounded">{requestedPath}</code>
                </p>
                {user && (
                  <p className="text-sm text-gray-600 mt-2">
                    Your role: <span className="font-semibold">{user.role}</span>
                  </p>
                )}
              </div>
            )}

            {/* Explanation */}
            <div className="max-w-md mx-auto">
              <p className="text-sm text-gray-600">
                This page is restricted to specific user roles. If you believe you should have access to this page, please contact your property manager or administrator.
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

            {/* Help Section */}
            <div className="pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-600 mb-3">Need access to this page?</p>
              <div className="flex justify-center">
                <Link to="/messaging">
                  <Button
                    size="sm"
                    variant="flat"
                    color="default"
                    startContent={<Mail className="w-4 h-4" />}
                  >
                    Contact Support
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};

export default UnauthorizedPage;
