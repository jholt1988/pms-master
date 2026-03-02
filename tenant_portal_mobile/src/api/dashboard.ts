import { apiService } from './client';

export interface TenantDashboardLease {
  id: string;
  rentAmount?: number;
  monthlyRent?: number;
  startDate: string;
  endDate: string;
  status?: string;
  unit?: {
    unitNumber?: string;
    property?: {
      name?: string;
      address?: string;
    };
  };
  payments?: Array<{
    id: string;
    amount?: number;
    paymentDate: string;
    status?: string;
  }>;
}

export interface TenantDashboardMaintenance {
  id: string;
  title: string;
  status: string;
  priority?: string;
  createdAt: string;
}

export interface TenantDashboardInspection {
  id: number;
  type: string;
  status: string;
  scheduledDate: string;
  notes?: string;
}

export interface TenantDashboardResponse {
  leases: TenantDashboardLease[];
  maintenanceRequests: TenantDashboardMaintenance[];
  recentInspections: TenantDashboardInspection[];
}

export const dashboardApi = {
  getTenantDashboard: async (): Promise<TenantDashboardResponse> => {
    return apiService.get<TenantDashboardResponse>('/dashboard/tenant');
  },
};
