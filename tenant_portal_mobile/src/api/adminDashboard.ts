import { apiService } from './client';

export type AdminRecentActivity = {
  id: string | number;
  type: 'maintenance' | 'application' | 'payment' | 'lease' | string;
  title: string;
  date: string;
  priority?: 'low' | 'medium' | 'high' | string;
};

export type AdminDashboardMetrics = {
  occupancy: {
    total: number;
    occupied: number;
    vacant: number;
    percentage: number;
  };
  financials: {
    monthlyRevenue: number;
    collectedThisMonth: number;
    outstanding: number;
  };
  maintenance: {
    total: number;
    pending: number;
    inProgress: number;
    overdue: number;
  };
  applications: {
    total: number;
    pending: number;
    approved: number;
    rejected: number;
    legalAccepted?: number;
    legalMissing?: number;
  };
  recentActivity: AdminRecentActivity[];
};

export const adminDashboardApi = {
  getMetrics: async (): Promise<AdminDashboardMetrics> => {
    return apiService.get<AdminDashboardMetrics>('/dashboard/metrics');
  },
};
