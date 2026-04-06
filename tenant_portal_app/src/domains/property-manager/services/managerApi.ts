import { apiFetch } from '../../../services/apiClient';

export interface PortfolioHeatmapRow {
  propertyId: string;
  propertyName: string;
  totalUnits: number;
  occupiedUnits: number;
  occupancyRate: number;
  collectionRate: number;
  maintenanceHealth: number;
  compositeScore: number;
  tier: 'HEALTHY' | 'WATCH' | 'CRITICAL';
}

export interface OpexAnomaly {
  propertyId: string;
  propertyName: string;
  trailingMonthlyAvg: number;
  currentMonthTotal: number;
  deviationPercent: number;
  direction: 'ABOVE' | 'BELOW';
  severity: 'WARNING' | 'CRITICAL';
}

export interface ActionIntentItem {
  id: string;
  type: string;
  description: string;
  status: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  createdAt: string;
  raw?: Record<string, unknown>;
}

export interface SeasonalPricingMatrix {
  unitId: string;
  propertyId: string;
  unitName: string;
  baseRent: number;
  generatedAt: string;
  options: Array<{
    termMonths: number;
    targetStartMonth: number;
    targetStartMonthLabel: string;
    monthlyRent: number;
    seasonalAdjustmentPercent: number;
    recommended: boolean;
    reason: string;
  }>;
}

export const getPortfolioHeatmap = async (token: string) => {
  return apiFetch('/reporting/analytics/heatmap', { token }) as Promise<PortfolioHeatmapRow[]>;
};

export const getOpexAnomalies = async (token: string) => {
  return apiFetch('/reporting/analytics/opex-anomalies', { token }) as Promise<OpexAnomaly[]>;
};

export const getDashboardActionItems = async (token: string) => {
  const data = await apiFetch('/dashboard/action-intents', { token }) as { intents?: ActionIntentItem[] };
  return data.intents ?? [];
};

export const getSeasonalPricingMatrix = async (token: string, unitId: string, baseRent?: number) => {
  const suffix = baseRent ? `?baseRent=${encodeURIComponent(String(baseRent))}` : '';
  return apiFetch(`/rent-recommendations/seasonal-pricing/${unitId}${suffix}`, { token }) as Promise<SeasonalPricingMatrix>;
};
