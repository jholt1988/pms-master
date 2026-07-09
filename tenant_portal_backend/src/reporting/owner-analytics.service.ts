import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AIProviderService } from '../ai-provider';
import { fromCents } from '../utils/money';

@Injectable()
export class OwnerAnalyticsService {
  private readonly logger = new Logger(OwnerAnalyticsService.name);
  private readonly aiEnabled: boolean;
  private readonly model: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    private readonly aiProvider: AIProviderService,
  ) {
    this.aiEnabled = this.aiProvider.isEnabled();
    this.model = this.aiProvider.getModel();
  }

  async getOwnerPortfolioAnalytics(orgId: string) {
    // 1. Load properties
    const properties = await this.prisma.property.findMany({
      where: { organizationId: orgId },
      include: {
        units: true,
      },
    });

    if (properties.length === 0) {
      return {
        propertiesCount: 0,
        capRate: 0,
        cashOnCash: 0,
        irr: 0,
        cashFlows: [],
        aiSummary: 'No properties found in this portfolio.',
      };
    }

    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    // Get current month stats
    const currentIncome = await this.prisma.payment.aggregate({
      where: {
        paymentDate: { gte: currentMonthStart },
        status: 'COMPLETED',
        lease: { unit: { property: { organizationId: orgId } } },
      },
      _sum: { amountCents: true },
    });

    const currentExpense = await this.prisma.expense.aggregate({
      where: {
        date: { gte: currentMonthStart },
        property: { organizationId: orgId },
      },
      _sum: { amountCents: true },
    });

    // Get last month stats
    const lastMonthIncome = await this.prisma.payment.aggregate({
      where: {
        paymentDate: { gte: lastMonthStart, lte: lastMonthEnd },
        status: 'COMPLETED',
        lease: { unit: { property: { organizationId: orgId } } },
      },
      _sum: { amountCents: true },
    });

    const lastMonthExpense = await this.prisma.expense.aggregate({
      where: {
        date: { gte: lastMonthStart, lte: lastMonthEnd },
        property: { organizationId: orgId },
      },
      _sum: { amountCents: true },
    });

    const currentIncomeCents = currentIncome._sum.amountCents ?? 0;
    const currentExpenseCents = currentExpense._sum.amountCents ?? 0;
    const currentNOICents = currentIncomeCents - currentExpenseCents;

    const lastMonthIncomeCents = lastMonthIncome._sum.amountCents ?? 0;
    const lastMonthExpenseCents = lastMonthExpense._sum.amountCents ?? 0;
    const lastMonthNOICents = lastMonthIncomeCents - lastMonthExpenseCents;

    // Financial Projections
    // Estimate baseline market valuation: $250k per unit
    const totalUnits = properties.reduce((sum, p) => sum + p.units.length, 0);
    const portfolioValuation = totalUnits > 0 ? totalUnits * 250000 : 300000;
    
    // Total cash invested estimate: $50k per unit
    const cashInvested = totalUnits > 0 ? totalUnits * 50000 : 60000;
    // Same figures in integer cents for unit-consistent ratio math.
    const portfolioValuationCents = portfolioValuation * 100;
    const cashInvestedCents = cashInvested * 100;

    // Annualized NOI based on current performance (integer cents)
    const annualizedNOICents = currentNOICents * 12;

    // Calculations (ratios are scale-invariant; computed in cents)
    const capRate = portfolioValuationCents > 0 ? (annualizedNOICents / portfolioValuationCents) * 100 : 0;
    const cashOnCash = cashInvestedCents > 0 ? (annualizedNOICents / cashInvestedCents) * 100 : 0;

    // Simulated 5-Year IRR
    // Cash outflows: -CashInvested at Year 0
    // Year 1 to 4: Annualized NOI (growing at 3% per year)
    // Year 5: Annualized NOI + Resale Value (deemed at 1.15x initial valuation)
    const irrVal = this.calculateSimulatedIRR(cashInvestedCents, annualizedNOICents, portfolioValuationCents);

    // AI Narrative Generation
    const aiSummary = await this.generateNarrative(
      fromCents(currentIncomeCents),
      fromCents(currentExpenseCents),
      fromCents(lastMonthIncomeCents),
      fromCents(lastMonthExpenseCents),
    );

    return {
      propertiesCount: properties.length,
      unitsCount: totalUnits,
      portfolioValuation,
      cashInvested,
      currentMonthNOI: fromCents(currentNOICents),
      currentMonthNOICents: currentNOICents,
      lastMonthNOI: fromCents(lastMonthNOICents),
      lastMonthNOICents,
      capRate: Number(capRate.toFixed(2)),
      cashOnCash: Number(cashOnCash.toFixed(2)),
      irr: Number(irrVal.toFixed(2)),
      cashFlows: [
        { month: 'Current Month', income: fromCents(currentIncomeCents), expenses: fromCents(currentExpenseCents), net: fromCents(currentNOICents), incomeCents: currentIncomeCents, expensesCents: currentExpenseCents, netCents: currentNOICents },
        { month: 'Last Month', income: fromCents(lastMonthIncomeCents), expenses: fromCents(lastMonthExpenseCents), net: fromCents(lastMonthNOICents), incomeCents: lastMonthIncomeCents, expensesCents: lastMonthExpenseCents, netCents: lastMonthNOICents },
      ],
      aiSummary,
    };
  }

  private calculateSimulatedIRR(cashInvested: number, initialNOI: number, valuation: number): number {
    const cashFlows = [
      -cashInvested,
      initialNOI,
      initialNOI * 1.03,
      initialNOI * 1.06,
      initialNOI * 1.09,
      (initialNOI * 1.12) + (valuation * 1.15),
    ];

    // standard IRR solver (Newton-Raphson approximation)
    let rate = 0.1; // initial guess: 10%
    const maxIterations = 50;
    const tolerance = 0.0001;

    for (let i = 0; i < maxIterations; i++) {
      let npv = 0;
      let derivative = 0;

      for (let t = 0; t < cashFlows.length; t++) {
        const factor = Math.pow(1 + rate, t);
        npv += cashFlows[t] / factor;
        if (t > 0) {
          derivative -= (t * cashFlows[t]) / Math.pow(1 + rate, t + 1);
        }
      }

      if (Math.abs(npv) < tolerance) {
        return rate * 100;
      }

      if (derivative === 0) break;
      rate = rate - npv / derivative;
    }

    return rate * 100;
  }

  private async generateNarrative(
    currIncome: number,
    currExpense: number,
    prevIncome: number,
    prevExpense: number,
  ): Promise<string> {
    const currNOI = currIncome - currExpense;
    const prevNOI = prevIncome - prevExpense;
    const noiChangePercent = prevNOI !== 0 ? ((currNOI - prevNOI) / Math.abs(prevNOI)) * 100 : 0;

    const baseStatsText = `Current Month Income: $${currIncome}, Expenses: $${currExpense}, NOI: $${currNOI}. Previous Month Income: $${prevIncome}, Expenses: $${prevExpense}, NOI: $${prevNOI}. NOI changed by ${noiChangePercent.toFixed(1)}%.`;

    if (!this.aiEnabled) {
      // Rule-based fallback summary
      const direction = noiChangePercent >= 0 ? 'increased' : 'decreased';
      const changeAbs = Math.abs(noiChangePercent).toFixed(1);
      return `Portfolio performance analysis (Mock AI): Net Operating Income ${direction} by ${changeAbs}% compared to the previous month. This variance is driven by monthly tenant ledger collections and maintenance dispatches. Ensure all expense classifications are reviewed before close.`;
    }

    try {
      const response = await this.aiProvider.complete({
        systemPrompt: 'You are a professional real estate asset manager. Analyze monthly portfolio performance metrics and write a concise, one-paragraph overview explaining financial changes and what they mean to the owner.',
        messages: [{ role: 'user' as const, content: `Write a narrative explanation for these stats: ${baseStatsText}` }],
        temperature: 0.5,
        maxTokens: 150,
      });

      return response.content.trim() || 'No description generated.';
    } catch (error) {
      this.logger.error(`Error generating narrative from OpenAI: ${error}`);
      return `Portfolio Net Operating Income shifted by ${noiChangePercent.toFixed(1)}%. Check expense bills and tenant receipt ledger for specific invoice allocations.`;
    }
  }
}
