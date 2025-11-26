/**
 * Property Manager Dashboard
 * Overview page for property manager users showing key metrics and pending tasks
 */

import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Card,
  CardBody,
  CardHeader,
  Button,
  Chip,
  Progress
} from '@nextui-org/react';
import {
  Building2,
  Wrench,
  DollarSign,
  FileText,
  AlertTriangle,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { PageHeader } from './components/ui/PageHeader';
import { apiFetch } from './services/apiClient';

interface DashboardMetrics {
  occupancy: {
    total: number;
    occupied: number;
    vacant: number;
    percentage: number;
  };
  financials: {
    monthlyRevenue: number;
    collectedThisMonth: number;
    outstanding: number;
  };
  maintenance: {
    total: number;
    pending: number;
    inProgress: number;
    overdue: number;
  };
  applications: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
  };
  recentActivity: Array<{
    id: number;
    type: 'maintenance' | 'application' | 'payment' | 'lease';
    title: string;
    date: string;
    priority?: 'high' | 'medium' | 'low';
  }>;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};

export const PropertyManagerDashboard: React.FC = () => {
  const { token } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      try {
        const data = await apiFetch('/dashboard/metrics', { token });
        setMetrics(data);
      } catch (error) {
        console.error('Error fetching dashboard metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [token]);

  if (loading) {
    return <p>Loading dashboard...</p>;
  }

  if (!metrics) {
    return <p>Could not load dashboard metrics.</p>;
  }

  const collectionRate = metrics.financials?.monthlyRevenue
    ? Math.round((metrics.financials?.collectedThisMonth / metrics.financials?.monthlyRevenue) * 100)
    : 0;

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="Dashboard"
        subtitle="Property management overview and key metrics"
      />

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Occupancy Rate */}
        <Link to="/properties">
          <Card className="border-l-4 border-l-success">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-foreground-500">Occupancy Rate</p>
                  <p className="text-2xl font-semibold text-foreground">{metrics.occupancy?.percentage}%</p>
                </div>
                <Chip color="success" variant="flat">Live</Chip>
              </div>
              <p className="text-sm text-foreground-500 mt-3">
                {metrics.occupancy?.occupied} of {metrics.occupancy?.total} units occupied ({metrics.occupancy?.vacant} vacant)
              </p>
              <Progress
                value={metrics.occupancy?.percentage}
                size="sm"
                className="mt-4"
              />
            </CardBody>
          </Card>
        </Link>

        {/* Monthly Revenue */}
        <Link to="/reporting">
          <Card className="border-l-4 border-l-primary">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-foreground-500">Monthly Revenue</p>
                  <p className="text-2xl font-semibold text-foreground">{formatCurrency(metrics.financials.monthlyRevenue)}</p>
                </div>
                <Chip color="primary" variant="flat">{collectionRate}% collected</Chip>
              </div>
              <div className="mt-3">
                <p className="text-sm text-foreground-500">Collected: {formatCurrency(metrics.financials.collectedThisMonth)}</p>
                <p className="text-sm text-foreground-500">Outstanding: {formatCurrency(metrics.financials.outstanding)}</p>
              </div>
              <Progress
                value={Math.min(collectionRate, 100)}
                size="sm"
                className="mt-4"
              />
            </CardBody>
          </Card>
        </Link>

        {/* Maintenance Requests */}
        <Link to="/maintenance-management">
          <Card className="border-l-4 border-l-warning">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-foreground-500">Maintenance Requests</p>
                  <p className="text-2xl font-semibold text-foreground">{metrics.maintenance?.total}</p>
                </div>
                <Chip color="warning" variant="flat">{metrics.maintenance?.overdue} overdue</Chip>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <div className="text-center">
                  <p className="text-foreground-500">Pending</p>
                  <p className="font-semibold text-foreground">{metrics.maintenance?.pending}</p>
                </div>
                <div className="text-center">
                  <p className="text-foreground-500">In progress</p>
                  <p className="font-semibold text-foreground">{metrics.maintenance?.inProgress}</p>
                </div>
                <div className="text-center">
                  <p className="text-foreground-500">Overdue</p>
                  <p className="font-semibold text-foreground">{metrics.maintenance?.overdue}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>

        {/* Applications */}
        <Link to="/rental-applications-management">
          <Card className="border-l-4 border-l-secondary">
            <CardBody className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-foreground-500">Rental Applications</p>
                  <p className="text-2xl font-semibold text-foreground">{metrics.applications.total}</p>
                </div>
                <Chip color="secondary" variant="flat">{metrics.applications.pending} pending</Chip>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-3 text-xs">
                <div className="text-center">
                  <p className="text-foreground-500">Approved</p>
                  <p className="font-semibold text-foreground">{metrics.applications.approved}</p>
                </div>
                <div className="text-center">
                  <p className="text-foreground-500">Rejected</p>
                  <p className="font-semibold text-foreground">{metrics.applications.rejected}</p>
                </div>
                <div className="text-center">
                  <p className="text-foreground-500">Pending</p>
                  <p className="font-semibold text-foreground">{metrics.applications.pending}</p>
                </div>
              </div>
            </CardBody>
          </Card>
        </Link>
      </div>

      {/* ... (rest of the dashboard) */}
      <Card>
        <CardHeader>
          <div>
            <p className="text-xs uppercase tracking-wider text-foreground-500">Recent Activity</p>
            <p className="text-lg font-semibold text-foreground">Latest updates from operations</p>
          </div>
          <Button size="sm" variant="flat">
            View all
          </Button>
        </CardHeader>
        <CardBody className="space-y-4">
          {metrics.recentActivity.map((activity) => (
            <div key={activity.id} className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-foreground">{activity.title}</p>
                <p className="text-xs text-foreground-500">{formatDate(activity.date)}</p>
              </div>
              <Chip color={activity.priority === 'high' ? 'danger' : activity.priority === 'medium' ? 'warning' : 'default'} variant="flat">
                {activity.type}
              </Chip>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
};

export default PropertyManagerDashboard;
