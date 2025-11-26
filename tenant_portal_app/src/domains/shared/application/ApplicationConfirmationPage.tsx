/**
 * Application Confirmation Page
 * Confirmation page shown after successful rental application submission
 */

import React from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@nextui-org/card';
import { CardBody } from '@nextui-org/card';
import { Button } from '@nextui-org/button';
import { Chip } from '@nextui-org/chip';
import { 
  CheckCircle, 
  Mail, 
  Clock,
  FileText,
  ArrowRight,
  Home,
  Bell
} from 'lucide-react';

export const ApplicationConfirmationPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const confirmationCode = searchParams.get('id') || 'APP-' + Date.now().toString().slice(-6);

  const handleCreateAccount = () => {
    navigate('/signup');
  };

  const handleGoHome = () => {
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4">
      <div className="max-w-2xl w-full space-y-6">
        {/* Success Icon */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-success-100 mb-4">
            <CheckCircle className="w-12 h-12 text-success" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Application Submitted Successfully!
          </h1>
          <p className="text-lg text-gray-600">
            Thank you for applying. We've received your rental application.
          </p>
        </div>

        {/* Confirmation Details */}
        <Card>
          <CardBody className="p-6">
            <div className="text-center space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Your Confirmation Code</p>
                <div className="inline-flex items-center gap-2 bg-gray-100 rounded-lg px-6 py-3">
                  <FileText className="w-5 h-5 text-primary" />
                  <code className="text-2xl font-mono font-bold text-gray-900">
                    {confirmationCode}
                  </code>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Save this code to check your application status
                </p>
              </div>

              <div className="border-t pt-4">
                <Chip color="primary" variant="flat" size="lg">
                  Expected Response Time: 1-3 Business Days
                </Chip>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* What's Next */}
        <Card>
          <CardBody className="p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              What Happens Next?
            </h2>
            <div className="space-y-4">
              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Email Confirmation</h3>
                  <p className="text-sm text-gray-600">
                    You'll receive an email confirmation at the address you provided with a copy of your application.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Application Review</h3>
                  <p className="text-sm text-gray-600">
                    Our team will review your application and run necessary background checks within 1-3 business days.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Decision Notification</h3>
                  <p className="text-sm text-gray-600">
                    You'll be notified via email and SMS about our decision and the next steps.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="shrink-0 w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center text-primary font-semibold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Lease Agreement</h3>
                  <p className="text-sm text-gray-600">
                    If approved, we'll send you the lease agreement to review and sign electronically.
                  </p>
                </div>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Contact Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardBody className="p-6">
            <div className="flex gap-3">
              <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Check Your Email</h3>
                <p className="text-sm text-blue-800">
                  We've sent a confirmation email with your application details and next steps. 
                  If you don't see it within a few minutes, please check your spam folder.
                </p>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Create Account CTA */}
        <Card className="bg-linear-to-r from-primary-50 to-secondary-50">
          <CardBody className="p-6">
            <div className="flex items-start gap-4">
              <div className="shrink-0">
                <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                  <Bell className="w-6 h-6 text-primary" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 mb-2">
                  Create a Tenant Account
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Get instant updates on your application status, and once approved, 
                  manage your lease, submit maintenance requests, and pay rent online.
                </p>
                <Button
                  color="primary"
                  variant="flat"
                  endContent={<ArrowRight className="w-4 h-4" />}
                  onPress={handleCreateAccount}
                >
                  Create Account
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            color="default"
            variant="bordered"
            size="lg"
            startContent={<Home className="w-5 h-5" />}
            onPress={handleGoHome}
          >
            Return to Home
          </Button>
          <Button
            color="primary"
            variant="flat"
            size="lg"
            onPress={handleCreateAccount}
          >
            Create Tenant Account
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500">
          Have questions about your application?{' '}
          <a href="mailto:support@property.com" className="text-primary hover:underline">
            Contact our leasing team
          </a>
        </p>
      </div>
    </div>
  );
};

export default ApplicationConfirmationPage;
