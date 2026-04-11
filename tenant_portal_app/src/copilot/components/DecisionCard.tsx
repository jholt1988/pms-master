import React, { useState } from 'react';
import { Button } from '@nextui-org/react';
import { Brain, Clock, Loader2 } from 'lucide-react';
import { useAuth } from '../../AuthContext';
import { executeDecisionAction } from '../api';
import type { Decision, Urgency } from '../types';

const urgencyLabel: Record<Urgency, { text: string; color: string }> = {
  immediate: { text: 'NOW', color: 'text-red-400 bg-red-500/10' },
  today: { text: 'TODAY', color: 'text-yellow-400 bg-yellow-500/10' },
  this_week: { text: 'THIS WEEK', color: 'text-gray-400 bg-white/5' },
};

interface Props {
  decision: Decision;
  onActionComplete?: (decisionId: string) => void;
}

export const DecisionCard: React.FC<Props> = ({ decision, onActionComplete }) => {
  const { token } = useAuth();
  const [executing, setExecuting] = useState<string | null>(null);
  const [result, setResult] = useState<'success' | 'error' | null>(null);
  const urg = urgencyLabel[decision.urgency];

  const handleAction = async (action: Decision['actions'][0]) => {
    if (!token || action.confirmRequired) return;
    setExecuting(action.label);
    setResult(null);
    try {
      await executeDecisionAction(token, action.endpoint, action.method, action.body);
      setResult('success');
      onActionComplete?.(decision.id);
    } catch {
      setResult('error');
    } finally {
      setExecuting(null);
    }
  };

  if (result === 'success') {
    return (
      <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 text-green-400 text-sm">
        Action completed for: {decision.title}
      </div>
    );
  }

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-colors">
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-mono uppercase tracking-wider px-1.5 py-0.5 rounded ${urg.color}`}>
              {urg.text}
            </span>
            <span className="text-[10px] text-gray-500 font-mono uppercase">{decision.domain}</span>
          </div>
          <h4 className="text-white text-sm font-medium">{decision.title}</h4>
        </div>
      </div>

      <p className="text-gray-400 text-xs mb-3 leading-relaxed">{decision.context}</p>

      {decision.aiRecommendation && (
        <div className="flex items-start gap-2 mb-3 p-2 rounded bg-neon-purple/5 border border-neon-purple/10">
          <Brain size={14} className="text-neon-purple mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-300">{decision.aiRecommendation}</p>
        </div>
      )}

      {result === 'error' && (
        <p className="text-red-400 text-xs mb-2">Action failed. Try again.</p>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        {decision.actions.map((action) => (
          <Button
            key={action.label}
            size="sm"
            color={action.variant === 'danger' ? 'danger' : action.variant === 'primary' ? 'primary' : 'default'}
            variant={action.variant === 'neutral' ? 'bordered' : 'flat'}
            onPress={() => handleAction(action)}
            isLoading={executing === action.label}
            isDisabled={!!executing}
            className="text-xs"
          >
            {executing === action.label ? <Loader2 size={12} className="animate-spin" /> : null}
            {action.label}
          </Button>
        ))}
      </div>
    </div>
  );
};
