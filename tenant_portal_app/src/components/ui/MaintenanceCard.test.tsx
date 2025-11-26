import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { MaintenanceCard } from './MaintenanceCard';
import { AuthProvider } from '../../AuthContext';
import * as apiFixtures from '../../mocks/apiFixtures';

// Mock the API fixtures
vi.mock('../../mocks/apiFixtures', () => ({
  shouldUseMockData: vi.fn(() => true),
  getMockMaintenanceRequests: vi.fn(),
}));

// Mock the API client
vi.mock('../../services/apiClient', () => ({
  apiFetch: vi.fn(),
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

describe('MaintenanceCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(apiFixtures.getMockMaintenanceRequests).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    renderWithProviders(<MaintenanceCard />);
    expect(screen.getByText(/LOADING/i)).toBeInTheDocument();
  });

  it('renders maintenance requests from mock data', async () => {
    const mockRequests = [
      {
        id: 1024,
        title: 'Gas Leak Detected',
        description: 'Test description',
        unit: 'Unit 2B',
        priority: 'HIGH' as const,
        status: 'PENDING' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    vi.mocked(apiFixtures.getMockMaintenanceRequests).mockResolvedValue(mockRequests);

    renderWithProviders(<MaintenanceCard />);

    await waitFor(() => {
      expect(screen.getByText('Gas Leak Detected')).toBeInTheDocument();
      expect(screen.getByText('Unit 2B')).toBeInTheDocument();
    });
  });

  it('renders empty state when no requests', async () => {
    vi.mocked(apiFixtures.getMockMaintenanceRequests).mockResolvedValue([]);

    renderWithProviders(<MaintenanceCard />);

    await waitFor(() => {
      expect(screen.getByText(/NO ACTIVE REQUESTS/i)).toBeInTheDocument();
    });
  });

  it('displays priority indicators correctly', async () => {
    const mockRequests = [
      {
        id: 1024,
        title: 'High Priority Issue',
        description: 'Test',
        unit: 'Unit 1',
        priority: 'HIGH' as const,
        status: 'PENDING' as const,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    vi.mocked(apiFixtures.getMockMaintenanceRequests).mockResolvedValue(mockRequests);

    renderWithProviders(<MaintenanceCard />);

    await waitFor(() => {
      expect(screen.getByText('High Priority Issue')).toBeInTheDocument();
    });
  });
});

