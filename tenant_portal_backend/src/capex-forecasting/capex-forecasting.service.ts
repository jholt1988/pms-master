import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

interface ForecastFilters {
  propertyId?: string;
  year?: number;
  urgency?: string;
}

@Injectable()
export class CapexForecastingService {
  private readonly logger = new Logger(CapexForecastingService.name);

  private static readonly COMPONENT_LIFESPANS: Record<string, number> = {
    ROOF: 25,
    HVAC: 15,
    PLUMBING: 30,
    ELECTRICAL: 30,
    EXTERIOR: 20,
    APPLIANCES: 10,
    FLOORING: 15,
    WINDOWS: 25,
    PARKING_LOT: 20,
  };

  constructor(private readonly prisma: PrismaService) {}

  async createForecast(organizationId: string, data: any) {
    const property = await this.prisma.property.findFirst({
      where: { id: data.propertyId, organizationId },
    });
    if (!property) throw new NotFoundException('Property not found');

    return this.prisma.capExForecast.create({
      data: {
        propertyId: data.propertyId,
        organizationId,
        category: data.category,
        description: data.description,
        estimatedCostCents: data.estimatedCostCents,
        projectedYear: data.projectedYear,
        urgency: data.urgency || 'MEDIUM',
        confidenceScore: data.confidenceScore,
        aiRationale: data.aiRationale,
      },
    });
  }

  async listForecasts(organizationId: string, filters: ForecastFilters) {
    const where: any = { organizationId };
    if (filters.propertyId) where.propertyId = filters.propertyId;
    if (filters.year) where.projectedYear = filters.year;
    if (filters.urgency) where.urgency = filters.urgency;

    return this.prisma.capExForecast.findMany({
      where,
      include: { property: { select: { name: true, address: true } } },
      orderBy: [{ urgency: 'desc' }, { projectedYear: 'asc' }],
    });
  }

  async getForecast(organizationId: string, id: string) {
    const forecast = await this.prisma.capExForecast.findFirst({
      where: { id, organizationId },
      include: { property: { select: { name: true, address: true } } },
    });
    if (!forecast) throw new NotFoundException('Forecast not found');
    return forecast;
  }

  async approveForecast(
    organizationId: string,
    id: string,
    approvedBudget: number,
  ) {
    const forecast = await this.getForecast(organizationId, id);
    return this.prisma.capExForecast.update({
      where: { id: forecast.id },
      data: { status: 'APPROVED', approvedBudget },
    });
  }

  async completeForecast(
    organizationId: string,
    id: string,
    actualCostCents: number,
  ) {
    const forecast = await this.getForecast(organizationId, id);
    return this.prisma.capExForecast.update({
      where: { id: forecast.id },
      data: {
        status: 'COMPLETED',
        actualCostCents,
        completedAt: new Date(),
      },
    });
  }

  async aiGenerateForecasts(organizationId: string, propertyId: string) {
    const property = await this.prisma.property.findFirst({
      where: { id: propertyId, organizationId },
    });
    if (!property) throw new NotFoundException('Property not found');

    const currentYear = new Date().getFullYear();
    const propertyAge = property.yearBuilt
      ? currentYear - property.yearBuilt
      : 20; // default assumption

    const forecasts: any[] = [];

    for (const [category, lifespan] of Object.entries(
      CapexForecastingService.COMPONENT_LIFESPANS,
    )) {
      const remainingLife = Math.max(0, lifespan - propertyAge);
      const projectedYear = currentYear + remainingLife;

      // Skip items projected far into the future
      if (projectedYear > currentYear + 10) continue;

      const urgency = this.calculateUrgency(remainingLife);
      const costEstimate = this.estimateReplacementCost(category, property);
      const confidence = this.calculateConfidence(property, remainingLife);

      forecasts.push({
        propertyId,
        organizationId,
        category,
        description: `${category} replacement - ${remainingLife === 0 ? 'overdue' : `projected in ${remainingLife} years`}`,
        estimatedCostCents: costEstimate,
        projectedYear,
        urgency,
        confidenceScore: confidence,
        aiRationale: this.buildRationale(category, propertyAge, lifespan, remainingLife),
        status: 'PROJECTED',
      });
    }

    const created = await Promise.all(
      forecasts.map((f) => this.prisma.capExForecast.create({ data: f })),
    );

    this.logger.log(
      `Generated ${created.length} CapEx forecasts for property ${propertyId}`,
    );

    return { propertyId, generated: created.length, forecasts: created };
  }

  async getBudgetSummary(organizationId: string, year: number) {
    const forecasts = await this.prisma.capExForecast.findMany({
      where: { organizationId, projectedYear: year },
      include: { property: { select: { name: true } } },
    });

    const totalEstimated = forecasts.reduce(
      (sum, f) => sum + f.estimatedCostCents,
      0,
    );
    const totalApproved = forecasts
      .filter((f) => f.approvedBudget)
      .reduce((sum, f) => sum + (f.approvedBudget || 0), 0);
    const totalActual = forecasts
      .filter((f) => f.actualCostCents)
      .reduce((sum, f) => sum + (f.actualCostCents || 0), 0);

    const byCategory = forecasts.reduce(
      (acc, f) => {
        if (!acc[f.category]) acc[f.category] = { count: 0, totalCents: 0 };
        acc[f.category].count++;
        acc[f.category].totalCents += f.estimatedCostCents;
        return acc;
      },
      {} as Record<string, { count: number; totalCents: number }>,
    );

    const byUrgency = forecasts.reduce(
      (acc, f) => {
        acc[f.urgency] = (acc[f.urgency] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>,
    );

    return {
      year,
      totalForecasts: forecasts.length,
      totalEstimatedCents: totalEstimated,
      totalApprovedCents: totalApproved,
      totalActualCents: totalActual,
      varianceCents: totalApproved - totalActual,
      byCategory,
      byUrgency,
    };
  }

  private calculateUrgency(remainingLife: number): string {
    if (remainingLife <= 0) return 'CRITICAL';
    if (remainingLife <= 2) return 'HIGH';
    if (remainingLife <= 5) return 'MEDIUM';
    return 'LOW';
  }

  private estimateReplacementCost(category: string, _property: any): number {
    const baseCosts: Record<string, number> = {
      ROOF: 1500000,
      HVAC: 800000,
      PLUMBING: 500000,
      ELECTRICAL: 400000,
      EXTERIOR: 600000,
      APPLIANCES: 300000,
      FLOORING: 450000,
      WINDOWS: 700000,
      PARKING_LOT: 350000,
    };
    return baseCosts[category] || 500000;
  }

  private calculateConfidence(property: any, remainingLife: number): number {
    let confidence = 0.7;
    if (property.yearBuilt) confidence += 0.15;
    if (remainingLife <= 2) confidence += 0.1;
    return Math.min(1, confidence);
  }

  private buildRationale(
    category: string,
    propertyAge: number,
    lifespan: number,
    remainingLife: number,
  ): string {
    const parts = [
      `${category} typical lifespan: ${lifespan} years.`,
      `Property age: ${propertyAge} years.`,
      remainingLife <= 0
        ? 'Component is past expected lifespan - immediate attention recommended.'
        : `Estimated ${remainingLife} years remaining.`,
      'Cost estimate based on regional market data and component type.',
    ];
    return parts.join(' ');
  }
}
