/**
 * Application Landing Page
 * Informational page explaining the rental application process before starting
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardBody, 
  CardHeader,
  Button,
  Chip
} from '@nextui-org/react';
import { 
  FileText, 
  CheckCircle, 
  Clock,
  DollarSign,
  User,
  Building,
  ArrowRight,
  Info
} from 'lucide-react';

const steps = [
  {
    number: 1,
    title: 'Personal Information',
    description: 'Provide your basic contact details and identification',
    icon: User,
    time: '3 min'
  },
  {
    number: 2,
    title: 'Employment & Income',
    description: 'Share your employment history and income verification',
    icon: DollarSign,
    time: '5 min'
  },
  {
    number: 3,
    title: 'Rental History',
    description: 'Previous rental addresses and landlord references',
    icon: Building,
    time: '4 min'
  },
  {
    number: 4,
    title: 'Review & Submit',
    description: 'Review your application and submit for processing',
    icon: CheckCircle,
    time: '2 min'
  }
];

const requirements = [
  'Valid government-issued ID',
  'Proof of income (pay stubs, tax returns, or employment letter)',
  'Previous landlord contact information',
  'Personal and professional references',
  'Social Security Number or Tax ID',
  'Pet information (if applicable)'
];

export const ApplicationLandingPage: React.FC = () => {
  const navigate = useNavigate();

  const handleStartApplication = () => {
    navigate('/rental-application/form');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center">
          <Chip color="primary" variant="flat" className="mb-4">
            Application Process
          </Chip>
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Apply for Your New Home
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Complete your rental application in 4 easy steps. The process typically takes 15-20 minutes.
          </p>
        </div>

        {/* Timeline */}
        <Card>
          <CardHeader className="flex-col items-start pb-6">
            <h2 className="text-2xl font-semibold">Application Steps</h2>
            <p className="text-sm text-gray-600">Here's what to expect during the application process</p>
          </CardHeader>
          <CardBody>
            <div className="space-y-6">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isLast = index === steps.length - 1;
                
                return (
                  <div key={step.number} className="relative">
                    <div className="flex gap-4">
                      {/* Icon circle */}
                      <div className="shrink-0">
                        <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                          <Icon className="w-6 h-6 text-primary" />
                        </div>
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 pb-8">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Step {step.number}: {step.title}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Clock className="w-4 h-4" />
                            <span>{step.time}</span>
                          </div>
                        </div>
                        <p className="text-gray-600">{step.description}</p>
                      </div>
                    </div>
                    
                    {/* Connector line */}
                    {!isLast && (
                      <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gray-200"></div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>

        {/* Requirements */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">Required Documents</h2>
              </div>
            </CardHeader>
            <CardBody>
              <p className="text-sm text-gray-600 mb-4">
                Have these items ready before you begin:
              </p>
              <ul className="space-y-2">
                {requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <CheckCircle className="w-4 h-4 text-success mt-0.5 shrink-0" />
                    <span className="text-sm text-gray-700">{req}</span>
                  </li>
                ))}
              </ul>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5 text-primary" />
                <h2 className="text-xl font-semibold">What Happens Next?</h2>
              </div>
            </CardHeader>
            <CardBody>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">1. Application Review</h3>
                  <p className="text-sm text-gray-600">
                    Our team will review your application within 24-48 business hours.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">2. Background & Credit Check</h3>
                  <p className="text-sm text-gray-600">
                    We'll run a background and credit check with your permission.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">3. Approval Decision</h3>
                  <p className="text-sm text-gray-600">
                    You'll receive an email with our decision and next steps.
                  </p>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">4. Lease Signing</h3>
                  <p className="text-sm text-gray-600">
                    If approved, we'll prepare your lease agreement for signing.
                  </p>
                </div>
              </div>
            </CardBody>
          </Card>
        </div>

        {/* Important Info */}
        <Card className="bg-blue-50 border-blue-200">
          <CardBody className="p-6">
            <div className="flex gap-3">
              <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-semibold text-blue-900 mb-2">Important Information</h3>
                <ul className="space-y-1 text-sm text-blue-800">
                  <li>• Application fee: $50 (non-refundable)</li>
                  <li>• Your information is encrypted and stored securely</li>
                  <li>• You can save your progress and return later</li>
                  <li>• All fields marked with * are required</li>
                  <li>• Processing time: 1-3 business days</li>
                </ul>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* CTA Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            color="default"
            variant="bordered"
            size="lg"
            onPress={() => navigate(-1)}
          >
            Go Back
          </Button>
          <Button
            color="primary"
            size="lg"
            endContent={<ArrowRight className="w-5 h-5" />}
            onPress={handleStartApplication}
          >
            Start Application
          </Button>
        </div>

        {/* Footer Note */}
        <p className="text-center text-sm text-gray-500">
          Questions about the application process?{' '}
          <a href="/messaging" className="text-primary hover:underline">
            Contact us
          </a>
        </p>
      </div>
    </div>
  );
};

export default ApplicationLandingPage;
