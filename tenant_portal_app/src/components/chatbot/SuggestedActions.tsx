import React from 'react';
import type { SuggestedAction } from './types';

interface SuggestedActionsProps {
  actions?: SuggestedAction[];
  onAction: (action: SuggestedAction) => void;
}

export function SuggestedActions({ actions, onAction }: SuggestedActionsProps) {
  if (!actions || actions.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
      {actions.map(action => (
        <button
          key={`${action.label}-${action.action}`}
          onClick={() => onAction(action)}
          style={{
            padding: '6px 12px',
            fontSize: '13px',
            border: '1px solid #007bff',
            borderRadius: '6px',
            backgroundColor: 'white',
            color: '#007bff',
            cursor: 'pointer',
          }}
        >
          {action.label}
        </button>
      ))}
    </div>
  );
}
