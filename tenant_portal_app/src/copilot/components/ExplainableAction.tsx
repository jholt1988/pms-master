import React from 'react';
import { Brain, ArrowRight, Lightbulb } from 'lucide-react';

interface Props {
  trigger: string;
  reasoning: string;
  recommendation: string;
  onAction?: () => void;
  actionLabel?: string;
}

export const ExplainableAction: React.FC<Props> = ({ trigger, reasoning, recommendation, onAction, actionLabel }) => {
  return (
    <div className="bg-neon-purple/5 border border-neon-purple/10 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <Lightbulb size={14} className="text-yellow-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1">TRIGGER</p>
          <p className="text-gray-300 text-xs">{trigger}</p>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <Brain size={14} className="text-neon-purple mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-[10px] text-gray-500 font-mono uppercase tracking-wider mb-1">REASONING</p>
          <p className="text-gray-300 text-xs">{reasoning}</p>
        </div>
      </div>
      <div className="flex items-center justify-between pt-2 border-t border-white/5">
        <p className="text-white text-sm font-medium">{recommendation}</p>
        {onAction && (
          <button
            onClick={onAction}
            className="flex items-center gap-1 text-neon-blue text-xs hover:text-white transition-colors"
          >
            {actionLabel || 'Execute'} <ArrowRight size={12} />
          </button>
        )}
      </div>
    </div>
  );
};
