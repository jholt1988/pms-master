import React from 'react';
import type { Severity } from '../types';

const config: Record<Severity, { width: string; color: string; label: string }> = {
  low: { width: 'w-1/4', color: 'bg-gray-500', label: 'Low Risk' },
  medium: { width: 'w-2/4', color: 'bg-yellow-500', label: 'Medium Risk' },
  high: { width: 'w-3/4', color: 'bg-neon-pink', label: 'High Risk' },
  critical: { width: 'w-full', color: 'bg-red-500', label: 'Critical Risk' },
};

export const RiskMeter: React.FC<{ level: Severity; className?: string }> = ({ level, className = '' }) => {
  const c = config[level];
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
        <div className={`h-full ${c.width} ${c.color} rounded-full transition-all duration-500`} />
      </div>
      <span className="text-[10px] text-gray-400 font-mono uppercase whitespace-nowrap">{c.label}</span>
    </div>
  );
};
