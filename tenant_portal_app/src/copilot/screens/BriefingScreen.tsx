import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, Calendar, Activity, DollarSign, Users, Home, Wrench, RefreshCw } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { GlassCard } from '../../components/ui/GlassCard';
import { IntentBar } from '../components/IntentBar';
import { SignalCard } from '../components/SignalCard';
import { DecisionCard } from '../components/DecisionCard';
import { fetchBriefing } from '../api';
import type { BriefingData } from '../types';

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

const eventTypeIcon: Record<string, React.ElementType> = {
  tour: Users,
  move_in: Home,
  move_out: Home,
  inspection: Activity,
  maintenance: Wrench,
  lease_expiration: Clock,
  signing: DollarSign,
};

export const BriefingScreen: React.FC = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    fetchBriefing(token)
      .then(setData)
      .catch(() => setError('Failed to load briefing'))
      .finally(() => setLoading(false));
  }, [token]);

  const handleDecisionComplete = (id: string) => {
    if (!data) return;
    setData({ ...data, decisions: data.decisions.filter(d => d.id !== id) });
  };

  const today = new Date();
  const greeting = today.getHours() < 12 ? 'Good morning' : today.getHours() < 18 ? 'Good afternoon' : 'Good evening';
  const dateStr = today.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 w-64 bg-white/5 rounded" />
        <div className="h-12 bg-white/5 rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => <div key={i} className="h-48 bg-white/5 rounded-2xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Greeting & Date */}
      <div>
        <h1 className="text-white text-2xl font-light">
          {greeting}, <span className="font-medium">{user?.username || 'Operator'}</span>
        </h1>
        <p className="text-gray-500 text-sm font-mono">{dateStr}</p>
      </div>

      {/* Intent Bar */}
      <IntentBar />

      {/* Metrics Strip */}
      {data && (
        <div className="flex items-center gap-4 overflow-x-auto pb-2 no-scrollbar">
          {data.metrics.atRiskAmount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono whitespace-nowrap">
              <DollarSign size={12} />
              ${data.metrics.atRiskAmount.toLocaleString()} at risk
            </div>
          )}
          {data.metrics.pendingDecisions > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-mono whitespace-nowrap">
              <AlertTriangle size={12} />
              {data.metrics.pendingDecisions} decisions pending
            </div>
          )}
          {data.metrics.todayEvents > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-blue/10 border border-neon-blue/20 text-neon-blue text-xs font-mono whitespace-nowrap">
              <Calendar size={12} />
              {data.metrics.todayEvents} events today
            </div>
          )}
          {data.metrics.overduePayments > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-neon-pink/10 border border-neon-pink/20 text-neon-pink text-xs font-mono whitespace-nowrap">
              <Clock size={12} />
              {data.metrics.overduePayments} overdue
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3">
          {error}
        </div>
      )}

      {/* Three-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Critical Signals */}
        <GlassCard glowColor="pink" title="Critical Signals" subtitle="System-detected risks & anomalies">
          {(!data?.signals.length) ? (
            <p className="text-gray-500 text-sm">No critical signals. Operations normal.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
              {data.signals.map(s => <SignalCard key={s.id} signal={s} />)}
            </div>
          )}
        </GlassCard>

        {/* Needs Your Decision */}
        <GlassCard glowColor="purple" title="Needs Your Decision" subtitle="Actions requiring your judgment">
          {(!data?.decisions.length) ? (
            <p className="text-gray-500 text-sm">No pending decisions. All clear.</p>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
              {data.decisions.map(d => (
                <DecisionCard key={d.id} decision={d} onActionComplete={handleDecisionComplete} />
              ))}
            </div>
          )}
        </GlassCard>

        {/* Scheduled Events */}
        <GlassCard glowColor="blue" title="Today's Schedule" subtitle="Inspections, tours, move-ins & more">
          {(!data?.events.length) ? (
            <p className="text-gray-500 text-sm">No events scheduled for today.</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto no-scrollbar">
              {data.events.map(event => {
                const Icon = eventTypeIcon[event.type] || Activity;
                return (
                  <div key={event.id} className="flex items-start gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/8 transition-colors">
                    <div className="p-1.5 rounded-lg bg-neon-blue/10">
                      <Icon size={14} className="text-neon-blue" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm truncate">{event.title}</p>
                      <p className="text-gray-400 text-xs">
                        {event.propertyName}{event.unitName ? ` - ${event.unitName}` : ''}
                      </p>
                    </div>
                    <span className="text-xs text-gray-500 font-mono whitespace-nowrap">
                      {formatTime(event.scheduledAt)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default BriefingScreen;
