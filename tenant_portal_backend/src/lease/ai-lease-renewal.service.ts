import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AILeaseRenewalMetricsService } from './ai-lease-renewal-metrics.service';
import OpenAI from 'openai';
import { Lease, LeaseRenewalOffer } from '@prisma/client';

interface RenewalPrediction {
  renewalProbability: number; // 0-1
  confidence: 'LOW' | 'MEDIUM' | 'HIGH';
  factors: string[];
  recommendedActions: string[];
}

interface RentAdjustmentRecommendation {
  currentRent: number;
  recommendedRent: number;
  adjustmentPercentage: number;
  reasoning: string;
  factors: Array<{
    name: string;
    impact: number;
    description: string;
  }>;
}

interface PersonalizedRenewalOffer {
  baseRent: number;
  incentives: Array<{
    type: 'RENT_DISCOUNT' | 'FREE_MONTH' | 'UPGRADE' | 'CASH_BACK';
    description: string;
    value: number;
  }>;
  totalValue: number;
  message: string;
  expirationDate: Date;
}

@Injectable()
export class AILeaseRenewalService {
  private readonly logger = new Logger(AILeaseRenewalService.name);
  private openai: OpenAI | null = null;
  private readonly aiEnabled: boolean;
  private readonly mlServiceUrl: string;
  private readonly mlServiceTimeout: number;
  private readonly mlServiceMaxRetries: number;
  private readonly mlServiceRetryDelay: number;
  // Cache for rent recommendations (key: leaseId, value: { recommendation, timestamp })
  private rentRecommendationCache: Map<number, { recommendation: RentAdjustmentRecommendation; timestamp: number }> = new Map();
  private readonly cacheTTL: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Optional() private readonly aiMetrics?: AILeaseRenewalMetricsService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const aiEnabled = this.configService.get<string>('AI_ENABLED', 'false') === 'true';
    this.mlServiceUrl = this.configService.get<string>('ML_SERVICE_URL', 'http://localhost:8000');
    this.mlServiceTimeout = parseInt(this.configService.get<string>('ML_SERVICE_TIMEOUT', '5000'), 10);
    this.mlServiceMaxRetries = parseInt(this.configService.get<string>('ML_SERVICE_MAX_RETRIES', '3'), 10);
    this.mlServiceRetryDelay = parseInt(this.configService.get<string>('ML_SERVICE_RETRY_DELAY', '1000'), 10);

    this.aiEnabled = aiEnabled;

    if (this.aiEnabled && apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('AI Lease Renewal Service initialized with OpenAI');
    } else {
      this.logger.warn(
        'AI Lease Renewal Service initialized in mock mode (no OpenAI API key or AI disabled)',
      );
    }
  }

  /**
   * Predict likelihood of tenant renewal
   */
  async predictRenewalLikelihood(leaseId: number): Promise<RenewalPrediction> {
    const startTime = Date.now();
    let success = false;
    let renewalProbability = 0;
    let error: string | undefined;

    try {
      const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: {
          include: {
            payments: {
              orderBy: { paymentDate: 'desc' },
              take: 12,
            },
            requests: {
              orderBy: { createdAt: 'desc' },
              take: 10,
            },
          },
        },
        unit: {
          include: {
            property: true,
          },
        },
        invoices: {
          orderBy: { dueDate: 'desc' },
          take: 12,
        },
      },
    });

    if (!lease) {
      throw new Error(`Lease ${leaseId} not found`);
    }

    const factors: string[] = [];
    let renewalScore = 50; // Start at 50% (neutral)

    // Factor 1: Payment history
    const totalPayments = lease.tenant.payments.length;
    const onTimePayments = lease.tenant.payments.filter((p) => {
      const invoice = lease.invoices.find((inv) => inv.id === p.invoiceId);
      if (!invoice) return false;
      return p.paymentDate <= invoice.dueDate;
    }).length;

    const onTimeRate = totalPayments > 0 ? onTimePayments / totalPayments : 1;
    if (onTimeRate > 0.9) {
      renewalScore += 20;
      factors.push(`Excellent payment history: ${(onTimeRate * 100).toFixed(0)}% on-time`);
    } else if (onTimeRate > 0.7) {
      renewalScore += 10;
      factors.push(`Good payment history: ${(onTimeRate * 100).toFixed(0)}% on-time`);
    } else if (onTimeRate < 0.5) {
      renewalScore -= 20;
      factors.push(`Poor payment history: ${(onTimeRate * 100).toFixed(0)}% on-time`);
    }

    // Factor 2: Maintenance requests
    const maintenanceRequests = lease.tenant.requests.length;
    const unresolvedRequests = lease.tenant.requests.filter(
      (r) => r.status === 'PENDING' || r.status === 'IN_PROGRESS',
    ).length;

    if (unresolvedRequests > 3) {
      renewalScore -= 15;
      factors.push(`${unresolvedRequests} unresolved maintenance requests`);
    } else if (maintenanceRequests === 0) {
      renewalScore += 10;
      factors.push('No maintenance requests (tenant satisfied)');
    }

    // Factor 3: Lease duration
    const leaseDuration = (lease.endDate.getTime() - lease.startDate.getTime()) / (1000 * 60 * 60 * 24);
    const leaseYears = leaseDuration / 365;

    if (leaseYears > 2) {
      renewalScore += 15;
      factors.push(`Long-term tenant (${leaseYears.toFixed(1)} years)`);
    } else if (leaseYears < 0.5) {
      renewalScore -= 10;
      factors.push(`Short-term tenant (${leaseYears.toFixed(1)} years)`);
    }

    // Factor 4: Rent amount vs market
    // This would ideally use the rent optimization ML service
    // For now, we'll use a simple heuristic
    const currentRent = Number(lease.rentAmount);
    // Assume market rent is similar (in real implementation, call ML service)
    const marketRent = currentRent * 1.05; // 5% higher
    const rentDifference = ((marketRent - currentRent) / currentRent) * 100;

    if (rentDifference > 10) {
      renewalScore -= 15;
      factors.push(`Rent significantly below market (${rentDifference.toFixed(0)}%)`);
    } else if (rentDifference < -5) {
      renewalScore += 10;
      factors.push(`Rent at or above market`);
    }

    // Factor 5: Communication/engagement
    // Check if tenant has been responsive to communications
    // For now, we'll assume good engagement if they have payments
    if (totalPayments > 0) {
      renewalScore += 5;
      factors.push('Active tenant engagement');
    }

    // Normalize to 0-1 probability
    const renewalProbability = Math.max(0, Math.min(1, renewalScore / 100));

    // Determine confidence
    let confidence: 'LOW' | 'MEDIUM' | 'HIGH';
    if (totalPayments >= 6 && leaseYears > 1) {
      confidence = 'HIGH';
    } else if (totalPayments >= 3) {
      confidence = 'MEDIUM';
    } else {
      confidence = 'LOW';
    }

    // Generate recommended actions
    const recommendedActions: string[] = [];
    if (renewalProbability < 0.5) {
      recommendedActions.push('Reach out early to discuss renewal');
      recommendedActions.push('Consider offering incentives');
      recommendedActions.push('Address any unresolved maintenance issues');
    } else if (renewalProbability > 0.7) {
      recommendedActions.push('Send renewal offer 90 days before expiration');
      recommendedActions.push('Consider modest rent increase');
    } else {
      recommendedActions.push('Monitor tenant satisfaction');
      recommendedActions.push('Send renewal reminder 60 days before expiration');
    }

      const result = {
        renewalProbability,
        confidence,
        factors,
        recommendedActions,
      };

      success = true;
      const responseTime = Date.now() - startTime;

      // Record metric
      this.aiMetrics?.recordMetric({
        operation: 'predictRenewalLikelihood',
        success: true,
        responseTime,
        leaseId,
        renewalProbability,
      });

      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      const responseTime = Date.now() - startTime;

      // Record metric
      this.aiMetrics?.recordMetric({
        operation: 'predictRenewalLikelihood',
        success: false,
        responseTime,
        leaseId,
        error,
      });

      throw err;
    }
  }

  /**
   * Get optimal rent adjustment recommendation
   */
  async getRentAdjustmentRecommendation(
    leaseId: number,
  ): Promise<RentAdjustmentRecommendation> {
    const startTime = Date.now();
    let success = false;
    let cacheHit = false;
    let mlServiceUsed = false;
    let rentAdjustmentPercentage = 0;
    let retryAttempts = 0;
    let error: string | undefined;

    try {
      // Check cache first
      const cached = this.rentRecommendationCache.get(leaseId);
      if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
        this.logger.debug(`Using cached rent recommendation for lease ${leaseId}`);
        cacheHit = true;
        const responseTime = Date.now() - startTime;

        // Record metric
        this.aiMetrics?.recordMetric({
          operation: 'getRentAdjustment',
          success: true,
          responseTime,
          leaseId,
          rentAdjustmentPercentage: cached.recommendation.adjustmentPercentage,
          cacheHit: true,
          mlServiceUsed: false,
        });

        return cached.recommendation;
      }

      const lease = await this.prisma.lease.findUnique({
        where: { id: leaseId },
        include: {
          unit: {
            include: {
              property: true,
            },
          },
          tenant: {
            include: {
              payments: {
                orderBy: { paymentDate: 'desc' },
                take: 12,
              },
            },
          },
        },
      });

      if (!lease) {
        throw new Error(`Lease ${leaseId} not found`);
      }

      const currentRent = Number(lease.rentAmount);

      // Try to get recommendation from ML service with retry logic
      let recommendedRent = currentRent;
      let mlReasoning = '';
      const factors: Array<{ name: string; impact: number; description: string }> = [];
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= this.mlServiceMaxRetries; attempt++) {
        retryAttempts = attempt;
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), this.mlServiceTimeout);

          const response = await fetch(`${this.mlServiceUrl}/predict`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              unit_id: `unit-${lease.unitId}`,
              property_type: lease.unit.property?.propertyType || 'APARTMENT',
              bedrooms: lease.unit.bedrooms || 1,
              bathrooms: lease.unit.bathrooms || 1,
              square_feet: lease.unit.squareFeet || 800,
              address: lease.unit.property?.address || '',
              city: lease.unit.property?.city || '',
              state: lease.unit.property?.state || '',
              zip_code: lease.unit.property?.zipCode || '',
              current_rent: currentRent,
              year_built: lease.unit.property?.yearBuilt || 2000,
            }),
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            const data = await response.json() as {
              recommended_rent?: number;
              reasoning?: string;
              factors?: Array<{
                name: string;
                impact_percentage?: number;
                description: string;
              }>;
            };
            recommendedRent = data.recommended_rent || currentRent;
            mlReasoning = data.reasoning || ''; 
            
            if (data.factors) {
              factors.push(...data.factors.map((f) => ({
                name: f.name,
                impact: f.impact_percentage || 0,
                description: f.description,
              })));
            }

            // Success - break out of retry loop
            mlServiceUsed = true;
            break;
          } else {
            throw new Error(`ML service returned status ${response.status}`);
          }
        } catch (error) {
          lastError = error instanceof Error ? error : new Error(String(error));
          
          if (attempt < this.mlServiceMaxRetries) {
            const delay = this.mlServiceRetryDelay * Math.pow(2, attempt - 1); // Exponential backoff
            this.logger.warn(
              `ML service call failed (attempt ${attempt}/${this.mlServiceMaxRetries}), retrying in ${delay}ms:`,
              lastError.message,
            );
            await new Promise((resolve) => setTimeout(resolve, delay));
          } else {
            this.logger.warn(
              `ML service call failed after ${this.mlServiceMaxRetries} attempts, using fallback:`,
              lastError.message,
            );
          }
        }
      }

      // Fallback: Simple market-based adjustment
      if (recommendedRent === currentRent) {
        // Assume 3% annual increase
        recommendedRent = currentRent * 1.03;
        factors.push({
          name: 'Annual Adjustment',
          impact: 3,
          description: 'Standard annual rent increase (fallback - ML service unavailable)',
        });
      }

      const recommendation: RentAdjustmentRecommendation = {
        currentRent,
        recommendedRent,
        adjustmentPercentage: ((recommendedRent - currentRent) / currentRent) * 100,
        reasoning: mlReasoning || `Standard annual adjustment applied (ML service ${lastError ? 'unavailable' : 'used fallback'})`,
        factors,
      };

      rentAdjustmentPercentage = recommendation.adjustmentPercentage;

      // Cache the recommendation
      this.rentRecommendationCache.set(leaseId, {
        recommendation,
        timestamp: Date.now(),
      });

      // Clean up old cache entries (keep cache size reasonable)
      if (this.rentRecommendationCache.size > 1000) {
        const now = Date.now();
        for (const [key, value] of this.rentRecommendationCache.entries()) {
          if (now - value.timestamp > this.cacheTTL) {
            this.rentRecommendationCache.delete(key);
          }
        }
      }

      success = true;
      const responseTime = Date.now() - startTime;

      // Record metric
      this.aiMetrics?.recordMetric({
        operation: 'getRentAdjustment',
        success: true,
        responseTime,
        leaseId,
        rentAdjustmentPercentage,
        mlServiceUsed,
        cacheHit: false,
        retryAttempts: mlServiceUsed ? retryAttempts : 0,
      });

      return recommendation;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      const responseTime = Date.now() - startTime;

      // Record metric
      this.aiMetrics?.recordMetric({
        operation: 'getRentAdjustment',
        success: false,
        responseTime,
        leaseId,
        mlServiceUsed,
        cacheHit,
        retryAttempts,
        error,
      });

      throw err;
    }
  }

  /**
   * Generate personalized renewal offer
   */
  async generatePersonalizedRenewalOffer(
    leaseId: number,
  ): Promise<PersonalizedRenewalOffer> {
    const startTime = Date.now();
    let success = false;
    let error: string | undefined;

    try {
      const lease = await this.prisma.lease.findUnique({
      where: { id: leaseId },
      include: {
        tenant: {
          include: {
            payments: {
              orderBy: { paymentDate: 'desc' },
              take: 12,
            },
          },
        },
      },
    });

    if (!lease) {
      throw new Error(`Lease ${leaseId} not found`);
    }

    // Get renewal prediction
    const prediction = await this.predictRenewalLikelihood(leaseId);
    
    // Get rent adjustment recommendation
    const rentAdjustment = await this.getRentAdjustmentRecommendation(leaseId);

    const currentRent = Number(lease.rentAmount);
    let baseRent = rentAdjustment.recommendedRent;
    const incentives: Array<{
      type: 'RENT_DISCOUNT' | 'FREE_MONTH' | 'UPGRADE' | 'CASH_BACK';
      description: string;
      value: number;
    }> = [];

    // Adjust incentives based on renewal probability
    if (prediction.renewalProbability < 0.5) {
      // Low renewal probability - offer more incentives
      if (rentAdjustment.adjustmentPercentage > 5) {
        // If rent increase is high, offer discount
        const discount = baseRent * 0.05; // 5% discount for first year
        baseRent = baseRent - discount;
        incentives.push({
          type: 'RENT_DISCOUNT',
          description: '5% rent discount for first year of renewal',
          value: discount * 12,
        });
      } else {
        // Offer free month
        incentives.push({
          type: 'FREE_MONTH',
          description: 'One month free rent',
          value: baseRent,
        });
      }
    } else if (prediction.renewalProbability < 0.7) {
      // Medium renewal probability - modest incentive
      if (rentAdjustment.adjustmentPercentage > 3) {
        const discount = baseRent * 0.02; // 2% discount
        baseRent = baseRent - discount;
        incentives.push({
          type: 'RENT_DISCOUNT',
          description: '2% rent discount for first year',
          value: discount * 12,
        });
      }
    }

    // Calculate total value
    const totalValue = incentives.reduce((sum, inc) => sum + inc.value, 0);

    // Generate personalized message
    let message = `We value you as a tenant and would like to offer you a renewal opportunity. `;
    
    if (this.openai && this.aiEnabled) {
      try {
        message = await this.generateAIMessage(leaseId, prediction, rentAdjustment, incentives);
      } catch (error) {
        this.logger.warn('Failed to generate AI message, using template', error);
      }
    } else {
      message += `Your new monthly rent would be $${baseRent.toFixed(2)}. `;
      if (incentives.length > 0) {
        message += `We're also offering: ${incentives.map(i => i.description).join(', ')}. `;
      }
      message += `Please let us know if you'd like to renew your lease.`;
    }

    // Set expiration date (30 days from now)
    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + 30);

      const result = {
        baseRent,
        incentives,
        totalValue,
        message,
        expirationDate,
      };

      success = true;
      const responseTime = Date.now() - startTime;

      // Record metric
      this.aiMetrics?.recordMetric({
        operation: 'generatePersonalizedOffer',
        success: true,
        responseTime,
        leaseId,
      });

      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      const responseTime = Date.now() - startTime;

      // Record metric
      this.aiMetrics?.recordMetric({
        operation: 'generatePersonalizedOffer',
        success: false,
        responseTime,
        leaseId,
        error,
      });

      throw err;
    }
  }

  /**
   * Generate AI-powered personalized renewal message
   */
  private async generateAIMessage(
    leaseId: number,
    prediction: RenewalPrediction,
    rentAdjustment: RentAdjustmentRecommendation,
    incentives: Array<{ type: string; description: string; value: number }>,
  ): Promise<string> {
    if (!this.openai || !this.aiEnabled) {
      return '';
    }

    try {
      const prompt = `Generate a friendly, personalized lease renewal offer message.

Renewal probability: ${(prediction.renewalProbability * 100).toFixed(0)}%
Current rent: $${rentAdjustment.currentRent.toFixed(2)}
Recommended rent: $${rentAdjustment.recommendedRent.toFixed(2)}
Incentives: ${incentives.map(i => i.description).join(', ') || 'None'}

Keep it professional, warm, and concise (2-3 sentences). Highlight the value of staying.`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a property management assistant. Generate friendly, professional lease renewal offers.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 200,
      });

      return response.choices[0]?.message?.content?.trim() || '';
    } catch (error) {
      this.logger.error('Failed to generate AI message', error);
      return '';
    }
  }
}

