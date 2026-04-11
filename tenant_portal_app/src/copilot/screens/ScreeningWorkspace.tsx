import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, AlertTriangle, XCircle, Brain, Shield, ArrowRight } from 'lucide-react';
import { Button } from '@nextui-org/react';
import { useAuth } from '../../AuthContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { PolicyBadge } from '../components/PolicyBadge';
import { ExplainableAction } from '../components/ExplainableAction';
import { fetchScreeningWorkspace, fetchPolicyEvaluation } from '../api';
import { apiFetch } from '../../services/apiClient';
import type { PolicyEvaluation } from '../types';

export const ScreeningWorkspace: React.FC = () => {
  const { token } = useAuth();
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [evaluation, setEvaluation] = useState<PolicyEvaluation | null>(null);
  const [evalLoading, setEvalLoading] = useState(false);

  useEffect(() => {
    if (!token) return;
    fetchScreeningWorkspace(token)
      .then(d => setApplications(d.applications))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const selectApp = async (app: any) => {
    setSelectedApp(app);
    if (!token) return;
    setEvalLoading(true);
    try {
      const ev = await fetchPolicyEvaluation(token, app.id);
      setEvaluation(ev);
    } catch {
      setEvaluation(null);
    } finally {
      setEvalLoading(false);
    }
  };

  const handleDecision = async (appId: string, status: string) => {
    if (!token) return;
    try {
      await apiFetch(`/rental-applications/${appId}/status`, { token, method: 'PATCH', body: { status } });
      setApplications(prev => prev.map(a => a.id === appId ? { ...a, status } : a));
      setSelectedApp(null);
      setEvaluation(null);
    } catch {}
  };

  const categorize = (apps: any[]) => {
    const approve: any[] = [];
    const conditional: any[] = [];
    const deny: any[] = [];
    const pending: any[] = [];

    apps.forEach(app => {
      const s = (app.qualificationStatus || app.status || '').toUpperCase();
      if (s === 'APPROVED' || s === 'QUALIFIED') approve.push(app);
      else if (s === 'CONDITIONAL' || s === 'CONDITIONALLY_APPROVED') conditional.push(app);
      else if (s === 'REJECTED' || s === 'DENIED' || s === 'DISQUALIFIED') deny.push(app);
      else pending.push(app);
    });

    return { approve, conditional, deny, pending };
  };

  const { approve, conditional, deny, pending } = categorize(applications);

  if (loading) {
    return (
      <WorkspaceShell title="Screening" subtitle="Policy Decision Engine" icon={Users} accentColor="neon-purple">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-pulse">
          {[1, 2, 3].map(i => <div key={i} className="h-64 bg-white/5 rounded-2xl" />)}
        </div>
      </WorkspaceShell>
    );
  }

  return (
    <WorkspaceShell title="Screening" subtitle="Policy Decision Engine" icon={Users} accentColor="neon-purple">
      {/* Policy Summary Strip */}
      <div className="flex items-center gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
          <Shield size={12} /> Credit &ge; 620
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
          <Shield size={12} /> No recent evictions
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs text-gray-300">
          <Shield size={12} /> Income &ge; 4x rent
        </div>
        <div className="ml-auto text-xs text-gray-500 font-mono">
          0 fail = Approve | 1 fail = Conditional | 2+ fail = Deny
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending + Approve Column */}
        <div className="space-y-4">
          {pending.length > 0 && (
            <GlassCard title={`Pending Review (${pending.length})`} subtitle="Awaiting screening">
              <div className="space-y-2">
                {pending.map(app => (
                  <AppRow key={app.id} app={app} onClick={() => selectApp(app)} />
                ))}
              </div>
            </GlassCard>
          )}
          <GlassCard glowColor="none" title={`Approved (${approve.length})`} subtitle="Passed all criteria">
            {approve.length === 0 ? (
              <p className="text-gray-500 text-sm">None yet</p>
            ) : (
              <div className="space-y-2">
                {approve.map(app => <AppRow key={app.id} app={app} onClick={() => selectApp(app)} verdict="approve" />)}
              </div>
            )}
          </GlassCard>
        </div>

        {/* Conditional Column */}
        <GlassCard glowColor="none" title={`Conditional (${conditional.length})`} subtitle="1 criterion failed - mitigation required">
          {conditional.length === 0 ? (
            <p className="text-gray-500 text-sm">None</p>
          ) : (
            <div className="space-y-2">
              {conditional.map(app => <AppRow key={app.id} app={app} onClick={() => selectApp(app)} verdict="conditional" />)}
            </div>
          )}
        </GlassCard>

        {/* Deny Column */}
        <GlassCard glowColor="none" title={`Denied (${deny.length})`} subtitle="2+ criteria failed">
          {deny.length === 0 ? (
            <p className="text-gray-500 text-sm">None</p>
          ) : (
            <div className="space-y-2">
              {deny.map(app => <AppRow key={app.id} app={app} onClick={() => selectApp(app)} verdict="deny" />)}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Detail Panel */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => { setSelectedApp(null); setEvaluation(null); }}>
          <div className="bg-deep-900 border border-white/10 rounded-2xl max-w-lg w-full mx-4 p-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white text-lg font-light">{selectedApp.fullName || selectedApp.applicantName || 'Applicant'}</h2>
              {evaluation && <PolicyBadge verdict={evaluation.verdict} />}
            </div>

            <div className="space-y-2 mb-4">
              <p className="text-gray-400 text-xs">Email: {selectedApp.email || 'N/A'}</p>
              <p className="text-gray-400 text-xs">Income: ${(selectedApp.income || 0).toLocaleString()}/mo</p>
              <p className="text-gray-400 text-xs">Credit Score: {selectedApp.creditScore || 'Pending'}</p>
            </div>

            {evalLoading ? (
              <div className="animate-pulse space-y-2">
                {[1, 2, 3].map(i => <div key={i} className="h-12 bg-white/5 rounded" />)}
              </div>
            ) : evaluation ? (
              <div className="space-y-4">
                <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider">POLICY EVALUATION</p>
                {evaluation.criteria.map(c => (
                  <div key={c.rule} className={`flex items-start gap-3 p-3 rounded-lg ${c.passed ? 'bg-green-500/5 border border-green-500/10' : 'bg-red-500/5 border border-red-500/10'}`}>
                    {c.passed ? <CheckCircle size={16} className="text-green-400 mt-0.5" /> : <XCircle size={16} className="text-red-400 mt-0.5" />}
                    <div>
                      <p className="text-white text-sm">{c.rule.replace(/_/g, ' ').toUpperCase()}</p>
                      <p className="text-gray-400 text-xs">{c.explanation}</p>
                      <p className="text-gray-500 text-[10px] font-mono mt-1">Actual: {c.actual} | Required: {c.threshold}</p>
                    </div>
                  </div>
                ))}

                {evaluation.conditionalTerms && (
                  <ExplainableAction
                    trigger="Applicant failed 1 screening criterion"
                    reasoning={`${evaluation.conditionalTerms.requiresCosigner ? 'Income below 4x rent threshold. ' : ''}Policy allows conditional approval with mitigation.`}
                    recommendation={`Require ${evaluation.conditionalTerms.requiresCosigner ? 'co-signer and ' : ''}deposit of $${evaluation.conditionalTerms.requiredDeposit.toLocaleString()}`}
                  />
                )}

                <div className="flex items-center gap-2 pt-4 border-t border-white/10">
                  <Button size="sm" color="success" variant="flat" onPress={() => handleDecision(selectedApp.id, 'APPROVED')}>
                    <CheckCircle size={14} /> Approve
                  </Button>
                  {evaluation.verdict === 'conditional' && (
                    <Button size="sm" color="warning" variant="flat" onPress={() => handleDecision(selectedApp.id, 'CONDITIONALLY_APPROVED')}>
                      <AlertTriangle size={14} /> Approve w/ Conditions
                    </Button>
                  )}
                  <Button size="sm" color="danger" variant="flat" onPress={() => handleDecision(selectedApp.id, 'REJECTED')}>
                    <XCircle size={14} /> Deny
                  </Button>
                  {evaluation.overrideAllowed && (
                    <Button size="sm" variant="bordered" className="text-gray-400 border-gray-600 text-xs ml-auto">
                      Override
                    </Button>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}
    </WorkspaceShell>
  );
};

const AppRow: React.FC<{ app: any; onClick: () => void; verdict?: 'approve' | 'conditional' | 'deny' }> = ({ app, onClick, verdict }) => {
  return (
    <button onClick={onClick} className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 transition-colors text-left">
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm truncate">{app.fullName || app.applicantName || 'Applicant'}</p>
        <p className="text-gray-400 text-xs truncate">{app.propertyName || app.property?.name || ''} {app.unitName || ''}</p>
      </div>
      {verdict && <PolicyBadge verdict={verdict} />}
      <ArrowRight size={14} className="text-gray-600" />
    </button>
  );
};

export default ScreeningWorkspace;
