import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { GlassCard } from './GlassCard';

describe('GlassCard', () => {
  it('renders children correctly', () => {
    render(
      <GlassCard>
        <div>Test Content</div>
      </GlassCard>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('renders with title and subtitle', () => {
    render(
      <GlassCard title="Test Title" subtitle="Test Subtitle">
        Content
      </GlassCard>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Subtitle')).toBeInTheDocument();
  });

  it('applies correct CSS classes for glassmorphic effect', () => {
    const { container } = render(
      <GlassCard>
        <div>Content</div>
      </GlassCard>
    );

    const card = container.firstChild;
    expect(card).toHaveClass('bg-glass-surface');
    expect(card).toHaveClass('backdrop-blur-xl');
  });

  it('renders action slot when provided', () => {
    render(
      <GlassCard
        title="Test"
        actionSlot={<button>Action</button>}
      >
        Content
      </GlassCard>
    );

    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(
      <GlassCard className="custom-class">
        Content
      </GlassCard>
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});

