import React from 'react';
import type { FeedbackPayload } from './types';

interface FeedbackControlsProps {
  messageId: string;
  value: 'positive' | 'negative' | null | undefined;
  onFeedback: (payload: FeedbackPayload) => void;
}

export function FeedbackControls({ messageId, value, onFeedback }: FeedbackControlsProps) {
  return (
    <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
      <button
        aria-label="Mark answer helpful"
        onClick={() => onFeedback({ messageId, sentiment: 'positive' })}
        style={{
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          border: 'none',
          backgroundColor: value === 'positive' ? '#d1fae5' : '#f0f0f0',
          cursor: 'pointer',
        }}
      >
        👍
      </button>
      <button
        aria-label="Mark answer unhelpful"
        onClick={() => onFeedback({ messageId, sentiment: 'negative' })}
        style={{
          borderRadius: '50%',
          width: '32px',
          height: '32px',
          border: 'none',
          backgroundColor: value === 'negative' ? '#fee2e2' : '#f0f0f0',
          cursor: 'pointer',
        }}
      >
        👎
      </button>
    </div>
  );
}
