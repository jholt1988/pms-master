import React, { useState, useEffect } from 'react';
import { RefreshCw, Clock, DollarSign, TrendingUp, ArrowRight, Home, CheckCircle, AlertTriangle } from 'lucide-react';
import { Button } from '@nextui-org/react';
import { useAuth } from '../../AuthContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { ExplainableAction } from '../components/ExplainableAction';
import { RiskMeter } from '../components/RiskMeter';
import { fetchRenewalsWorkspace } from '../api';
import { apiFetch } from '../../services/apiClient';

export const RenewalsWorkspace: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchRenewalsWorkspace(token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return (
      <WorkspaceShell title="Renewals" subtitle="Revenue Continuity Engine" icon={RefreshCw} accentColor="green-400">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4].map(i => <div key={i} className="h-64 bg-white/5 rounded-2xl" />)}
        </div>
      </WorkspaceShell>
    );
  }

  const leases = data?.leases?.data || data?.leases || [];
  const recommendations = data?.recommendations?.data || data?.recommendations || [];

  const now = new Date();
  const ninetyDays = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

  const activeLeases = (Array.isArray(leases) ? leases : []).filter((l: any) => l.status === 'ACTIVE');
  const expiringLeases = activeLeases.filter((l: any) => {
    if (!l.endDate) return false;
    const end = new Date(l.endDate);
    return end <= ninetyDays && end >= now;
  }).sort((a: any, b: any) => new Date(a.endDate).getTime() - new Date(b.endDate).getTime());

  const totalMonthlyAtRisk = expiringLeases.reduce((s: number, l: any) => s + (l.rentAmount || 0), 0);
  const renewalOffersSent = activeLeases.filter((l: any) => l.renewalOffers?.some((o: any) => o.status === 'OFFERED')).length;
  const renewalsAccepted = activeLeases.filter((l: any) => l.renewalOffers?.some((o: any) => o.status === 'ACCEPTED')).length;

  const sendRenewalOffer = async (leaseId: string) => {
    if (!token) return;
    const rec = (Array.isArray(recommendations) ? recommendations : []).find((r: any) => r.unitId === leaseId || r.leaseId === leaseId);
    try {
      await apiFetch(`/leases/${leaseId}/renewal-offers`, {
        token,
        method: 'POST',
        body: {
          proposedRent: rec?.recommendedRent || null,
          proposedStartDate: null,
          proposedEndDate: null,
        },
      });
    } catch {}
  };

  const daysUntilExpiry = (endDate: string) => {
    const diff = new Date(endDate).getTime() - now.getTime();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  };

  return (
    <WorkspaceShell title="Renewals" subtitle="Revenue Continuity Engine" icon={RefreshCw} accentColor="green-400">
      {/* Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
          <p className="text-yellow-400 text-2xl font-light">{expiringLeases.length}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Expiring &le;90d</p>
        </div>
        <div className="bg-neon-pink/10 border border-neon-pink/20 rounded-xl p-4 text-center">
          <p className="text-neon-pink text-2xl font-light">${totalMonthlyAtRisk.toLocaleString()}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Monthly at Risk</p>
        </div>
        <div className="bg-neon-blue/10 border border-neon-blue/20 rounded-xl p-4 text-center">
          <p className="text-neon-blue text-2xl font-light">{renewalOffersSent}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Offers Sent</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
          <p className="text-green-400 text-2xl font-light">{renewalsAccepted}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Accepted</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Expiring Leases Timeline */}
        <GlassCard glowColor="pink" title="Expiring Leases" subtitle="Sorted by urgency" className="lg:col-span-2">
          {expiringLeases.length === 0 ? (
            <p className="text-green-400 text-sm flex items-center gap-2"><CheckCircle size={14} /> No leases expiring within 90 days</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
              {expiringLeases.map((lease: any) => {
                const days = daysUntilExpiry(lease.endDate);
                const severity = days <= 14 ? 'critical' : days <= 30 ? 'high' : days <= 60 ? 'medium' : 'low';
                const rec = (Array.isArray(recommendations) ? recommendations : []).find(
                  (r: any) => r.unitId === lease.unitId
                );
                const offerStatus = lease.renewalOffers?.find((o: any) => o.status === 'OFFERED' || o.status === 'ACCEPTED');

                return (
                  <div key={lease.id} className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-white text-sm font-medium">{lease.tenant?.username || 'Tenant'}</p>
                        <p className="text-gray-400 text-xs">{lease.unit?.property?.name || ''} - {lease.unit?.name || ''}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-mono ${days <= 14 ? 'text-red-400' : days <= 30 ? 'text-yellow-400' : 'text-gray-300'}`}>
                          {days} days
                        </p>
                        <p className="text-gray-500 text-[10px]">${(lease.rentAmount || 0).toLocaleString()}/mo</p>
                      </div>
                    </div>

                    <RiskMeter level={severity} className="mb-3" />

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {rec && (
                          <span className="text-[10px] font-mono text-neon-blue bg-neon-blue/10 px-2 py-0.5 rounded">
                            AI: ${rec.recommendedRent?.toLocaleString()}/mo suggested
                          </span>
                        )}
                        {offerStatus && (
                          <span className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                            offerStatus.status === 'ACCEPTED' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'
                          }`}>
                            {offerStatus.status}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {!offerStatus && (
                          <Button size="sm" color="primary" variant="flat" className="text-xs" onPress={() => sendRenewalOffer(lease.id)}>
                            Send Offer
                          </Button>
                        )}
                        <Button size="sm" variant="bordered" className="text-xs text-gray-400 border-gray-600">
                          <Home size={12} /> Prep Listing
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Pricing Intelligence */}
        <GlassCard glowColor="purple" title="Pricing Intelligence" subtitle="AI rent recommendations">
          {(Array.isArray(recommendations) ? recommendations : []).length === 0 ? (
            <p className="text-gray-500 text-sm">No rent recommendations available. ML service generates these nightly.</p>
          ) : (
            <div className="space-y-3 max-h-[300px] overflow-y-auto no-scrollbar">
              {(Array.isArray(recommendations) ? recommendations : []).slice(0, 6).map((rec: any) => (
                <div key={rec.id} className="flex items-center justify-between p-3 rounded bg-white/5">
                  <div>
                    <p className="text-white text-xs">Unit {rec.unitId?.slice(-6) || rec.unit?.name || ''}</p>
                    <p className="text-gray-500 text-[10px]">
                      Current: ${(rec.currentRent || 0).toLocaleString()} | Suggested: ${(rec.recommendedRent || 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    {rec.recommendedRent > rec.currentRent ? (
                      <span className="text-green-400 text-xs font-mono flex items-center gap-1">
                        <TrendingUp size={12} /> +${((rec.recommendedRent || 0) - (rec.currentRent || 0)).toLocaleString()}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs font-mono">No change</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Renewal Strategy */}
        <GlassCard title="Renewal Strategy" subtitle="Automated workflow">
          <div className="space-y-3">
            <ExplainableAction
              trigger="Leases approaching 90-day expiration window"
              reasoning="System evaluates churn risk, market comparables, and tenant payment history to determine optimal renewal pricing"
              recommendation="AI generates offers nightly. Review and send to tenants before the 60-day mark for maximum retention."
            />
            <div className="pt-3 border-t border-white/5 space-y-2">
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <CheckCircle size={12} className="text-green-400" /> Daily expiration monitoring (90/60/30/14/7 days)
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <CheckCircle size={12} className="text-green-400" /> AI pricing with churn risk analysis
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <CheckCircle size={12} className="text-green-400" /> Auto-renewal support with escalation %
              </div>
              <div className="flex items-center gap-2 text-gray-400 text-xs">
                <AlertTriangle size={12} className="text-yellow-400" /> Fallback to listing pipeline if declined
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </WorkspaceShell>
  );
};

export default RenewalsWorkspace;
