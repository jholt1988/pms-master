import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RentalApplicationAiService {
  private readonly logger = new Logger(RentalApplicationAiService.name);
  private readonly aiServiceUrl = process.env.AI_PRESCREENING_SERVICE_URL || 'http://ml-service:8000';
  private readonly protectedClassPatterns: Array<{ field: string; pattern: RegExp }> = [
    { field: 'race', pattern: /\b(asian|black|white|latino|latina|hispanic|indigenous)\b/i },
    { field: 'religion', pattern: /\b(christian|muslim|jewish|hindu|buddhist|atheist)\b/i },
    { field: 'sex', pattern: /\b(male|female|pregnant|gender)\b/i },
    { field: 'familialStatus', pattern: /\b(children|pregnant|single mother|single father|family size)\b/i },
    { field: 'disability', pattern: /\b(disability|disabled|wheelchair|service animal|medical condition)\b/i },
    { field: 'nationalOrigin', pattern: /\b(immigrant|citizenship|visa|nationality|accent)\b/i },
  ];

  constructor(
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  async getAiReview(applicationId: string): Promise<any> {
    try {
      // Attempt to call external AI service
      const response = await firstValueFrom(
        this.httpService.post(`${this.aiServiceUrl}/review`, {
          application_id: applicationId,
        }),
      );
      return response.data;
    } catch (error) {
      this.logger.warn(`External AI service unavailable (${error.message}). Falling back to internal logic.`);
      
      // Fallback: Internal simple rule-based review
      return this.runInternalReview(applicationId);
    }
  }

  sanitizeForFairHousing(application: Record<string, any>) {
    const clone = JSON.parse(JSON.stringify(application ?? {}));
    const redactionLog: Array<{ field: string; reason: string }> = [];
    const sensitiveFields = [
      'race',
      'religion',
      'sex',
      'gender',
      'familialStatus',
      'disability',
      'nationalOrigin',
      'maritalStatus',
      'age',
    ];

    for (const field of sensitiveFields) {
      if (field in clone && clone[field] != null) {
        delete clone[field];
        redactionLog.push({ field, reason: 'Protected class or direct proxy removed before scoring.' });
      }
    }

    for (const [field, value] of Object.entries(clone)) {
      if (typeof value !== 'string') continue;
      const matched = this.protectedClassPatterns.find(({ pattern }) => pattern.test(value));
      if (matched) {
        clone[field] = '[REDACTED_FOR_FAIR_HOUSING]';
        redactionLog.push({ field, reason: `Removed free-text proxy related to ${matched.field}.` });
      }
    }

    return {
      sanitizedInput: clone,
      redactionLog,
    };
  }

  computeTenancySuccessScore(input: Record<string, any>) {
    const traceabilityLog: string[] = [];
    let score = 50;

    const monthlyIncome = Number(input.income ?? 0);
    const monthlyDebt = Number(input.monthlyDebt ?? 0);
    const targetRent = Number(input.targetRent ?? input.rentAmount ?? 0);
    const creditScore = Number(input.creditScore ?? 0);
    const bankruptcyFiledYear = Number(input.bankruptcyFiledYear ?? 0);
    const rentToIncomeRatio = monthlyIncome > 0 && targetRent > 0 ? targetRent / monthlyIncome : 1;
    const debtToIncomeRatio = monthlyIncome > 0 && monthlyDebt > 0 ? monthlyDebt / monthlyIncome : 0;

    if (monthlyIncome > 0 && targetRent > 0) {
      if (rentToIncomeRatio <= 0.3) {
        score += 20;
        traceabilityLog.push('Income comfortably covers projected rent.');
      } else if (rentToIncomeRatio <= 0.4) {
        score += 8;
        traceabilityLog.push('Income covers rent, but with limited margin.');
      } else {
        score -= 18;
        traceabilityLog.push('Projected rent consumes too much of monthly income.');
      }
    } else {
      score -= 15;
      traceabilityLog.push('Income or target rent data is incomplete.');
    }

    if (creditScore >= 700) {
      score += 15;
      traceabilityLog.push(`Credit score ${creditScore} indicates strong repayment history.`);
    } else if (creditScore >= 620) {
      score += 5;
      traceabilityLog.push(`Credit score ${creditScore} is acceptable.`);
    } else if (creditScore > 0) {
      score -= 12;
      traceabilityLog.push(`Credit score ${creditScore} indicates elevated payment risk.`);
    } else {
      traceabilityLog.push('No credit score provided; score held near neutral.');
    }

    if (debtToIncomeRatio > 0.45) {
      score -= 10;
      traceabilityLog.push('Debt obligations are high relative to income.');
    } else if (debtToIncomeRatio > 0.3) {
      score -= 4;
      traceabilityLog.push('Debt obligations are moderate relative to income.');
    } else if (monthlyDebt > 0) {
      score += 4;
      traceabilityLog.push('Debt obligations are within a manageable range.');
    }

    if (bankruptcyFiledYear) {
      const yearsAgo = new Date().getFullYear() - bankruptcyFiledYear;
      if (yearsAgo <= 7) {
        score -= 10;
        traceabilityLog.push(`Recent bankruptcy history from ${bankruptcyFiledYear} increases risk.`);
      }
    }

    score = Math.max(0, Math.min(100, Math.round(score)));
    const decisionBand = score >= 75 ? 'AUTO_APPROVE' : score >= 60 ? 'REVIEW' : 'HIGH_RISK';
    const decisionExplanation = decisionBand === 'AUTO_APPROVE'
      ? 'Application shows strong financial capacity with no major risk signals in the sanitized data.'
      : decisionBand === 'REVIEW'
        ? 'Application is viable but includes enough financial uncertainty to require manual review.'
        : 'Application presents multiple financial risk indicators and should not be auto-approved.';

    return {
      score,
      decisionBand,
      decisionExplanation,
      traceabilityLog,
    };
  }

  async runInternalReview(applicationId: string) {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id: Number(applicationId) },
      include: {
        unit: {
          include: {
            lease: true,
          }
        },
        property: {
          include: {
            marketingProfile: true
          }
        }
      }
    });

    if (!application) {
      throw new Error('Application not found for internal review');
    }

    // Determine rent amount (active lease or market rent)
    let rentAmount = 0;
    if ((application.unit?.lease as any)?.[0]?.rentAmountCents) {
      rentAmount = (application.unit.lease as any)[0].rentAmountCents;
    } else if (application.property?.marketingProfile?.minRent) {
      rentAmount = application.property.marketingProfile.minRent;
    } else {
      rentAmount = 1000; // Default fallback if no rent data found
    }

    const checks = [];
    const monthlyIncome = application.income || 0;
    
    // 1. Income to Rent Ratio (>= 3x)
    if (rentAmount > 0 && monthlyIncome >= (rentAmount * 3)) {
      checks.push("Income is sufficient (>= 3x rent).");
    } else {
      checks.push(`FAIL: Income is less than 3x rent (Income: $${monthlyIncome}, Rent: $${rentAmount}).`);
    }

    // 2. Credit Score check (if available)
    if (application.creditScore) {
      if (application.creditScore >= 650) {
        checks.push("Credit score is good (>= 650).");
      } else if (application.creditScore >= 600) {
        checks.push("Credit score is acceptable (600-649).");
      } else {
        checks.push("FAIL: Credit score is low (< 600).");
      }
    } else {
      checks.push("FAIL: No credit score provided.");
    }

    const passedCount = checks.filter(c => !c.startsWith('FAIL')).length;
    const totalCount = checks.length;
    const summary = checks.map(c => `- ${c}`).join('\n');
    
    let recommendation = "needs_review";
    if (passedCount === totalCount && totalCount > 0) {
      recommendation = "approve";
    } else if (summary.includes("FAIL")) {
      recommendation = "deny";
    }

    return {
      recommendation,
      summary,
      checks_passed: passedCount,
      checks_total: totalCount
    };
  }
}
