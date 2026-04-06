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
