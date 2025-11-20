import React from 'react';
import type { ChatMessageUI } from './types';

interface StreamingMessageProps {
  message: ChatMessageUI;
}

export function StreamingMessage({ message }: StreamingMessageProps) {
  const isUser = message.role === 'user';
  return (
    <div
      className={`message ${isUser ? 'message-user' : 'message-assistant'}`}
      style={{
        display: 'flex',
        justifyContent: isUser ? 'flex-end' : 'flex-start',
        marginBottom: '12px',
        opacity: message.streaming ? 0.9 : 1,
      }}
    >
      <div
        style={{
          maxWidth: '80%',
          padding: '12px 16px',
          borderRadius: '12px',
          backgroundColor: isUser ? '#007bff' : '#f0f0f0',
          color: isUser ? 'white' : 'black',
          position: 'relative',
        }}
      >
        <div>{message.content || (message.streaming ? '…' : '')}</div>
        {message.streaming && !isUser && (
          <div style={{ fontSize: '11px', marginTop: '4px', color: '#666' }}>streaming…</div>
        )}
      </div>
    </div>
  );
}
