import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock useAuth BEFORE any other imports
vi.mock('../../AuthContext', () => {
  const React = require('react');
  return {
    useAuth: () => ({
      token: 'test-token',
      user: { id: 1, username: 'test@test.com', role: 'TENANT' },
      login: vi.fn(),
      logout: vi.fn(),
    }),
    AuthProvider: ({ children }: { children: any }) => React.createElement(React.Fragment, null, children),
  };
});

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrowserRouter } from 'react-router-dom';
import { DockNavigation } from './DockNavigation';

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
    expect(screen.getByLabelText(/my lease/i)).toBeInTheDocument();
  });

  it('has correct ARIA labels for accessibility', () => {
    renderDock();

    const items = [
      'Dashboard',
      'Maintenance',
      'Payments',
      'Messages',
      'My Lease',
      'Inspections',
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

