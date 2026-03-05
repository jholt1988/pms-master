import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RentalApplicationAiService {
  private readonly logger = new Logger(RentalApplicationAiService.name);
  private readonly aiServiceUrl = process.env.AI_PRESCREENING_SERVICE_URL || 'http://localhost:8001';

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

  private async runInternalReview(applicationId: string) {
    const application = await this.prisma.rentalApplication.findUnique({
      where: { id: Number(applicationId) },
      include: {
        unit: {
          include: {
            lease: {
              where: { status: 'ACTIVE' },
              take: 1
            }
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
    if (application.unit?.lease?.[0]?.rentAmount) {
      rentAmount = application.unit.lease[0].rentAmount;
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
