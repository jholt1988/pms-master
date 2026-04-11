import React, { useState, useEffect } from 'react';
import { Wallet, AlertTriangle, Bell, DollarSign, CheckCircle, Clock, Send } from 'lucide-react';
import { Button } from '@nextui-org/react';
import { useAuth } from '../../AuthContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { RiskMeter } from '../components/RiskMeter';
import { fetchPaymentsWorkspace } from '../api';
import { apiFetch } from '../../services/apiClient';
import type { Severity } from '../types';

export const PaymentsWorkspace: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchPaymentsWorkspace(token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const sendReminder = async (leaseId: string) => {
    if (!token) return;
    try {
      await apiFetch('/payments/delinquency/issue-notice', { token, method: 'POST', body: { leaseId, type: 'REMINDER' } });
    } catch {}
  };

  if (loading) {
    return (
      <WorkspaceShell title="Payments" subtitle="Collection & Risk Engine" icon={Wallet} accentColor="neon-pink">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-white/5 rounded-2xl" />)}
        </div>
      </WorkspaceShell>
    );
  }

  const delinquency = data?.delinquency;
  const summary = data?.opsSummary;
  const buckets = delinquency?.buckets || (Array.isArray(delinquency) ? delinquency : []);

  const totalAtRisk = buckets.reduce((sum: number, b: any) =>
    sum + (b.items || []).reduce((s: number, i: any) => s + (i.outstandingAmount || i.amount || 0), 0), 0);

  return (
    <WorkspaceShell title="Payments" subtitle="Collection & Risk Engine" icon={Wallet} accentColor="neon-pink">
      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <p className="text-red-400 text-2xl font-light">${totalAtRisk.toLocaleString()}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">At Risk</p>
        </div>
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
          <p className="text-yellow-400 text-2xl font-light">{buckets.length}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Overdue Buckets</p>
        </div>
        <div className="bg-neon-blue/10 border border-neon-blue/20 rounded-xl p-4 text-center">
          <p className="text-neon-blue text-2xl font-light">{summary?.autopayActive || 0}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">On Autopay</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
          <p className="text-green-400 text-2xl font-light">{summary?.paidThisMonth || 0}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Paid This Month</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Overdue Queue */}
        <GlassCard glowColor="pink" title="Overdue Queue" subtitle="Prioritized by days & amount">
          {buckets.length === 0 ? (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle size={16} />
              No overdue payments
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar">
              {buckets.map((bucket: any, bi: number) => (
                <div key={bi} className="space-y-2">
                  <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">
                    {bucket.label || `${bucket.minDays || 0}-${bucket.maxDays || '+'} days overdue`}
                  </p>
                  {(bucket.items || []).map((item: any) => {
                    const days = item.daysOverdue || 0;
                    const severity: Severity = days > 30 ? 'critical' : days > 14 ? 'high' : days > 7 ? 'medium' : 'low';
                    return (
                      <div key={item.id || item.leaseId} className="bg-white/5 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white text-sm font-medium">{item.tenantName || 'Tenant'}</span>
                          <span className="text-neon-pink text-sm font-mono">${(item.outstandingAmount || item.amount || 0).toLocaleString()}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <RiskMeter level={severity} className="flex-1 mr-4" />
                          <Button size="sm" variant="flat" color="warning" className="text-xs" onPress={() => sendReminder(item.leaseId)}>
                            <Send size={12} /> Remind
                          </Button>
                        </div>
                        <p className="text-gray-500 text-[10px] mt-1 font-mono">{days} days overdue | {item.noticeStatus || 'No notice'}</p>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Autopilot Status */}
        <GlassCard glowColor="blue" title="Autopilot Status" subtitle="Automated payment processing">
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-green-500/5 border border-green-500/10">
              <CheckCircle size={18} className="text-green-400" />
              <div>
                <p className="text-white text-sm">Auto-collection active</p>
                <p className="text-gray-400 text-xs">Late fee cron runs daily at 3 AM ET</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-neon-blue/5 border border-neon-blue/10">
              <Bell size={18} className="text-neon-blue" />
              <div>
                <p className="text-white text-sm">Payment reminders</p>
                <p className="text-gray-400 text-xs">Scheduled for overdue invoices via notification service</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-neon-purple/5 border border-neon-purple/10">
              <AlertTriangle size={18} className="text-neon-purple" />
              <div>
                <p className="text-white text-sm">AI Risk Assessment</p>
                <p className="text-gray-400 text-xs">HIGH/CRITICAL risk payments flagged before processing</p>
              </div>
            </div>
          </div>
        </GlassCard>

        {/* Notice Pipeline */}
        <GlassCard title="Notice Pipeline" subtitle="Legal escalation status">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-2 border-b border-white/5">
              <span className="text-gray-400 text-xs font-mono">STAGE</span>
              <span className="text-gray-400 text-xs font-mono">ACTION</span>
            </div>
            {[
              { stage: 'Reminder Sent', action: 'Auto via cron', status: 'active' },
              { stage: 'Late Fee Applied', action: 'Policy engine', status: 'active' },
              { stage: 'Formal Notice', action: 'Requires approval', status: 'pending' },
              { stage: 'Legal Referral', action: 'Manual escalation', status: 'pending' },
              { stage: 'Court Filing', action: 'Attorney packet', status: 'pending' },
            ].map((step, i) => (
              <div key={i} className="flex items-center justify-between p-2 rounded bg-white/5">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${step.status === 'active' ? 'bg-neon-blue' : 'bg-gray-600'}`} />
                  <span className="text-white text-xs">{step.stage}</span>
                </div>
                <span className="text-gray-400 text-[10px] font-mono">{step.action}</span>
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Operations Summary */}
        <GlassCard title="Operations Summary" subtitle="Payment system health">
          {summary ? (
            <div className="space-y-3">
              {Object.entries(summary).slice(0, 8).map(([key, value]) => (
                <div key={key} className="flex items-center justify-between py-1 border-b border-white/5">
                  <span className="text-gray-400 text-xs">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                  <span className="text-white text-sm font-mono">{typeof value === 'number' ? value.toLocaleString() : String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Summary data unavailable</p>
          )}
        </GlassCard>
      </div>
    </WorkspaceShell>
  );
};

export default PaymentsWorkspace;
