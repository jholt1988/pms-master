import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CapexForecastingService } from '../capex-forecasting/capex-forecasting.service';

@Injectable()
export class OperatorCapexService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capexService: CapexForecastingService,
  ) {}

  /**
   * Workbench endpoint: returns forecasts with metrics, summary data,
   * and a property-level breakdown.
   */
  async getWorkbench(orgId: string) {
    const [forecasts, summary] = await Promise.all([
      this.capexService.listForecasts(orgId, {}),
      this.capexService.getBudgetSummary(orgId, new Date().getFullYear()),
    ]);

    const metrics = {
      pendingApproval: forecasts.filter((f) => f.status === 'PROJECTED').length,
      approved: forecasts.filter((f) => f.status === 'APPROVED').length,
      completed: forecasts.filter((f) => f.status === 'COMPLETED').length,
      totalValueCents: forecasts.reduce((sum, f) => sum + f.estimatedCostCents, 0),
    };

    // Property-level breakdown
    const byProperty = new Map<
      string,
      {
        propertyId: string;
        propertyName: string;
        propertyAddress: string | null;
        forecastCount: number;
        totalEstimatedCents: number;
        byStatus: Record<string, number>;
      }
    >();

    for (const f of forecasts) {
      const prop = (f as any).property;
      const key = f.propertyId;
      if (!byProperty.has(key)) {
        byProperty.set(key, {
          propertyId: f.propertyId,
          propertyName: prop?.name ?? 'Unknown',
          propertyAddress: prop?.address ?? null,
          forecastCount: 0,
          totalEstimatedCents: 0,
          byStatus: {},
        });
      }
      const entry = byProperty.get(key)!;
      entry.forecastCount++;
      entry.totalEstimatedCents += f.estimatedCostCents;
      entry.byStatus[f.status] = (entry.byStatus[f.status] || 0) + 1;
    }

    return {
      generatedAt: new Date().toISOString(),
      metrics,
      summary,
      forecasts,
      properties: Array.from(byProperty.values()),
    };
  }

  async createForecast(orgId: string, dto: any) {
    return this.capexService.createForecast(orgId, dto);
  }

  async approveForecast(orgId: string, id: string, approvedBudget: number) {
    return this.capexService.approveForecast(orgId, id, approvedBudget);
  }

  async completeForecast(orgId: string, id: string, actualCostCents: number) {
    return this.capexService.completeForecast(orgId, id, actualCostCents);
  }

  async generateForecasts(orgId: string, propertyId: string) {
    return this.capexService.aiGenerateForecasts(orgId, propertyId);
  }
}
