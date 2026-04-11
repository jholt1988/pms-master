import React, { useState, useEffect } from 'react';
import { Home, DollarSign, Users, ArrowRight, Clock, TrendingDown, Building2 } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { RiskMeter } from '../components/RiskMeter';
import { fetchLeasingWorkspace } from '../api';

const PIPELINE_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'TOURING', 'APPLICATION_SUBMITTED', 'CONVERTED'];

export const LeasingWorkspace: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchLeasingWorkspace(token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <WorkspaceShell title="Leasing" subtitle="Revenue Pipeline Engine" icon={Home} accentColor="neon-blue">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-white/5 rounded-2xl" />)}
        </div>
      </WorkspaceShell>
    );
  }

  const stats = data?.stats || {};
  const leads = data?.leads?.leads || data?.leads || [];
  const opsSummary = data?.opsSummary || {};

  const vacantUnits = opsSummary.vacantUnits || stats.vacantUnits || 0;
  const avgRent = opsSummary.avgRent || 1500;
  const revenueLeak = vacantUnits * avgRent;

  const pipelineCounts: Record<string, any[]> = {};
  PIPELINE_STAGES.forEach(s => { pipelineCounts[s] = []; });
  (Array.isArray(leads) ? leads : []).forEach((lead: any) => {
    const status = (lead.status || 'NEW').toUpperCase();
    if (pipelineCounts[status]) pipelineCounts[status].push(lead);
    else pipelineCounts.NEW.push(lead);
  });

  return (
    <WorkspaceShell title="Leasing" subtitle="Revenue Pipeline Engine" icon={Home} accentColor="neon-blue">
      {/* Revenue Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <p className="text-red-400 text-2xl font-light">{vacantUnits}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Vacant Units</p>
        </div>
        <div className="bg-neon-pink/10 border border-neon-pink/20 rounded-xl p-4 text-center">
          <p className="text-neon-pink text-2xl font-light">${revenueLeak.toLocaleString()}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Monthly Revenue Leak</p>
        </div>
        <div className="bg-neon-blue/10 border border-neon-blue/20 rounded-xl p-4 text-center">
          <p className="text-neon-blue text-2xl font-light">{leads.length}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Active Leads</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
          <p className="text-yellow-400 text-2xl font-light">{stats.expiringLeases || opsSummary.expiringLeases || 0}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Expiring Soon</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline Kanban */}
        <GlassCard glowColor="blue" title="Leasing Pipeline" subtitle="Lead to lease progression" className="lg:col-span-2">
          <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar">
            {PIPELINE_STAGES.map(stage => (
              <div key={stage} className="min-w-[160px] flex-shrink-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-gray-400 font-mono uppercase tracking-wider">
                    {stage.replace(/_/g, ' ')}
                  </span>
                  <span className="text-xs text-white font-mono">{pipelineCounts[stage]?.length || 0}</span>
                </div>
                <div className="space-y-2">
                  {(pipelineCounts[stage] || []).slice(0, 5).map((lead: any) => (
                    <div key={lead.id} className="bg-white/5 border border-white/10 rounded-lg p-2.5 hover:bg-white/10 transition-colors">
                      <p className="text-white text-xs font-medium truncate">{lead.name || 'Lead'}</p>
                      <p className="text-gray-500 text-[10px] truncate">{lead.email || ''}</p>
                      {lead.budget && <p className="text-neon-blue text-[10px] font-mono mt-1">${lead.budget}/mo</p>}
                    </div>
                  ))}
                  {(pipelineCounts[stage]?.length || 0) === 0 && (
                    <div className="border border-dashed border-white/10 rounded-lg p-3 text-center text-gray-600 text-xs">
                      Empty
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Revenue Leak Detail */}
        <GlassCard glowColor="pink" title="Revenue Leak" subtitle="Cost of vacant units">
          {vacantUnits === 0 ? (
            <p className="text-green-400 text-sm">No vacancies. Full occupancy.</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-neon-pink">
                <TrendingDown size={18} />
                <span className="text-lg font-light">${revenueLeak.toLocaleString()}/month lost</span>
              </div>
              <p className="text-gray-400 text-xs">
                {vacantUnits} vacant unit{vacantUnits > 1 ? 's' : ''} at avg ${avgRent.toLocaleString()}/mo estimated rent
              </p>
              <RiskMeter level={vacantUnits > 5 ? 'critical' : vacantUnits > 2 ? 'high' : 'medium'} />
              <div className="pt-3 border-t border-white/5">
                <p className="text-[10px] text-gray-500 font-mono uppercase mb-2">NEXT BEST ACTION</p>
                <p className="text-white text-sm">Activate listing syndication for vacant units</p>
              </div>
            </div>
          )}
        </GlassCard>

        {/* Expiring Leases */}
        <GlassCard title="Expiring Leases" subtitle="Within 90 days">
          <div className="space-y-2">
            {(opsSummary.expiringLeaseDetails || []).length === 0 ? (
              <p className="text-gray-500 text-sm">No leases expiring within 90 days</p>
            ) : (
              (opsSummary.expiringLeaseDetails || []).slice(0, 6).map((lease: any, i: number) => (
                <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5">
                  <div>
                    <p className="text-white text-xs">{lease.tenantName || 'Tenant'}</p>
                    <p className="text-gray-500 text-[10px]">{lease.propertyName || ''} - {lease.unitName || ''}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-yellow-400 text-xs font-mono">{lease.daysUntilExpiry || '?'} days</p>
                    <p className="text-gray-500 text-[10px]">${(lease.rentAmount || 0).toLocaleString()}/mo</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      </div>
    </WorkspaceShell>
  );
};

export default LeasingWorkspace;
