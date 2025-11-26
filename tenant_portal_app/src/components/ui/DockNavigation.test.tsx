import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DockNavigation } from './DockNavigation';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderDock = () => {
  return render(
    <BrowserRouter>
      <DockNavigation />
    </BrowserRouter>
  );
};

describe('DockNavigation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all dock items', () => {
    renderDock();

    expect(screen.getByLabelText(/dashboard/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/maintenance/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/payments/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/messages/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/leases/i)).toBeInTheDocument();
  });

  it('has correct ARIA labels for accessibility', () => {
    renderDock();

    const items = [
      'Dashboard',
      'Maintenance',
      'Payments',
      'Messages',
      'Leases',
      'Properties',
    ];

    items.forEach((item) => {
      expect(screen.getByLabelText(new RegExp(item, 'i'))).toBeInTheDocument();
    });
  });

  it('applies hover effects on dock items', () => {
    const { container } = renderDock();
    const dockItems = container.querySelectorAll('[role="button"]');

    expect(dockItems.length).toBeGreaterThan(0);
    // Each item should have transition classes
    dockItems.forEach((item) => {
      expect(item).toHaveClass('transition-all');
    });
  });
});

