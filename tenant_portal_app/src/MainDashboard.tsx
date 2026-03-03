import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { GlassCard } from './components/ui/GlassCard';
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  ArrowUpRight,
  Wallet,
  Activity
} from 'lucide-react';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';

// Import your existing feature widgets
// Note: You will need to update these components later to remove their own 
// white backgrounds so they blend into the GlassCard.
import { PaymentsCard } from "./components/ui/PaymentsCard";
import { RentEstimatorCard } from "./components/ui/RentEstimatorCard";
import { RentalApplicationsCard } from "./components/ui/RentalApplicationsCard";
import { MessagingCard } from "./components/ui/MessagingCard";
import { ActionIntentFeed } from './components/ui/ActionIntentFeed';
import { ProactiveMaintenanceCard } from './components/ui/ProactiveMaintenanceCard';

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
    legalAccepted?: number;
    legalMissing?: number;
  };
  proactiveMaintenance: Array<{
    id: string;
    title: string;
    unit: string;
    probability: number;
    milestone: string;
  }>;
}

const formatCurrency = (amount: number) => {
  if (amount >= 1000) {
    return `$${(amount / 1000).toFixed(1)}k`;
  }
  return `$${amount.toFixed(0)}`;
};

const KPITicker = ({
  metrics,
  loading,
  navigate,
  isOwnerView,
}: {
  metrics: DashboardMetrics | null;
  loading: boolean;
  navigate: (path: string) => void;
  isOwnerView: boolean;
}) => {
  if (loading || !metrics) {
    return (
      <div className="flex gap-6 mb-8 overflow-x-auto pb-2 no-scrollbar">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 min-w-fit animate-pulse">
            <div className="h-4 w-20 bg-white/10 rounded" />
            <div className="h-5 w-16 bg-white/10 rounded" />
          </div>
        ))}
      </div>
    );
  }

  const occupancyChange = metrics.occupancy?.percentage ? `+${(metrics.occupancy.percentage - 92).toFixed(1)}%` : '0%';
  const revenueChange = metrics.financials?.monthlyRevenue 
    ? `+${((metrics.financials.collectedThisMonth / metrics.financials.monthlyRevenue) * 100 - 95).toFixed(1)}%` 
    : '0%';
  const openTickets = metrics.maintenance?.pending || 0;
  const pendingApps = metrics.applications?.pending || 0;

  const kpiItems = [
    {
      label: 'Portfolio Occ.',
      value: `${metrics.occupancy?.percentage || 0}%`,
      change: occupancyChange,
      color: 'text-neon-blue',
      path: '/properties',
    },
    {
      label: 'MoM Revenue',
      value: formatCurrency(metrics.financials?.collectedThisMonth || 0),
      change: revenueChange,
      color: 'text-green-400',
      path: '/payments',
      disabled: isOwnerView,
      hint: 'Manager access only in owner view',
    },
    {
      label: 'Open Tickets',
      value: `${openTickets}`,
      change: `-${Math.max(0, openTickets - 6)}`,
      color: 'text-neon-purple',
      path: '/maintenance-management',
    },
    {
      label: 'Pending Apps',
      value: `${pendingApps}`,
      change: `+${Math.max(0, pendingApps - 2)}`,
      color: 'text-white',
      path: '/rental-applications-management',
      disabled: isOwnerView,
      hint: 'Manager access only in owner view',
    },
  ];

  return (
    <div className="flex gap-6 mb-8 overflow-x-auto pb-2 no-scrollbar">
      {kpiItems.map((stat, i) => (
        <div
          key={i}
          onClick={() => {
            if (!stat.disabled) {
              navigate(stat.path);
            }
          }}
          title={stat.disabled ? stat.hint : undefined}
          aria-disabled={stat.disabled}
          className={`flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 min-w-fit transition-all ${
            stat.disabled
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer hover:bg-white/10 hover:border-neon-blue/50'
          }`}
        >
          <div className="text-xs text-gray-400 uppercase tracking-wider">{stat.label}</div>
          <div className="text-sm font-mono font-bold text-white">{stat.value}</div>
          <div className={`text-xs ${stat.color} flex items-center`}>
            <ArrowUpRight size={10} className="mr-1" /> {stat.change}
          </div>
        </div>
      ))}
    </div>
  );
};

type EngineHealth = {
  status: 'ok' | 'degraded';
  detail: string;
  checkedAt: string;
};

const MainDashboard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [engineHealth, setEngineHealth] = useState<EngineHealth | null>(null);
  const isOwnerView = user?.role === 'OWNER';

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
        // Set fallback empty metrics on error
        setMetrics({
          occupancy: { total: 0, occupied: 0, vacant: 0, percentage: 0 },
          financials: { monthlyRevenue: 0, collectedThisMonth: 0, outstanding: 0 },
          maintenance: { total: 0, pending: 0, inProgress: 0, overdue: 0 },
          applications: { total: 0, pending: 0, approved: 0, rejected: 0, legalAccepted: 0, legalMissing: 0 },
          proactiveMaintenance: [
            { id: 'hvac-1', title: 'HVAC Failure Imminent', unit: 'Unit 101', probability: 0.85, milestone: 'ES15' },
            { id: 'wh-1', title: 'Water Heater Leak Risk', unit: 'Unit 204', probability: 0.62, milestone: 'ES15' },
          ],
        });
      }

      try {
        const health = await apiFetch('/property-os/v16/engine-health', { token });
        setEngineHealth(health);
      } catch (healthError) {
        console.error('Error fetching Property OS engine health:', healthError);
        setEngineHealth({
          status: 'degraded',
          detail: 'Engine health unavailable',
          checkedAt: new Date().toISOString(),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [token]);
  return (
    <div className="pb-24"> {/* Padding for bottom Dock */}
      
      {/* --- SECTION 1: HEADER & METRICS --- */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-sans font-light text-white mb-1">
            Dashboard <span className="text-neon-blue font-mono text-lg opacity-60">/ OVERVIEW</span>
          </h1>
          <p className="text-gray-400 text-sm">Real-time portfolio telemetry</p>
        </div>
        <div className="mt-4 md:mt-0 flex flex-col items-end gap-2">
          <div className="flex items-center gap-2 text-xs font-mono text-neon-purple bg-neon-purple/10 px-3 py-1 rounded border border-neon-purple/30 animate-pulse-slow">
            <Activity size={12} />
            SYSTEM OPTIMIZED
          </div>
          <div
            className={`flex items-center gap-2 text-xs font-mono px-3 py-1 rounded border ${
              engineHealth?.status === 'ok'
                ? 'text-emerald-300 bg-emerald-500/10 border-emerald-500/30'
                : 'text-amber-300 bg-amber-500/10 border-amber-500/30'
            }`}
            title={engineHealth?.detail ?? 'Property OS engine health unknown'}
          >
            <span className={`inline-block h-2 w-2 rounded-full ${engineHealth?.status === 'ok' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
            PROPERTY OS ENGINE {engineHealth?.status === 'ok' ? 'HEALTHY' : 'DEGRADED'}
          </div>
        </div>
      </div>

      {isOwnerView && (
        <div className="mb-6 rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-gray-300">
          <span className="font-mono text-neon-blue uppercase tracking-wider">Owner view</span>
          <span className="ml-2">
            Read-only portfolio insights. Financial and leasing actions are managed by your property manager. Data refreshes nightly.
          </span>
        </div>
      )}

      <KPITicker metrics={metrics} loading={loading} navigate={navigate} isOwnerView={isOwnerView} />

      {/* --- SECTION 2: BENTO GRID LAYOUT --- */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* BLOCK A: Critical Maintenance (Top Left - Large) */}
        <div className="md:col-span-8">
          <GlassCard glowColor="pink" className="h-full min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-light flex items-center gap-2">
                <AlertTriangle className="text-neon-pink" size={18} />
                Critical Attention
              </h3>
              <span className="text-xs bg-neon-pink/20 text-neon-pink px-2 py-1 rounded font-mono uppercase tracking-wider">
                {metrics?.proactiveMaintenance?.length ?? 0} Insights
              </span>
            </div>
            <ProactiveMaintenanceCard suggestions={metrics?.proactiveMaintenance ?? []} /> 
          </GlassCard>
        </div>

        {/* BLOCK B: Financial/Payment Flow (Right Column - Tall) */}
        <div className="md:col-span-4 md:row-span-2">
          <GlassCard glowColor="blue" className="h-full">
            <div className="flex items-center gap-2 mb-6">
              <Wallet className="text-neon-blue" size={18} />
              <h3 className="text-white font-light">Financial Flow</h3>
            </div>
            <div className="mb-6 text-center">
              <div className="text-4xl font-mono text-white font-bold tracking-tighter">
                {loading ? (
                  <span className="animate-pulse">---</span>
                ) : (
                  `$${((metrics?.financials?.collectedThisMonth || 0) / 1000).toFixed(0)}k`
                )}
              </div>
              <div className="text-[10px] text-gray-500 mt-1 uppercase tracking-wider font-mono">TOTAL COLLECTED (MTD)</div>
            </div>
            <div className="h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent my-4" />
            <PaymentsCard />
          </GlassCard>
        </div>

        {/* BLOCK C: AI Insights & Quick Actions (Center) */}
        <div className="md:col-span-5">
          <GlassCard glowColor="purple">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-light flex items-center gap-2">
                <TrendingUp className="text-neon-purple" size={18} />
                Market Intelligence
              </h3>
              <button
                onClick={() => {
                  if (!isOwnerView) {
                    navigate('/rent-estimator');
                  }
                }}
                className={`text-xs font-mono uppercase tracking-wider transition-colors ${
                  isOwnerView
                    ? 'text-gray-500 cursor-not-allowed'
                    : 'text-neon-purple hover:text-white'
                }`}
                aria-label="Analyze market intelligence"
                aria-disabled={isOwnerView}
                title={isOwnerView ? 'Manager access only in owner view' : undefined}
              >
                Analyze
              </button>
            </div>
            <RentEstimatorCard />
          </GlassCard>
        </div>

        {/* BLOCK D: Quick Comms (Right of Center) */}
        <div className="md:col-span-3">
          <GlassCard>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-300 text-sm font-light">Recent Messages</h3>
              <div className="w-2 h-2 bg-neon-blue rounded-full animate-pulse" />
            </div>
            <div className="scale-90 origin-top-left -ml-2 w-[110%]">
              <MessagingCard />
            </div>
          </GlassCard>
        </div>

        {/* BLOCK E: Leasing Pipeline (Full Width Bottom) */}
        <div className="md:col-span-12">
          <GlassCard className="bg-gradient-to-r from-white/5 to-transparent">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-white font-medium">Leasing Pipeline</h3>
                <p className="text-xs text-gray-400 font-mono">
                  {loading ? 'Loading...' : `${metrics?.applications?.pending || 0} Applications Pending Review`}
                </p>
                <p className="text-[10px] text-gray-500 font-mono">
                  {loading
                    ? 'Legal acceptance loading…'
                    : `${metrics?.applications?.legalAccepted || 0} accepted · ${metrics?.applications?.legalMissing || 0} missing`}
                </p>
              </div>
            </div>
            <RentalApplicationsCard />
          </GlassCard>
        </div>
        
        {/* BLOCK F: ActionIntent Feed (Full Width Bottom) */}
        <div className="md:col-span-12">
          <GlassCard glowColor="purple">
            <ActionIntentFeed />
          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default MainDashboard;