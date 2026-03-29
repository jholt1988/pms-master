import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import MainDashboard from './MainDashboard';
import { AuthProvider } from './AuthContext';

// Mock child components
vi.mock('./components/ui/MaintenanceCard', () => ({
  MaintenanceCard: () => <div data-testid="maintenance-card">MaintenanceCard</div>,
}));

vi.mock('./components/ui/PaymentsCard', () => ({
  PaymentsCard: () => <div data-testid="payments-card">PaymentsCard</div>,
}));

vi.mock('./components/ui/RentEstimatorCard', () => ({
  RentEstimatorCard: () => <div data-testid="rent-estimator-card">RentEstimatorCard</div>,
}));

vi.mock('./components/ui/MessagingCard', () => ({
  MessagingCard: () => <div data-testid="messaging-card">MessagingCard</div>,
}));

vi.mock('./components/ui/RentalApplicationsCard', () => ({
  RentalApplicationsCard: () => <div data-testid="rental-applications-card">RentalApplicationsCard</div>,
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <AuthProvider>
        {component}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('MainDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders dashboard with correct layout structure', () => {
    renderWithProviders(<MainDashboard />);

    // Check for main heading
    expect(screen.getByText(/Dashboard/i)).toBeInTheDocument();
    expect(screen.getByText(/OVERVIEW/i)).toBeInTheDocument();

    // KPI ticker may render a skeleton when auth token/metrics are unavailable in tests.
    expect(screen.getByText(/Real-time portfolio telemetry/i)).toBeInTheDocument();
  });

  it('renders core Bento grid sections', () => {
    renderWithProviders(<MainDashboard />);

    expect(screen.getByText(/Critical Attention/i)).toBeInTheDocument();
    expect(screen.getByText(/Financial Flow/i)).toBeInTheDocument();
    expect(screen.getByText(/Market Intelligence/i)).toBeInTheDocument();
    expect(screen.getByText(/Leasing Pipeline/i)).toBeInTheDocument();
  });

  it('displays critical attention section with maintenance insights', () => {
    renderWithProviders(<MainDashboard />);

    expect(screen.getByText(/Critical Attention/i)).toBeInTheDocument();
    expect(screen.getByText(/Insights/i)).toBeInTheDocument();
  });

  it('displays financial flow section', () => {
    renderWithProviders(<MainDashboard />);

    expect(screen.getByText(/Financial Flow/i)).toBeInTheDocument();
    // Amount is dynamic; in tests it may show a placeholder when metrics are loading/unavailable.
    expect(screen.getByText(/TOTAL COLLECTED \(MTD\)/i)).toBeInTheDocument();
  });

  it('displays AI insights section', () => {
    renderWithProviders(<MainDashboard />);

    expect(screen.getByText(/Market Intelligence/i)).toBeInTheDocument();
  });

  it('displays leasing pipeline section', () => {
    renderWithProviders(<MainDashboard />);

    expect(screen.getByText(/Leasing Pipeline/i)).toBeInTheDocument();
    expect(screen.getByText(/Applications Pending Review/i)).toBeInTheDocument();
  });

  it('uses correct grid layout classes', () => {
    const { container } = renderWithProviders(<MainDashboard />);
    
    // Check for grid container
    const gridContainer = container.querySelector('.grid.grid-cols-1.md\\:grid-cols-12');
    expect(gridContainer).toBeInTheDocument();
  });
});

