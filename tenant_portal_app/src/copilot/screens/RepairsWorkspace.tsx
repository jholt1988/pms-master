import React, { useState, useEffect } from 'react';
import { Wrench, AlertTriangle, Clock, DollarSign, CheckCircle, User } from 'lucide-react';
import { Button } from '@nextui-org/react';
import { useAuth } from '../../AuthContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { RiskMeter } from '../components/RiskMeter';
import { ExplainableAction } from '../components/ExplainableAction';
import { fetchRepairsWorkspace } from '../api';
import type { Severity } from '../types';

const priorityToSeverity = (p: string): Severity => {
  switch (p?.toUpperCase()) {
    case 'EMERGENCY': return 'critical';
    case 'HIGH': return 'high';
    case 'MEDIUM': return 'medium';
    default: return 'low';
  }
};

export const RepairsWorkspace: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchRepairsWorkspace(token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <WorkspaceShell title="Repairs" subtitle="Predictive Action Layer" icon={Wrench} accentColor="yellow-400">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-white/5 rounded-2xl" />)}
        </div>
      </WorkspaceShell>
    );
  }

  const requests = data?.requests?.data || data?.requests || [];
  const estimates = data?.estimates?.data || data?.estimates || [];
  const aiMetrics = data?.aiMetrics || {};

  const emergencyCount = requests.filter((r: any) => r.priority === 'EMERGENCY').length;
  const pendingCount = requests.filter((r: any) => r.status === 'PENDING').length;
  const inProgressCount = requests.filter((r: any) => r.status === 'IN_PROGRESS').length;
  const pendingEstimates = (Array.isArray(estimates) ? estimates : []).filter((e: any) => e.status === 'PENDING_REVIEW');
  const totalCostExposure = pendingEstimates.reduce((s: number, e: any) => s + (e.totalProjectCost || 0), 0);

  return (
    <WorkspaceShell title="Repairs" subtitle="Predictive Action Layer" icon={Wrench} accentColor="yellow-400">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <p className="text-red-400 text-2xl font-light">{emergencyCount}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Emergency</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
          <p className="text-yellow-400 text-2xl font-light">{pendingCount}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Pending</p>
        </div>
        <div className="bg-neon-blue/10 border border-neon-blue/20 rounded-xl p-4 text-center">
          <p className="text-neon-blue text-2xl font-light">{inProgressCount}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">In Progress</p>
        </div>
        <div className="bg-neon-pink/10 border border-neon-pink/20 rounded-xl p-4 text-center">
          <p className="text-neon-pink text-2xl font-light">${totalCostExposure.toLocaleString()}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Cost Exposure</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Imminent Risks */}
        <GlassCard glowColor="pink" title="Imminent Risks" subtitle="Emergency & high-priority items">
          {requests.filter((r: any) => ['EMERGENCY', 'HIGH'].includes(r.priority)).length === 0 ? (
            <p className="text-green-400 text-sm flex items-center gap-2"><CheckCircle size={14} /> No critical repairs</p>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar">
              {requests
                .filter((r: any) => ['EMERGENCY', 'HIGH'].includes(r.priority))
                .map((req: any) => (
                  <div key={req.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white text-sm font-medium truncate">{req.title}</span>
                      <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded ${req.priority === 'EMERGENCY' ? 'bg-red-500/20 text-red-400' : 'bg-yellow-500/20 text-yellow-400'}`}>
                        {req.priority}
                      </span>
                    </div>
                    <p className="text-gray-400 text-xs mb-2 line-clamp-2">{req.description}</p>
                    <RiskMeter level={priorityToSeverity(req.priority)} />
                    {req.assignee && (
                      <div className="flex items-center gap-1 mt-2 text-gray-500 text-[10px]">
                        <User size={10} /> {req.assignee.name || 'Assigned'}
                      </div>
                    )}
                  </div>
                ))}
            </div>
          )}
        </GlassCard>

        {/* Active Tickets */}
        <GlassCard title="Active Tickets" subtitle="In progress maintenance">
          <div className="space-y-2 max-h-[350px] overflow-y-auto no-scrollbar">
            {requests.filter((r: any) => r.status === 'IN_PROGRESS').length === 0 ? (
              <p className="text-gray-500 text-sm">No active tickets</p>
            ) : (
              requests.filter((r: any) => r.status === 'IN_PROGRESS').slice(0, 8).map((req: any) => (
                <div key={req.id} className="flex items-center justify-between p-2.5 rounded bg-white/5 hover:bg-white/8 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-xs truncate">{req.title}</p>
                    <p className="text-gray-500 text-[10px]">{req.property?.name || ''} {req.unit?.name || ''}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {req.dueAt && (
                      <span className="text-gray-500 text-[10px] font-mono flex items-center gap-1">
                        <Clock size={10} /> {new Date(req.dueAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </GlassCard>

        {/* Estimates Awaiting Approval */}
        <GlassCard glowColor="purple" title="Estimates Pending" subtitle="Awaiting cost approval">
          {pendingEstimates.length === 0 ? (
            <p className="text-gray-500 text-sm">No estimates pending review</p>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar">
              {pendingEstimates.slice(0, 6).map((est: any) => (
                <div key={est.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm">Estimate #{est.id?.slice(-6)}</span>
                    <span className="text-neon-pink text-sm font-mono">${(est.totalProjectCost || 0).toLocaleString()}</span>
                  </div>
                  <p className="text-gray-400 text-xs mb-2">
                    Labor: ${(est.totalLaborCost || 0).toLocaleString()} | Materials: ${(est.totalMaterialCost || 0).toLocaleString()}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" color="success" variant="flat" className="text-xs">Approve</Button>
                    <Button size="sm" color="danger" variant="flat" className="text-xs">Reject</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* AI Insights */}
        <GlassCard title="AI Maintenance Intelligence" subtitle="Predictive insights">
          {aiMetrics.slaBreachPredictions ? (
            <ExplainableAction
              trigger={`${aiMetrics.slaBreachPredictions?.atRisk || 0} tickets at risk of SLA breach`}
              reasoning="AI monitors response/resolution times against SLA policies and predicts breaches based on historical patterns"
              recommendation="Prioritize at-risk tickets or reassign to available technicians"
              actionLabel="View at-risk"
            />
          ) : (
            <p className="text-gray-500 text-sm">AI metrics unavailable. System monitors SLA compliance and predicts maintenance risks automatically.</p>
          )}
        </GlassCard>
      </div>
    </WorkspaceShell>
  );
};

export default RepairsWorkspace;
