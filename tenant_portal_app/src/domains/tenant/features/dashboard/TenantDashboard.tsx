/**
 * Tenant Dashboard
 * Comprehensive overview page for tenant users showing key information at a glance
 * P0-002: Fully accessible with ARIA labels and semantic HTML
 */

import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Card, 
  CardBody, 
  CardHeader,
  Button,
  Chip,
  Progress,
  Spinner
} from '@nextui-org/react';
import { 
  DollarSign, 
  Wrench, 
  FileText, 
  AlertCircle,
  CheckCircle,
  Clock,
  Calendar,
  Home,
  MessageSquare,
  ArrowRight,
  Plus,
  TrendingUp,
  Bell,
  CreditCard,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../../../AuthContext';
import { PageHeader } from '../../../../components/ui/PageHeader';
import { StatsCard } from '../../../../components/ui/StatsCard';
import { GlassCard } from '../../../../components/ui/GlassCard';
import { StatusBadge } from '../../../../components/ui/StatusBadge';
import { LoadingState } from '../../../../components/ui/LoadingState';
import { EmptyState } from '../../../../components/ui/EmptyState';
import { apiFetch } from '../../../../services/apiClient';

interface DashboardData {
  nextRentPayment?: {
    amount: number;
    dueDate: string;
    isPaid: boolean;
    invoiceId?: number;
  };
  maintenanceRequests: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
    urgent: number;
  };
  lease?: {
    id: number;
    unit: string;
    property: string;
    propertyAddress: string;
    startDate: string;
    endDate: string;
    daysUntilRenewal?: number;
    status: string;
    monthlyRent: number;
  };
  recentActivity: Array<{
    id: number;
    type: 'payment' | 'maintenance' | 'lease' | 'message' | 'document';
    title: string;
    date: string;
    status?: string;
    amount?: number;
  }>;
  paymentHistory?: {
    totalPaid: number;
    lastPaymentDate?: string;
    nextPaymentDate?: string;
    paymentMethods: number;
  };
  messages?: {
    unread: number;
    recent: Array<{
      id: number;
      subject: string;
      from: string;
      date: string;
      unread: boolean;
    }>;
  };
  documents?: {
    pending: number;
    recent: Array<{
      id: number;
      name: string;
      type: string;
      date: string;
    }>;
  };
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return format(new Date(dateString), 'MMM d, yyyy');
};

const formatDateTime = (dateString: string) => {
  return format(new Date(dateString), 'MMM d, yyyy h:mm a');
};

const getDaysUntil = (dateString: string) => {
  const target = new Date(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffTime = target.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
};

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'payment':
      return <DollarSign className="w-4 h-4" aria-hidden="true" />;
    case 'maintenance':
      return <Wrench className="w-4 h-4" aria-hidden="true" />;
    case 'lease':
      return <FileText className="w-4 h-4" aria-hidden="true" />;
    case 'message':
      return <MessageSquare className="w-4 h-4" aria-hidden="true" />;
    case 'document':
      return <FileText className="w-4 h-4" aria-hidden="true" />;
    default:
      return <AlertCircle className="w-4 h-4" aria-hidden="true" />;
  }
};

const getActivityColor = (type: string) => {
  switch (type) {
    case 'payment':
      return 'text-success';
    case 'maintenance':
      return 'text-warning';
    case 'lease':
      return 'text-primary';
    case 'message':
      return 'text-secondary';
    default:
      return 'text-foreground-500';
  }
};

export const TenantDashboard: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      setError(null);
      
      try {
        // Try to fetch from API endpoint
        const response = await apiFetch('/tenant/dashboard', { token });
        setData(response);
      } catch (err: any) {
        console.error('Error fetching tenant dashboard data:', err);
        
        // Fallback to mock data for development
        if (err.message?.includes('404') || err.message?.includes('Request cancelled')) {
          setData({
            nextRentPayment: {
              amount: 1500,
              dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
              isPaid: false,
              invoiceId: 1
            },
            maintenanceRequests: {
              total: 5,
              pending: 1,
              inProgress: 2,
              completed: 2,
              urgent: 0
            },
            lease: {
              id: 1,
              unit: '2A',
              property: 'Sunset Apartments',
              propertyAddress: '123 Main St, City, State 12345',
              startDate: '2025-01-01',
              endDate: '2025-12-31',
              daysUntilRenewal: 55,
              status: 'ACTIVE',
              monthlyRent: 1500
            },
            recentActivity: [
              { 
                id: 1, 
                type: 'maintenance', 
                title: 'HVAC repair completed', 
                date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), 
                status: 'completed' 
              },
              { 
                id: 2, 
                type: 'payment', 
                title: 'Rent payment processed', 
                date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), 
                status: 'paid',
                amount: 1500
              },
              { 
                id: 3, 
                type: 'maintenance', 
                title: 'Plumbing issue reported', 
                date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), 
                status: 'in_progress' 
              },
            ],
            paymentHistory: {
              totalPaid: 15000,
              lastPaymentDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
              nextPaymentDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
              paymentMethods: 1
            },
            messages: {
              unread: 2,
              recent: []
            }
          });
        } else {
          setError('Failed to load dashboard data. Please try again later.');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  if (loading) {
    return (
      <div className="p-6">
        <PageHeader
          title="Dashboard"
          subtitle="Loading your information..."
        />
        <LoadingState message="Loading dashboard data..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <PageHeader
          title="Dashboard"
          subtitle="Welcome back!"
        />
        <EmptyState
          title="Unable to Load Dashboard"
          message={error}
          action={{
            label: "Retry",
            onClick: () => window.location.reload(),
            color: "primary"
          }}
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-6">
        <PageHeader
          title="Dashboard"
          subtitle="Welcome back!"
        />
        <EmptyState
          title="No Data Available"
          message="We couldn't find any information to display. Please contact support if this persists."
        />
      </div>
    );
  }

  const daysUntilRent = data.nextRentPayment ? getDaysUntil(data.nextRentPayment.dueDate) : 0;
  const rentDueStatus = daysUntilRent <= 3 ? 'danger' : daysUntilRent <= 7 ? 'warning' : 'success';
  const rentDueLabel = daysUntilRent === 0 ? 'Due today' : daysUntilRent === 1 ? 'Due tomorrow' : `Due in ${daysUntilRent} days`;

  return (
    <div className="space-y-6 p-6" role="main" aria-label="Tenant dashboard">
      <PageHeader
        title="Dashboard"
        subtitle={`Welcome back${user?.username ? `, ${user.username}` : ''}! Here's an overview of your rental.`}
      />

      {/* Quick Stats Grid */}
      <section aria-label="Quick statistics" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Next Rent Payment */}
        {data.nextRentPayment && !data.nextRentPayment.isPaid && (
          <Link 
            to="/payments" 
            className="focus:outline-none focus:ring-2 focus:ring-neon-blue focus:ring-offset-2 rounded-lg"
            aria-label={`Next rent payment: ${formatCurrency(data.nextRentPayment.amount)} ${rentDueLabel}`}
          >
            <GlassCard 
              glowColor={rentDueStatus === 'danger' ? 'pink' : rentDueStatus === 'warning' ? 'purple' : 'blue'}
              className="h-full transition-transform hover:scale-105"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-neon-blue" aria-hidden="true" />
                  <h3 className="text-sm font-medium text-gray-300">Next Payment</h3>
                </div>
                <StatusBadge status={rentDueStatus === 'danger' ? 'urgent' : rentDueStatus === 'warning' ? 'pending' : 'active'} />
              </div>
              <p className="text-2xl font-bold text-white mb-1" aria-label={`Amount: ${formatCurrency(data.nextRentPayment.amount)}`}>
                {formatCurrency(data.nextRentPayment.amount)}
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Calendar className="w-3 h-3" aria-hidden="true" />
                {rentDueLabel}
              </p>
              {daysUntilRent <= 7 && (
                <Progress 
                  value={Math.max(0, (7 - daysUntilRent) / 7 * 100)} 
                  color={rentDueStatus === 'danger' ? 'danger' : 'warning'}
                  className="mt-3"
                  aria-label={`Payment due in ${daysUntilRent} days`}
                />
              )}
            </GlassCard>
          </Link>
        )}

        {/* Maintenance Requests */}
        <Link 
          to="/maintenance"
          className="focus:outline-none focus:ring-2 focus:ring-neon-blue focus:ring-offset-2 rounded-lg"
          aria-label={`Maintenance requests: ${data.maintenanceRequests.total} total, ${data.maintenanceRequests.pending} pending`}
        >
          <StatsCard
            title="Maintenance Requests"
            value={data.maintenanceRequests.total.toString()}
            subtitle={`${data.maintenanceRequests.pending} pending, ${data.maintenanceRequests.inProgress} in progress`}
            icon={<Wrench className="w-5 h-5" aria-hidden="true" />}
            valueColor={data.maintenanceRequests.urgent > 0 ? 'danger' : data.maintenanceRequests.pending > 0 ? 'warning' : 'success'}
            className="h-full transition-transform hover:scale-105 cursor-pointer"
          />
        </Link>

        {/* Lease Status */}
        {data.lease && (
          <Link 
            to="/my-lease"
            className="focus:outline-none focus:ring-2 focus:ring-neon-blue focus:ring-offset-2 rounded-lg"
            aria-label={`Lease: ${data.lease.property} unit ${data.lease.unit}, ${data.lease.status}`}
          >
            <StatsCard
              title="Lease Status"
              value={data.lease.status}
              subtitle={`${data.lease.property} - Unit ${data.lease.unit}`}
              icon={<Home className="w-5 h-5" aria-hidden="true" />}
              valueColor="primary"
              className="h-full transition-transform hover:scale-105 cursor-pointer"
            />
          </Link>
        )}

        {/* Payment History */}
        {data.paymentHistory && (
          <Link 
            to="/payments"
            className="focus:outline-none focus:ring-2 focus:ring-neon-blue focus:ring-offset-2 rounded-lg"
            aria-label={`Payment history: ${formatCurrency(data.paymentHistory.totalPaid)} total paid`}
          >
            <StatsCard
              title="Total Paid"
              value={formatCurrency(data.paymentHistory.totalPaid)}
              subtitle={`${data.paymentHistory.paymentMethods} payment method${data.paymentHistory.paymentMethods !== 1 ? 's' : ''}`}
              icon={<TrendingUp className="w-5 h-5" aria-hidden="true" />}
              valueColor="success"
              className="h-full transition-transform hover:scale-105 cursor-pointer"
            />
          </Link>
        )}
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Lease & Payment Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Lease Information */}
          {data.lease && (
            <GlassCard title="Lease Information" subtitle="CURRENT AGREEMENT">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Property</p>
                    <p className="text-white font-medium">{data.lease.property}</p>
                    <p className="text-sm text-gray-400">{data.lease.propertyAddress}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Unit</p>
                    <p className="text-white font-medium text-lg">{data.lease.unit}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Monthly Rent</p>
                    <p className="text-white font-bold text-xl">{formatCurrency(data.lease.monthlyRent)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Lease Term</p>
                    <p className="text-white font-medium">
                      {formatDate(data.lease.startDate)} - {formatDate(data.lease.endDate)}
                    </p>
                  </div>
                </div>

                {data.lease.daysUntilRenewal !== undefined && (
                  <div className="pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Renewal</p>
                        <p className="text-white font-medium">
                          {data.lease.daysUntilRenewal > 0 
                            ? `${data.lease.daysUntilRenewal} days until renewal`
                            : 'Lease expired'}
                        </p>
                      </div>
                      <Button
                        as={Link}
                        to="/my-lease"
                        variant="flat"
                        color="primary"
                        endContent={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
                        aria-label="View full lease details"
                      >
                        View Details
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </GlassCard>
          )}

          {/* Recent Activity */}
          <GlassCard title="Recent Activity" subtitle="LATEST UPDATES">
            {data.recentActivity && data.recentActivity.length > 0 ? (
              <div className="space-y-3" role="list" aria-label="Recent activity">
                {data.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                    role="listitem"
                  >
                    <div className={`mt-0.5 ${getActivityColor(activity.type)}`}>
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">{activity.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-xs text-gray-400">{formatDateTime(activity.date)}</p>
                        {activity.status && (
                          <StatusBadge status={activity.status as any} />
                        )}
                        {activity.amount && (
                          <span className="text-xs text-success font-medium">
                            {formatCurrency(activity.amount)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                title="No Recent Activity"
                message="Your recent activity will appear here."
                variant="inline"
              />
            )}
            <div className="mt-4 pt-4 border-t border-white/10">
              <Button
                as={Link}
                to="/activity"
                variant="light"
                size="sm"
                className="w-full"
                aria-label="View all activity"
              >
                View All Activity
              </Button>
            </div>
          </GlassCard>
        </div>

        {/* Right Column - Quick Actions & Notifications */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <GlassCard title="Quick Actions" subtitle="COMMON TASKS">
            <div className="space-y-2" role="group" aria-label="Quick actions">
              <Button
                as={Link}
                to="/maintenance"
                variant="flat"
                className="w-full justify-start"
                startContent={<Plus className="w-4 h-4" aria-hidden="true" />}
                aria-label="Submit maintenance request"
              >
                Submit Maintenance Request
              </Button>
              <Button
                as={Link}
                to="/payments"
                variant="flat"
                className="w-full justify-start"
                startContent={<CreditCard className="w-4 h-4" aria-hidden="true" />}
                aria-label="Make a payment"
              >
                Make Payment
              </Button>
              <Button
                as={Link}
                to="/messages"
                variant="flat"
                className="w-full justify-start"
                startContent={<MessageSquare className="w-4 h-4" aria-hidden="true" />}
                aria-label="View messages"
              >
                View Messages
                {data.messages && data.messages.unread > 0 && (
                  <Chip size="sm" color="primary" className="ml-auto">
                    {data.messages.unread}
                  </Chip>
                )}
              </Button>
              <Button
                as={Link}
                to="/documents"
                variant="flat"
                className="w-full justify-start"
                startContent={<FileText className="w-4 h-4" aria-hidden="true" />}
                aria-label="View documents"
              >
                View Documents
              </Button>
            </div>
          </GlassCard>

          {/* Maintenance Summary */}
          {data.maintenanceRequests && data.maintenanceRequests.total > 0 && (
            <GlassCard title="Maintenance Summary" subtitle="REQUEST STATUS">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Pending</span>
                  <Chip size="sm" color="warning">{data.maintenanceRequests.pending}</Chip>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">In Progress</span>
                  <Chip size="sm" color="primary">{data.maintenanceRequests.inProgress}</Chip>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Completed</span>
                  <Chip size="sm" color="success">{data.maintenanceRequests.completed}</Chip>
                </div>
                {data.maintenanceRequests.urgent > 0 && (
                  <div className="flex items-center justify-between pt-2 border-t border-white/10">
                    <span className="text-sm text-danger font-medium">Urgent</span>
                    <Chip size="sm" color="danger">{data.maintenanceRequests.urgent}</Chip>
                  </div>
                )}
              </div>
              <Button
                as={Link}
                to="/maintenance"
                variant="flat"
                color="primary"
                className="w-full mt-4"
                endContent={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
                aria-label="View all maintenance requests"
              >
                View All Requests
              </Button>
            </GlassCard>
          )}

          {/* Payment Info */}
          {data.nextRentPayment && (
            <GlassCard title="Payment Info" subtitle="NEXT PAYMENT">
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Amount Due</p>
                  <p className="text-2xl font-bold text-white">
                    {formatCurrency(data.nextRentPayment.amount)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Due Date</p>
                  <p className="text-white font-medium">
                    {formatDate(data.nextRentPayment.dueDate)}
                  </p>
                </div>
                {data.nextRentPayment.isPaid ? (
                  <Chip color="success" variant="flat" className="w-full justify-center">
                    <CheckCircle className="w-4 h-4 mr-1" aria-hidden="true" />
                    Paid
                  </Chip>
                ) : (
                  <Button
                    as={Link}
                    to="/payments"
                    color="primary"
                    className="w-full"
                    aria-label={`Pay ${formatCurrency(data.nextRentPayment.amount)} now`}
                  >
                    Pay Now
                  </Button>
                )}
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
};

export default TenantDashboard;
