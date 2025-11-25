import React from 'react';
import { GlassCard } from './components/ui/GlassCard';
import { 
  AlertTriangle, 
  TrendingUp, 
  Users, 
  CheckCircle2, 
  ArrowUpRight,
  Wallet,
  Activity
} from 'lucide-react';

// Import your existing feature widgets
// Note: You will need to update these components later to remove their own 
// white backgrounds so they blend into the GlassCard.
import { MaintenanceCard } from "./components/ui/MaintenanceCard";
import { PaymentsCard } from "./components/ui/PaymentsCard";
import { RentEstimatorCard } from "./components/ui/RentEstimatorCard";
import { RentalApplicationsCard } from "./components/ui/RentalApplicationsCard";
import { MessagingCard } from "./components/ui/MessagingCard";

const KPITicker = () => (
  <div className="flex gap-6 mb-8 overflow-x-auto pb-2 no-scrollbar">
    {[
      { label: 'Portfolio Occ.', value: '94%', change: '+2.1%', color: 'text-neon-blue' },
      { label: 'MoM Revenue', value: '$42.5k', change: '+5.4%', color: 'text-green-400' },
      { label: 'Open Tickets', value: '8', change: '-2', color: 'text-neon-purple' },
      { label: 'Pending Apps', value: '3', change: '+1', color: 'text-white' },
    ].map((stat, i) => (
      <div key={i} className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 border border-white/10 min-w-fit">
        <div className="text-xs text-gray-400 uppercase tracking-wider">{stat.label}</div>
        <div className="text-sm font-mono font-bold text-white">{stat.value}</div>
        <div className={`text-xs ${stat.color} flex items-center`}>
          <ArrowUpRight size={10} className="mr-1" /> {stat.change}
        </div>
      </div>
    ))}
  </div>
);

const MainDashboard = () => {
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
        <div className="mt-4 md:mt-0">
          <div className="flex items-center gap-2 text-xs font-mono text-neon-purple bg-neon-purple/10 px-3 py-1 rounded border border-neon-purple/30 animate-pulse-slow">
            <Activity size={12} />
            SYSTEM OPTIMIZED
          </div>
        </div>
      </div>

      <KPITicker />

      {/* --- SECTION 2: BENTO GRID LAYOUT --- */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        
        {/* BLOCK A: Priority Actions (Maintenance) - Large Focus */}
        <div className="md:col-span-8">
          <GlassCard className="h-full min-h-[300px]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-light flex items-center gap-2">
                <AlertTriangle className="text-neon-pink" size={18} />
                Critical Attention
              </h3>
              <span className="text-xs bg-neon-pink/20 text-neon-pink px-2 py-1 rounded">2 Urgent</span>
            </div>
            {/* Integrating existing component */}
            <div className="opacity-90">
               <MaintenanceCard /> 
            </div>
          </GlassCard>
        </div>

        {/* BLOCK B: Financial Overview - Tall Side Panel */}
        <div className="md:col-span-4 row-span-2">
          <GlassCard glowColor="blue" className="h-full">
            <div className="flex items-center gap-2 mb-6">
              <Wallet className="text-neon-blue" size={18} />
              <h3 className="text-white font-light">Financial Flow</h3>
            </div>
            <div className="mb-6 text-center">
              <div className="text-4xl font-mono text-white font-bold tracking-tighter">$124,500</div>
              <div className="text-xs text-gray-500 mt-1">TOTAL COLLECTED (MTD)</div>
            </div>
            <div className="h-px bg-linear-to-r from-transparent via-white/20 to-transparent my-4" />
            <PaymentsCard />
          </GlassCard>
        </div>

        {/* BLOCK C: AI Insights - Mid Size */}
        <div className="md:col-span-5">
          <GlassCard glowColor="purple">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-light flex items-center gap-2">
                <TrendingUp className="text-neon-purple" size={18} />
                Market Intelligence
              </h3>
              <button className="text-xs text-neon-purple hover:text-white transition-colors">Analyze</button>
            </div>
            <RentEstimatorCard />
          </GlassCard>
        </div>

        {/* BLOCK D: Quick Comms - Mid Size */}
        <div className="md:col-span-3">
          <GlassCard>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-gray-300 text-sm font-light">Recent Messages</h3>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
            </div>
            <div className="scale-90 origin-top-left -ml-2 w-[110%]">
              <MessagingCard />
            </div>
          </GlassCard>
        </div>

        {/* BLOCK E: Leasing Pipeline - Full Width Strip */}
        <div className="md:col-span-12">
          <GlassCard className="bg-linear-to-r from-white/5 to-transparent">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg text-green-400">
                <Users size={20} />
              </div>
              <div>
                <h3 className="text-white font-medium">Leasing Pipeline</h3>
                <p className="text-xs text-gray-400">3 Applications Pending Review</p>
              </div>
            </div>
            <RentalApplicationsCard />
          </GlassCard>
        </div>

      </div>
    </div>
  );
};

export default MainDashboard;