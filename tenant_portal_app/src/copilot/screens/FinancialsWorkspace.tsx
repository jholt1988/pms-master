import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Lock,
  Unlock,
  Send,
  ArrowRightLeft,
  DollarSign,
  XCircle,
} from 'lucide-react';
import { Button } from '@nextui-org/react';
import { useAuth } from '../../AuthContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { WorkspaceShell } from '../components/WorkspaceShell';
import { RiskMeter } from '../components/RiskMeter';
import { TimelineRail } from '../components/TimelineRail';
import { fetchFinancialsWorkspace } from '../api';
import { apiFetch } from '../../services/apiClient';
import type { Severity } from '../types';

const closeStepLabel: Record<string, string> = {
  open: 'Open',
  reconciling: 'Reconciling',
  review: 'Ready for Review',
  locked: 'Locked',
  reported: 'Reported',
};

const closeStepSeverity = (step: string): Severity => {
  if (step === 'locked' || step === 'reported') return 'low';
  if (step === 'review') return 'medium';
  if (step === 'reconciling') return 'high';
  return 'critical';
};

export const FinancialsWorkspace: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    fetchFinancialsWorkspace(token)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const categorize = async (txId: string, category: string) => {
    if (!token) return;
    try {
      await apiFetch(`/bookkeeping/transactions/${txId}/categorize`, { token, method: 'PATCH', body: { category } });
      setData((prev: any) => ({
        ...prev,
        pendingTransactions: prev.pendingTransactions.filter((t: any) => t.id !== txId),
        metrics: { ...prev.metrics, pendingCategorization: prev.metrics.pendingCategorization - 1 },
      }));
    } catch {}
  };

  const approveStatement = async (stmtId: string) => {
    if (!token) return;
    try {
      await apiFetch(`/bookkeeping/owner-statements/${stmtId}/approve`, { token, method: 'PATCH', body: {} });
      setData((prev: any) => ({
        ...prev,
        ownerStatements: prev.ownerStatements.map((s: any) => s.id === stmtId ? { ...s, status: 'APPROVED' } : s),
      }));
    } catch {}
  };

  if (loading) {
    return (
      <WorkspaceShell title="Financials" subtitle="Bookkeeping & Reconciliation" icon={BookOpen} accentColor="neon-green">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-pulse">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="h-64 bg-white/5 rounded-2xl" />)}
        </div>
      </WorkspaceShell>
    );
  }

  const metrics = data?.metrics || {};
  const pending = data?.pendingTransactions || [];
  const exceptions = data?.exceptions || [];
  const recon = data?.reconciliation || { unmatchedCount: 0, matchedCount: 0, exceptionCount: 0 };
  const monthlyClose = data?.monthlyClose || [];
  const ownerStatements = data?.ownerStatements || [];

  return (
    <WorkspaceShell title="Financials" subtitle="Bookkeeping & Reconciliation" icon={BookOpen} accentColor="neon-green">
      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 text-center">
          <p className="text-yellow-400 text-2xl font-light">{metrics.pendingCategorization || 0}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Pending Review</p>
        </div>
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <p className="text-red-400 text-2xl font-light">{metrics.exceptionsCount || 0}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Exceptions</p>
        </div>
        <div className="bg-neon-blue/10 border border-neon-blue/20 rounded-xl p-4 text-center">
          <p className="text-neon-blue text-2xl font-light">${((metrics.unreconciledAmount || 0) / 100).toLocaleString()}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Unreconciled</p>
        </div>
        <div className="bg-neon-purple/10 border border-neon-purple/20 rounded-xl p-4 text-center">
          <p className="text-neon-purple text-2xl font-light">{metrics.monthsOpen || 0}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Months Open</p>
        </div>
        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4 text-center">
          <p className="text-green-400 text-2xl font-light">{metrics.ownerDistributionsDue || 0}</p>
          <p className="text-gray-400 text-xs font-mono uppercase mt-1">Distributions Due</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Transaction Capture & Categorization */}
        <GlassCard glowColor="blue" title="Transaction Review" subtitle="Pending categorization & allocation">
          {pending.length === 0 ? (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle size={16} />
              All transactions categorized
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar">
              {pending.map((tx: any) => (
                <div key={tx.id} className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-white text-sm font-medium truncate mr-2">{tx.description}</span>
                    <span className={`text-sm font-mono ${tx.amountCents > 0 ? 'text-green-400' : 'text-neon-pink'}`}>
                      ${(Math.abs(tx.amountCents) / 100).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-500 text-[10px] font-mono mb-2">
                    {new Date(tx.date).toLocaleDateString()} | {tx.sourceType}
                    {tx.category && ` | AI: ${tx.category} (${Math.round((tx.categoryConfidence || 0) * 100)}%)`}
                  </p>
                  <div className="flex items-center gap-2">
                    {tx.category && (
                      <Button size="sm" variant="flat" color="success" className="text-xs" onPress={() => categorize(tx.id, tx.category)}>
                        <CheckCircle size={12} /> Accept
                      </Button>
                    )}
                    <Button size="sm" variant="flat" color="warning" className="text-xs">
                      <FileText size={12} /> Re-categorize
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Exception Review */}
        <GlassCard glowColor="pink" title="Exception Queue" subtitle="Anomalies & unresolved items">
          {exceptions.length === 0 ? (
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle size={16} />
              No exceptions
            </div>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar">
              {exceptions.map((tx: any) => {
                const severity: Severity = Math.abs(tx.amountCents) > 100000 ? 'critical' : Math.abs(tx.amountCents) > 10000 ? 'high' : 'medium';
                return (
                  <div key={tx.id} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <XCircle size={14} className="text-red-400" />
                        <span className="text-white text-sm">{tx.description}</span>
                      </div>
                      <span className="text-neon-pink text-sm font-mono">${(Math.abs(tx.amountCents) / 100).toLocaleString()}</span>
                    </div>
                    <p className="text-gray-500 text-[10px] font-mono">{tx.exceptionReason || 'Requires manual review'}</p>
                    <RiskMeter level={severity} className="mt-2" />
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Reconciliation Status */}
        <GlassCard glowColor="blue" title="Reconciliation" subtitle="Bank-to-ledger matching">
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-lg bg-yellow-500/5 border border-yellow-500/10">
                <p className="text-yellow-400 text-lg font-light">{recon.unmatchedCount}</p>
                <p className="text-gray-500 text-[10px] font-mono uppercase">Unmatched</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-green-500/5 border border-green-500/10">
                <p className="text-green-400 text-lg font-light">{recon.matchedCount}</p>
                <p className="text-gray-500 text-[10px] font-mono uppercase">Matched</p>
              </div>
              <div className="text-center p-2 rounded-lg bg-red-500/5 border border-red-500/10">
                <p className="text-red-400 text-lg font-light">{recon.exceptionCount}</p>
                <p className="text-gray-500 text-[10px] font-mono uppercase">Exceptions</p>
              </div>
            </div>
            <div className="space-y-2">
              {(recon.items || []).slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded bg-white/5">
                  <div className="flex items-center gap-2">
                    <ArrowRightLeft size={12} className={item.status === 'EXCEPTION' ? 'text-red-400' : 'text-yellow-400'} />
                    <span className="text-white text-xs">${(Math.abs(item.bankAmountCents || item.bankAmount) / 100).toLocaleString()}</span>
                  </div>
                  <span className={`text-[10px] font-mono uppercase ${item.status === 'EXCEPTION' ? 'text-red-400' : 'text-yellow-400'}`}>
                    {item.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Monthly Close Pipeline */}
        <GlassCard title="Monthly Close" subtitle="Period-end workflow by property">
          {monthlyClose.length === 0 ? (
            <p className="text-gray-500 text-sm">No properties configured</p>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar">
              {monthlyClose.map((mc: any) => (
                <div key={mc.propertyId} className="bg-white/5 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-white text-sm font-medium">{mc.propertyName}</span>
                    <div className="flex items-center gap-1.5">
                      {mc.step === 'locked' || mc.step === 'reported' ? (
                        <Lock size={12} className="text-green-400" />
                      ) : (
                        <Unlock size={12} className="text-yellow-400" />
                      )}
                      <span className={`text-[10px] font-mono uppercase ${closeStepSeverity(mc.step) === 'low' ? 'text-green-400' : closeStepSeverity(mc.step) === 'medium' ? 'text-yellow-400' : 'text-red-400'}`}>
                        {closeStepLabel[mc.step] || mc.step}
                      </span>
                    </div>
                  </div>
                  <RiskMeter level={closeStepSeverity(mc.step)} className="mb-1" />
                  <div className="flex items-center gap-4 text-gray-500 text-[10px] font-mono">
                    <span>{mc.unreconciledCount} unreconciled</span>
                    <span>{mc.exceptionCount} exceptions</span>
                    <span>{mc.pendingJournalEntries} draft JEs</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        {/* Owner Statements */}
        <GlassCard glowColor="purple" title="Owner Reporting" subtitle="Monthly distribution statements">
          {ownerStatements.length === 0 ? (
            <p className="text-gray-500 text-sm">No statements for this period</p>
          ) : (
            <div className="space-y-3 max-h-[350px] overflow-y-auto no-scrollbar">
              {ownerStatements.map((stmt: any) => {
                const ownerName = stmt.owner?.firstName
                  ? `${stmt.owner.firstName} ${stmt.owner.lastName || ''}`
                  : stmt.owner?.username || 'Owner';
                return (
                  <div key={stmt.id} className="bg-white/5 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-white text-sm font-medium">{ownerName}</span>
                      <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full ${
                        stmt.status === 'SENT' ? 'bg-green-500/10 text-green-400' :
                        stmt.status === 'APPROVED' ? 'bg-neon-blue/10 text-neon-blue' :
                        'bg-yellow-500/10 text-yellow-400'
                      }`}>
                        {stmt.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2 text-[10px] font-mono">
                      <div>
                        <span className="text-gray-500">Income:</span>
                        <span className="text-green-400 ml-1">${((stmt.grossIncomeCents || 0) / 100).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Expenses:</span>
                        <span className="text-red-400 ml-1">${((stmt.totalExpensesCents || 0) / 100).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Mgmt Fee:</span>
                        <span className="text-yellow-400 ml-1">${((stmt.managementFeeCents || 0) / 100).toLocaleString()}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Net:</span>
                        <span className="text-neon-blue ml-1 font-medium">${((stmt.netDistributionCents || 0) / 100).toLocaleString()}</span>
                      </div>
                    </div>
                    {stmt.status === 'DRAFT' && (
                      <div className="flex items-center gap-2 mt-2">
                        <Button size="sm" variant="flat" color="success" className="text-xs" onPress={() => approveStatement(stmt.id)}>
                          <CheckCircle size={12} /> Approve
                        </Button>
                        <Button size="sm" variant="flat" color="primary" className="text-xs">
                          <Send size={12} /> Approve & Send
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>

        {/* Bookkeeping Workflow Pipeline */}
        <GlassCard title="Workflow Pipeline" subtitle="Transaction lifecycle">
          <TimelineRail
            events={[
              { id: 'capture', label: 'Capture', date: 'Bank/Stripe/Manual', status: 'completed' },
              { id: 'categorize', label: 'Categorize', date: `${pending.length} pending`, status: pending.length > 0 ? 'active' : 'completed' },
              { id: 'allocate', label: 'Allocate', date: 'Prop/Unit/Lease', status: pending.length > 0 ? 'upcoming' : 'active' },
              { id: 'reconcile', label: 'Reconcile', date: `${recon.unmatchedCount} unmatched`, status: 'upcoming' },
              { id: 'review', label: 'Review', date: `${exceptions.length} exceptions`, status: 'upcoming' },
              { id: 'close', label: 'Close', date: `${metrics.monthsOpen || 0} open`, status: 'upcoming' },
              { id: 'report', label: 'Report', date: `${metrics.ownerDistributionsDue || 0} stmts`, status: 'upcoming' },
            ]}
          />
        </GlassCard>
      </div>
    </WorkspaceShell>
  );
};

export default FinancialsWorkspace;
