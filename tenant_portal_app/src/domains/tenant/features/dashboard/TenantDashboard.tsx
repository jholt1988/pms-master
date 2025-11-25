/**
 * Tenant Dashboard
 * Overview page for tenant users showing key information at a glance
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Card, 
  CardBody, 
  CardHeader,
  Button,
  Chip
} from '@nextui-org/react';
import { 
  DollarSign, 
  Wrench, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAuth } from '../../../../AuthContext';
import { PageHeader } from '../../../../components/ui/PageHeader';

interface DashboardData {
  nextRentPayment?: {
    amount: number;
    dueDate: string;
    isPaid: boolean;
  };
  maintenanceRequests: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  lease?: {
    unit: string;
    property: string;
    startDate: string;
    endDate: string;
    daysUntilRenewal?: number;
    status: string;
  };
  recentActivity: Array<{
    id: number;
    type: 'payment' | 'maintenance' | 'lease' | 'message';
    title: string;
    date: string;
    status?: string;
  }>;
}

const mockData: DashboardData = {
  nextRentPayment: {
    amount: 1500,
    dueDate: '2025-12-01',
    isPaid: false
  },
  maintenanceRequests: {
    total: 5,
    pending: 1,
    inProgress: 2,
    completed: 2
  },
  lease: {
    unit: '2A',
    property: 'Sunset Apartments',
    startDate: '2025-01-01',
    endDate: '2025-12-31',
    daysUntilRenewal: 55,
    status: 'ACTIVE'
  },
  recentActivity: [
    { id: 1, type: 'maintenance', title: 'HVAC repair completed', date: '2025-11-03', status: 'completed' },
    { id: 2, type: 'payment', title: 'Rent payment processed', date: '2025-11-01', status: 'paid' },
    { id: 3, type: 'maintenance', title: 'Plumbing issue reported', date: '2025-10-28', status: 'in_progress' },
  ]
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

const getDaysUntil = (dateString: string) => {
  const target = new Date(dateString);
  const today = new Date();
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

export const TenantDashboard: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch('/api/tenant/dashboard', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setData(data);
        }
      } catch (error) {
        console.error('Error fetching tenant dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  if (loading) {
    return <p>Loading...</p>;
  }

  if (!data) {
    return <p>Could not load dashboard data.</p>;
  }

  const daysUntilRent = data.nextRentPayment ? getDaysUntil(data.nextRentPayment.dueDate) : 0;
  const rentDueStatus = daysUntilRent <= 3 ? 'danger' : daysUntilRent <= 7 ? 'warning' : 'success';

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Dashboard"
        subtitle="Welcome back! Here's an overview of your rental."
      />

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Next Rent Payment */}
        {data.nextRentPayment && !data.nextRentPayment.isPaid && (
          <Link to="/payments">
            <Card className="border-l-4 border-l-primary">
              <CardBody className="p-4">
                {/* ... (Next Rent Payment card content) */}
              </CardBody>
            </Card>
          </Link>
        )}

        {/* Maintenance Requests */}
        <Link to="/maintenance">
          <Card>
            <CardBody className="p-4">
              {/* ... (Maintenance Requests card content) */}
            </CardBody>
          </Card>
        </Link>

        {/* Lease Status */}
        {data.lease && (
          <Link to="/my-lease">
            <Card>
              <CardBody className="p-4">
                {/* ... (Lease Status card content) */}
              </CardBody>
            </Card>
          </Link>
        )}

        {/* Quick Actions */}
        <Card className="bg-linear-to-br from-primary-50 to-primary-100">
          <CardBody className="p-4">
            {/* ... (Quick Actions card content) */}
          </CardBody>
        </Card>
      </div>

      {/* ... (rest of the dashboard) */}
    </div>
  );
};

export default TenantDashboard;
