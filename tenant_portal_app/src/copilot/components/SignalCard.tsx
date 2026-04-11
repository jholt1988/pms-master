import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, AlertCircle, Info, DollarSign, ArrowRight } from 'lucide-react';
import type { Signal, Severity } from '../types';

const severityConfig: Record<Severity, { border: string; icon: React.ElementType; iconColor: string; bg: string }> = {
  critical: { border: 'border-l-red-500', icon: AlertTriangle, iconColor: 'text-red-400', bg: 'bg-red-500/5' },
  high: { border: 'border-l-neon-pink', icon: AlertCircle, iconColor: 'text-neon-pink', bg: 'bg-neon-pink/5' },
  medium: { border: 'border-l-yellow-400', icon: Info, iconColor: 'text-yellow-400', bg: 'bg-yellow-400/5' },
  low: { border: 'border-l-gray-500', icon: Info, iconColor: 'text-gray-400', bg: 'bg-white/5' },
};

export const SignalCard: React.FC<{ signal: Signal }> = ({ signal }) => {
  const navigate = useNavigate();
  const config = severityConfig[signal.severity];
  const Icon = config.icon;

  return (
    <div
      className={`${config.bg} border-l-4 ${config.border} rounded-r-lg p-4 flex items-start gap-3 group cursor-pointer hover:bg-white/10 transition-colors`}
      onClick={() => navigate(signal.actionUrl)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(signal.actionUrl)}
    >
      <Icon size={20} className={`${config.iconColor} mt-0.5 flex-shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-white text-sm font-medium truncate">{signal.title}</span>
          {signal.monetaryImpact != null && signal.monetaryImpact > 0 && (
            <span className="flex items-center gap-0.5 text-xs font-mono text-neon-pink bg-neon-pink/10 px-1.5 py-0.5 rounded">
              <DollarSign size={10} />
              {signal.monetaryImpact.toLocaleString()}
            </span>
          )}
        </div>
        <p className="text-gray-400 text-xs leading-relaxed">{signal.summary}</p>
      </div>
      <ArrowRight size={16} className="text-gray-600 group-hover:text-white transition-colors mt-1 flex-shrink-0" />
    </div>
  );
};
