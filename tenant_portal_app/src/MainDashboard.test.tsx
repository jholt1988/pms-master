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

    // Check for KPI ticker
    expect(screen.getByText(/Portfolio Occ/i)).toBeInTheDocument();
    expect(screen.getByText(/MoM Revenue/i)).toBeInTheDocument();
  });

  it('renders all card components in Bento grid', () => {
    renderWithProviders(<MainDashboard />);

    // Check that all card components are rendered
    expect(screen.getByTestId('maintenance-card')).toBeInTheDocument();
    expect(screen.getByTestId('payments-card')).toBeInTheDocument();
    expect(screen.getByTestId('rent-estimator-card')).toBeInTheDocument();
    expect(screen.getByTestId('messaging-card')).toBeInTheDocument();
    expect(screen.getByTestId('rental-applications-card')).toBeInTheDocument();
  });

  it('displays critical attention section with maintenance card', () => {
    renderWithProviders(<MainDashboard />);

    expect(screen.getByText(/Critical Attention/i)).toBeInTheDocument();
    expect(screen.getByText(/Urgent/i)).toBeInTheDocument();
  });

  it('displays financial flow section', () => {
    renderWithProviders(<MainDashboard />);

    expect(screen.getByText(/Financial Flow/i)).toBeInTheDocument();
    expect(screen.getByText(/\$124,500/i)).toBeInTheDocument();
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

