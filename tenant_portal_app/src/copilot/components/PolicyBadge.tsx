import React from 'react';
import { CheckCircle, AlertTriangle, XCircle } from 'lucide-react';

type Verdict = 'approve' | 'conditional' | 'deny';

const config: Record<Verdict, { icon: React.ElementType; label: string; bg: string; text: string; border: string }> = {
  approve: { icon: CheckCircle, label: 'APPROVE', bg: 'bg-green-500/10', text: 'text-green-400', border: 'border-green-500/20' },
  conditional: { icon: AlertTriangle, label: 'CONDITIONAL', bg: 'bg-yellow-500/10', text: 'text-yellow-400', border: 'border-yellow-500/20' },
  deny: { icon: XCircle, label: 'DENY', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

export const PolicyBadge: React.FC<{ verdict: Verdict; className?: string }> = ({ verdict, className = '' }) => {
  const c = config[verdict];
  const Icon = c.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono uppercase tracking-wider ${c.bg} ${c.text} border ${c.border} ${className}`}>
      <Icon size={12} />
      {c.label}
    </span>
  );
};
