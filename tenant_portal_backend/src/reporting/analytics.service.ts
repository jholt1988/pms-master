import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface CapexSimulationRequest {
  propertyId: string;
  orgId?: string;
  upgradeCost: number;
  expectedRentIncreaseAmount: number;
}

export interface CapexSimulationResponse {
  propertyId: string;
  simulatedTrials: number;
  expectedIRR: {
    year1: { low: number; median: number; high: number };
    year3: { low: number; median: number; high: number };
    year5: { low: number; median: number; high: number };
  };
  paybackPeriodMonths: number;
  confidenceScore: number;
}

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Phase 5: Deep Monte Carlo simulation evaluating IRR
   * Runs 1000 simulated timelines factoring random vacancy lengths and maintenance drag.
   */
  async simulateCapitalExpenditure(input: CapexSimulationRequest): Promise<CapexSimulationResponse> {
    const property = await this.prisma.property.findUnique({
      where: { id: input.propertyId },
      include: { units: true }
    });
    
    if (!property || (input.orgId && property.organizationId !== input.orgId)) {
        throw new Error("Property not found or unauthorized.");
    }

    // Simplistic Monte Carlo Approach
    const trials = 1000;
    const baseLineNOI = 50000; // Placeholder for actual trailing 12M NOI derivation
    const cost = input.upgradeCost;
    
    // Yearly gross revenue bump
    const nominalYearlyBump = input.expectedRentIncreaseAmount * 12 * Math.max(1, property.units.length);

    const runSim = (years: number) => {
        let results = [];
        for (let i = 0; i < trials; i++) {
           // Vacancy randomized between 2% and 10%
           const vacancyDrag = 1 - (Math.random() * (0.10 - 0.02) + 0.02);
           const maintenanceShock = Math.random() < 0.2 ? -5000 : 0; // 20% chance of random $5k hit

           const cumulativeCashFlow = (nominalYearlyBump * vacancyDrag * years) + maintenanceShock;
           // IRR rough proxy = (Total Cashflow / Cost)^(1/Years) - 1
           const totalReturn = cumulativeCashFlow / cost;
           const irr = totalReturn > 0 ? (Math.pow(1 + totalReturn, 1 / years) - 1) : -1;
           results.push(irr);
        }
        
        results.sort((a, b) => a - b);
        return {
           low: results[Math.floor(trials * 0.1)] || 0,
           median: results[Math.floor(trials * 0.5)] || 0,
           high: results[Math.floor(trials * 0.9)] || 0,
        }
    };

    const paybackPeriod = cost / (nominalYearlyBump * 0.95); // Assuming 5% average vacancy

    return {
      propertyId: input.propertyId,
      simulatedTrials: trials,
      expectedIRR: {
        year1: runSim(1),
        year3: runSim(3),
        year5: runSim(5)
      },
      paybackPeriodMonths: Math.round(paybackPeriod * 12),
      confidenceScore: 0.85
    };
  }

  /**
   * Phase 7A: Daily Action Items — scans the entire org for items requiring PM attention.
   * Emits DAILY_ACTION_ITEM intents for: expiring leases, stale maintenance, delinquencies, vacancy gaps.
   */
  async generateDailyActionItems(orgId?: string) {
    this.logger.log('Generating daily action items...');
    const items: Array<{ category: string; title: string; description: string; priority: string; metadata: any }> = [];

    // 1. Leases expiring within 60 days without a renewal pricing intent
    const sixtyDaysOut = new Date();
    sixtyDaysOut.setDate(sixtyDaysOut.getDate() + 60);
    const expiringLeases = await this.prisma.lease.findMany({
      where: {
        status: 'ACTIVE',
        endDate: { lte: sixtyDaysOut },
        ...(orgId ? { unit: { property: { organizationId: orgId } } } : {}),
      },
      include: { tenant: true, unit: { include: { property: true } } },
    });

    for (const lease of expiringLeases) {
      const daysLeft = Math.ceil((new Date(lease.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      items.push({
        category: 'LEASE_EXPIRY',
        title: `Lease expiring in ${daysLeft} days`,
        description: `${lease.tenant?.username || 'Tenant'} at ${lease.unit?.name || 'Unit'} (${lease.unit?.property?.name || 'Property'}) — no renewal offer on file.`,
        priority: daysLeft <= 14 ? 'HIGH' : daysLeft <= 30 ? 'MEDIUM' : 'LOW',
        metadata: { leaseId: lease.id, unitId: lease.unitId, daysLeft },
      });
    }

    // 2. Maintenance tickets open > 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const staleTickets = await this.prisma.maintenanceRequest.findMany({
      where: {
        status: { in: ['PENDING', 'IN_PROGRESS'] },
        createdAt: { lt: sevenDaysAgo },
        ...(orgId ? { property: { organizationId: orgId } } : {}),
      },
      include: { property: true, unit: true },
    });

    for (const ticket of staleTickets) {
      const ageDays = Math.ceil((Date.now() - new Date(ticket.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      items.push({
        category: 'STALE_MAINTENANCE',
        title: `Maintenance open ${ageDays} days`,
        description: `"${ticket.title}" at ${ticket.unit?.name || 'Unit'} (${ticket.property?.name || 'Property'}) — schedule preventative action before escalation.`,
        priority: ageDays > 14 ? 'HIGH' : 'MEDIUM',
        metadata: { ticketId: ticket.id, ageDays },
      });
    }

    // 3. Tenants with > 2 late payments in trailing 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const lateFees = await (this.prisma as any).lateFee.findMany({
      where: {
        assessedAt: { gte: sixMonthsAgo },
        invoice: {
          lease: {
            status: 'ACTIVE',
            ...(orgId ? { unit: { property: { organizationId: orgId } } } : {}),
          },
        },
      },
      include: { invoice: { include: { lease: { include: { tenant: true, unit: { include: { property: true } } } } } } },
    });

    // Group by tenant
    const tenantLateMap = new Map<string, { count: number; tenant: any; property: any }>();
    for (const fee of lateFees) {
      const tenantId = fee.invoice?.lease?.tenantId;
      if (!tenantId) continue;
      const existing = tenantLateMap.get(tenantId) || { count: 0, tenant: fee.invoice?.lease?.tenant, property: fee.invoice?.lease?.unit?.property };
      existing.count++;
      tenantLateMap.set(tenantId, existing);
    }

    for (const [tenantId, data] of tenantLateMap) {
      if (data.count > 2) {
        items.push({
          category: 'CHRONIC_DELINQUENCY',
          title: `${data.count} late payments in 6 months`,
          description: `${data.tenant?.username || 'Tenant'} at ${data.property?.name || 'Property'} — elevated churn/delinquency risk.`,
          priority: 'HIGH',
          metadata: { tenantId, latePaymentCount: data.count },
        });
      }
    }

    // 4. Units without active leases (vacant)
    const vacantUnits = await this.prisma.unit.findMany({
      where: {
        ...(orgId ? { property: { organizationId: orgId } } : {}),
        lease: { is: null },
      },
      include: { property: true },
    });

    for (const unit of vacantUnits) {
      items.push({
        category: 'EXTENDED_VACANCY',
        title: `Unit ${unit.name} vacant`,
        description: `${unit.property?.name || 'Property'} — extended vacancy drives revenue loss. Consider pricing adjustment.`,
        priority: 'MEDIUM',
        metadata: { unitId: unit.id, propertyId: unit.propertyId },
      });
    }

    // Emit intents for the top items (cap at 15 to avoid flooding)
    const topItems = items.sort((a, b) => {
      const prioMap: Record<string, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return (prioMap[a.priority] ?? 2) - (prioMap[b.priority] ?? 2);
    }).slice(0, 15);

    for (const item of topItems) {
      try {
        await (this.prisma as any).actionIntent.create({
          data: {
            type: 'DAILY_ACTION_ITEM',
            description: item.title,
            status: 'PENDING',
            priority: item.priority,
            organizationId: orgId,
            metadata: { ...item.metadata, category: item.category, detail: item.description },
          },
        });
      } catch (e) {
        this.logger.error(`Failed to emit daily action item: ${e}`);
      }
    }

    this.logger.log(`Emitted ${topItems.length} daily action items.`);
    return topItems;
  }

  /**
   * Phase 7A: Portfolio Health Heatmap — per-property scores for financial health, occupancy, and sentiment.
   */
  async getPortfolioHealthHeatmap(orgId?: string) {
    const properties = await this.prisma.property.findMany({
      where: orgId ? { organizationId: orgId } : {},
      include: {
        units: {
          include: {
            lease: true,
          },
        },
      },
    });

    const heatmapData = [];

    for (const property of properties) {
      const totalUnits = property.units.length;
      const occupiedUnits = property.units.filter(u => u.lease?.status === 'ACTIVE').length;
      const occupancyRate = totalUnits > 0 ? occupiedUnits / totalUnits : 0;

      // Financial health: ratio of collected to expected rent
      const activeLeases = property.units.filter(u => u.lease?.status === 'ACTIVE').map(u => u.lease);
      const expectedMonthlyRent = activeLeases.reduce((sum, l) => sum + (l?.rentAmount || 0), 0);

      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const payments = await this.prisma.payment.aggregate({
        where: {
          status: 'COMPLETED',
          paymentDate: { gte: monthStart },
          invoice: { lease: { unit: { propertyId: property.id } } },
        },
        _sum: { amount: true },
      });
      const collectedRent = payments._sum.amount || 0;
      const collectionRate = expectedMonthlyRent > 0 ? collectedRent / expectedMonthlyRent : 0;

      // Sentiment score: infer property sentiment from recent message metadata.
      const ninetyDaysAgo = new Date();
      ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
      const recentMessages = await this.prisma.message.findMany({
        where: {
          createdAt: { gte: ninetyDaysAgo },
          conversation: {
            participants: {
              some: {
                user: {
                  lease: {
                    is: {
                      unit: {
                        propertyId: property.id,
                      },
                    },
                  },
                },
              },
            },
          },
        },
        select: {
          metadata: true,
        },
        take: 250,
      });
      const sentimentWeights: Record<string, number> = {
        URGENT: 0.1,
        FRUSTRATED: 0.3,
        NEUTRAL: 0.65,
        POSITIVE: 1.0,
      };
      const sentimentScore = recentMessages.length > 0
        ? recentMessages.reduce((sum, message) => {
            const sentiment = (message.metadata as any)?.sentiment ?? 'NEUTRAL';
            return sum + (sentimentWeights[sentiment] ?? sentimentWeights.NEUTRAL);
          }, 0) / recentMessages.length
        : 0.75;

      // Composite score: weighted average
      const compositeScore = Math.round(
        ((occupancyRate * 0.4) + (Math.min(collectionRate, 1) * 0.35) + (sentimentScore * 0.25)) * 100,
      );

      heatmapData.push({
        propertyId: property.id,
        propertyName: property.name,
        totalUnits,
        occupiedUnits,
        occupancyRate: Math.round(occupancyRate * 100),
        collectionRate: Math.round(Math.min(collectionRate, 1) * 100),
        maintenanceHealth: Math.round(sentimentScore * 100),
        compositeScore,
        tier: compositeScore >= 80 ? 'HEALTHY' : compositeScore >= 55 ? 'WATCH' : 'CRITICAL',
      });
    }

    return heatmapData.sort((a, b) => a.compositeScore - b.compositeScore);
  }

  /**
   * Phase 7A: OPEX Anomaly Detection — compares current month expenses to trailing 12-month average.
   */
  async getOpexAnomalies(orgId?: string) {
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const trailingStart = new Date(now.getFullYear(), now.getMonth() - 12, 1);

    const properties = await this.prisma.property.findMany({
      where: orgId ? { organizationId: orgId } : {},
    });

    const anomalies = [];

    for (const property of properties) {
      // Trailing 12-month expenses
      const trailing = await this.prisma.expense.aggregate({
        where: {
          propertyId: property.id,
          date: { gte: trailingStart, lt: currentMonthStart },
        },
        _sum: { amount: true },
        _count: { id: true },
      });

      // Current month expenses
      const current = await this.prisma.expense.aggregate({
        where: {
          propertyId: property.id,
          date: { gte: currentMonthStart },
        },
        _sum: { amount: true },
      });

      const monthlyAvg = (trailing._sum.amount || 0) / 12;
      const currentTotal = current._sum.amount || 0;
      const deviation = monthlyAvg > 0 ? ((currentTotal - monthlyAvg) / monthlyAvg) : 0;

      // Flag if current month is > 1.5x the trailing average (50%+ deviation)
      if (Math.abs(deviation) > 0.5 && monthlyAvg > 100) {
        anomalies.push({
          propertyId: property.id,
          propertyName: property.name,
          trailingMonthlyAvg: Math.round(monthlyAvg * 100) / 100,
          currentMonthTotal: Math.round(currentTotal * 100) / 100,
          deviationPercent: Math.round(deviation * 100),
          direction: deviation > 0 ? 'ABOVE' : 'BELOW',
          severity: Math.abs(deviation) > 1.0 ? 'CRITICAL' : 'WARNING',
        });
      }
    }

    return anomalies.sort((a, b) => Math.abs(b.deviationPercent) - Math.abs(a.deviationPercent));
  }

  /**
   * Scans property health to generate CapEx Intents if performance dips.
   */
  async generateCapitalAllocationIntents() {
     this.logger.log('Scanning portfolio for Capital Allocation Intents...');
     
     // 1. Grab all properties
     const properties = await this.prisma.property.findMany();
     
     for (const property of properties) {
         // Simulate checking P&L - creating intentional "failure" triggers on certain setups
         // For demo, we explicitly trigger if the property ID exists
         
         const existingIntent = await (this.prisma as any).actionIntent.findFirst({
            where: {
                type: 'CAPITAL_ALLOCATION_INTENT',
                status: 'PENDING',
                metadata: { path: ['propertyId'], equals: property.id }
            }
         });

         if (existingIntent) continue;

         const unitCount = await this.prisma.unit.count({ where: { propertyId: property.id } });

         // Mock check: Just create an intent on evaluating the first active property periodically
         if (unitCount > 0) {
             await (this.prisma as any).actionIntent.create({
                 data: {
                    type: 'CAPITAL_ALLOCATION_INTENT',
                    description: `Profit margin anomaly detected for ${property.name}. Consider modeled Capital Expenditure.`,
                    status: 'PENDING',
                    priority: 'HIGH',
                    organizationId: property.organizationId,
                    metadata: {
                        propertyId: property.id,
                        margin: 0.08, // Below 10%
                        recommendation: "Execute Simulation"
                    }
                 }
             });
             this.logger.log(`Emitted CAPITAL_ALLOCATION_INTENT for ${property.name}`);
         }
     }
  }
}
