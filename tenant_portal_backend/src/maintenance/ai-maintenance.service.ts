import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import OpenAI from 'openai';
import {
  MaintenancePriority,
  MaintenanceRequest,
  Technician,
  Prisma,
} from '@prisma/client';

interface TechnicianMatch {
  technician: Technician;
  score: number;
  reasons: string[];
}

interface SLABreachPrediction {
  probability: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  factors: string[];
  recommendedActions: string[];
}

@Injectable()
export class AIMaintenanceService {
  private readonly logger = new Logger(AIMaintenanceService.name);
  private openai: OpenAI | null = null;
  private readonly aiEnabled: boolean;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    const aiEnabled = this.configService.get<string>('AI_ENABLED', 'false') === 'true';
    const maintenanceAiEnabled = this.configService.get<string>(
      'AI_MAINTENANCE_ENABLED',
      'true',
    ) === 'true';

    this.aiEnabled = aiEnabled && maintenanceAiEnabled;

    if (this.aiEnabled && apiKey) {
      this.openai = new OpenAI({ apiKey });
      this.logger.log('AI Maintenance Service initialized with OpenAI');
    } else {
      this.logger.warn(
        'AI Maintenance Service initialized in mock mode (no OpenAI API key or AI disabled)',
      );
    }
  }

  /**
   * Use AI to assign priority based on maintenance request description
   */
  async assignPriorityWithAI(
    title: string,
    description: string,
  ): Promise<MaintenancePriority> {
    if (!this.openai || !this.aiEnabled) {
      // Fallback to keyword-based priority assignment
      this.logger.log('AI priority assignment skipped, using fallback', {
        service: 'AIMaintenanceService',
        method: 'assignPriorityWithAI',
        reason: 'AI disabled or OpenAI not available',
      });
      return this.assignPriorityFallback(title, description);
    }

    const startTime = Date.now();
    try {
      const prompt = `Analyze this maintenance request and assign a priority level.

Title: ${title}
Description: ${description}

Priority levels:
- HIGH: Emergency situations (water leaks, no heat in winter, gas leaks, electrical hazards, security issues, broken locks)
- MEDIUM: Important but not urgent (broken appliances, minor plumbing, HVAC issues, pest problems)
- LOW: Cosmetic or non-urgent (paint touch-ups, minor repairs, cosmetic issues, routine maintenance)

Respond with ONLY one word: HIGH, MEDIUM, or LOW`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content:
              'You are a property management assistant. Analyze maintenance requests and assign priority levels. Respond with only the priority level (HIGH, MEDIUM, or LOW).',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.3,
        max_tokens: 10,
      });

      const priorityText = response.choices[0]?.message?.content?.trim().toUpperCase();
      const responseTime = Date.now() - startTime;
      
      let priority: MaintenancePriority;
      if (priorityText === 'HIGH') {
        priority = MaintenancePriority.HIGH;
      } else if (priorityText === 'LOW') {
        priority = MaintenancePriority.LOW;
      } else {
        priority = MaintenancePriority.MEDIUM;
      }

      // Structured logging with metrics
      this.logger.log('AI priority assignment completed', {
        service: 'AIMaintenanceService',
        method: 'assignPriorityWithAI',
        priority,
        responseTime,
        success: true,
        cached: false,
        inputTokens: prompt.length / 4, // Rough estimate
        outputTokens: 1,
      });

      return priority;
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.logger.warn('AI priority assignment failed, using fallback', {
        service: 'AIMaintenanceService',
        method: 'assignPriorityWithAI',
        responseTime,
        success: false,
        error: error instanceof Error ? error.message : String(error),
        errorType: error instanceof Error ? error.constructor.name : 'UnknownError',
      });
      return this.assignPriorityFallback(title, description);
    }
  }

  /**
   * Fallback priority assignment using keyword matching
   */
  private assignPriorityFallback(
    title: string,
    description: string,
  ): MaintenancePriority {
    const text = `${title} ${description}`.toLowerCase();

    const highPriorityKeywords = [
      'leak',
      'flood',
      'water',
      'fire',
      'smoke',
      'gas',
      'electrical',
      'hazard',
      'emergency',
      'urgent',
      'broken lock',
      'security',
      'no heat',
      'no hot water',
      'flooding',
      'sewage',
    ];

    const lowPriorityKeywords = [
      'paint',
      'cosmetic',
      'touch-up',
      'routine',
      'maintenance',
      'cleaning',
      'aesthetic',
    ];

    if (highPriorityKeywords.some((keyword) => text.includes(keyword))) {
      return MaintenancePriority.HIGH;
    }

    if (lowPriorityKeywords.some((keyword) => text.includes(keyword))) {
      return MaintenancePriority.LOW;
    }

    return MaintenancePriority.MEDIUM;
  }

  /**
   * AI-powered technician assignment based on skills, workload, location, and history
   */
  async assignTechnician(
    request: MaintenanceRequest & {
      property?: { latitude?: number | null; longitude?: number | null } | null;
      asset?: { category?: string | null } | null;
    },
  ): Promise<TechnicianMatch | null> {
    // Get all active technicians
    const technicians = await this.prisma.technician.findMany({
      where: { active: true },
      include: {
        assignments: {
          where: {
            status: { in: ['PENDING', 'IN_PROGRESS'] },
          },
        },
        user: true,
      },
    });

    if (technicians.length === 0) {
      return null;
    }

    // Calculate match scores for each technician
    const matches: TechnicianMatch[] = [];

    for (const tech of technicians) {
      let score = 0;
      const reasons: string[] = [];

      // Factor 1: Current workload (lower is better)
      const currentWorkload = tech.assignments.length;
      const workloadScore = Math.max(0, 100 - currentWorkload * 10);
      score += workloadScore * 0.3;
      reasons.push(
        `Workload: ${currentWorkload} active requests (${workloadScore.toFixed(0)} points)`,
      );

      // Factor 2: Historical success rate for similar requests
      const successRate = await this.calculateSuccessRate(tech.id, request);
      const successScore = successRate * 100;
      score += successScore * 0.3;
      reasons.push(
        `Success rate: ${(successRate * 100).toFixed(0)}% for similar requests (${successScore.toFixed(0)} points)`,
      );

      // Factor 3: Geographic proximity (if property has coordinates)
      if (request.property?.latitude && request.property?.longitude) {
        // For now, we'll use a simple availability check
        // In a real implementation, you'd calculate distance
        const proximityScore = 50; // Placeholder
        score += proximityScore * 0.2;
        reasons.push(`Proximity: Available in area (${proximityScore} points)`);
      } else {
        score += 50 * 0.2;
        reasons.push('Proximity: Unknown location (50 points)');
      }

      // Factor 4: Asset category matching (if applicable)
      if (request.asset?.category) {
        const categoryMatch = await this.checkCategoryMatch(tech.id, request.asset.category);
        const categoryScore = categoryMatch ? 100 : 50;
        score += categoryScore * 0.2;
        reasons.push(
          `Category match: ${categoryMatch ? 'Yes' : 'No'} (${categoryScore} points)`,
        );
      } else {
        score += 50 * 0.2;
        reasons.push('Category match: N/A (50 points)');
      }

      matches.push({
        technician: tech,
        score,
        reasons,
      });
    }

    // Sort by score descending and return the best match
    matches.sort((a, b) => b.score - a.score);

    return matches[0] || null;
  }

  /**
   * Calculate success rate for a technician on similar requests
   */
  private async calculateSuccessRate(
    technicianId: number,
    request: MaintenanceRequest,
  ): Promise<number> {
    // Get technician's completed requests with similar priority
    const completedRequests = await this.prisma.maintenanceRequest.findMany({
      where: {
        assigneeId: technicianId,
        status: 'COMPLETED',
        priority: request.priority,
      },
      take: 20,
    });

    if (completedRequests.length === 0) {
      return 0.5; // Default to 50% if no history
    }

    // Calculate average completion time vs SLA
    let onTimeCount = 0;
    for (const req of completedRequests) {
      if (req.completedAt && req.dueAt) {
        const completedOnTime = req.completedAt <= req.dueAt;
        if (completedOnTime) {
          onTimeCount++;
        }
      }
    }

    return completedRequests.length > 0
      ? onTimeCount / completedRequests.length
      : 0.5;
  }

  /**
   * Check if technician has experience with asset category
   */
  private async checkCategoryMatch(
    technicianId: number,
    category: string,
  ): Promise<boolean> {
    const categoryRequests = await this.prisma.maintenanceRequest.findMany({
      where: {
        assigneeId: technicianId,
        asset: {
          category: category as any,
        },
        status: 'COMPLETED',
      },
      take: 1,
    });

    return categoryRequests.length > 0;
  }

  /**
   * Predict probability of SLA breach for a maintenance request
   */
  async predictSLABreach(requestId: number): Promise<SLABreachPrediction> {
    const request = await this.prisma.maintenanceRequest.findUnique({
      where: { id: requestId },
      include: {
        assignee: true,
        property: true,
        asset: true,
        history: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!request) {
      throw new Error(`Maintenance request ${requestId} not found`);
    }

    const factors: string[] = [];
    let riskScore = 0;

    // Factor 1: Time remaining until SLA deadline
    if (request.dueAt) {
      const now = new Date();
      const timeRemaining = request.dueAt.getTime() - now.getTime();
      const hoursRemaining = timeRemaining / (1000 * 60 * 60);

      if (hoursRemaining < 0) {
        riskScore += 100;
        factors.push('SLA deadline has already passed');
      } else if (hoursRemaining < 24) {
        riskScore += 80;
        factors.push(`Less than 24 hours remaining (${hoursRemaining.toFixed(1)}h)`);
      } else if (hoursRemaining < 48) {
        riskScore += 50;
        factors.push(`Less than 48 hours remaining (${hoursRemaining.toFixed(1)}h)`);
      } else {
        riskScore += 20;
        factors.push(`Adequate time remaining (${hoursRemaining.toFixed(1)}h)`);
      }
    }

    // Factor 2: Request age
    const requestAge = Date.now() - request.createdAt.getTime();
    const daysOld = requestAge / (1000 * 60 * 60 * 24);
    if (daysOld > 7) {
      riskScore += 30;
      factors.push(`Request is ${daysOld.toFixed(1)} days old`);
    }

    // Factor 3: Priority level
    if (request.priority === MaintenancePriority.HIGH) {
      riskScore += 20;
      factors.push('High priority request');
    }

    // Factor 4: Technician workload (if assigned)
    if (request.assignee) {
      const activeAssignments = await this.prisma.maintenanceRequest.count({
        where: {
          assigneeId: request.assigneeId,
          status: { in: ['PENDING', 'IN_PROGRESS'] },
        },
      });

      if (activeAssignments > 10) {
        riskScore += 25;
        factors.push(`Technician has ${activeAssignments} active assignments`);
      } else if (activeAssignments > 5) {
        riskScore += 15;
        factors.push(`Technician has ${activeAssignments} active assignments`);
      }
    } else {
      riskScore += 30;
      factors.push('No technician assigned yet');
    }

    // Factor 5: Historical patterns (if we have data)
    if (request.propertyId) {
      const similarRequests = await this.prisma.maintenanceRequest.findMany({
        where: {
          propertyId: request.propertyId,
          priority: request.priority,
          status: 'COMPLETED',
        },
        take: 10,
      });

      if (similarRequests.length > 0) {
        let breachedCount = 0;
        for (const similar of similarRequests) {
          if (similar.completedAt && similar.dueAt) {
            if (similar.completedAt > similar.dueAt) {
              breachedCount++;
            }
          }
        }

        const breachRate = breachedCount / similarRequests.length;
        if (breachRate > 0.5) {
          riskScore += 20;
          factors.push(
            `Historical breach rate: ${(breachRate * 100).toFixed(0)}% for similar requests`,
          );
        }
      }
    }

    // Normalize risk score to 0-1 probability
    const probability = Math.min(1, riskScore / 100);

    // Determine risk level
    let riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    if (probability >= 0.8) {
      riskLevel = 'CRITICAL';
    } else if (probability >= 0.6) {
      riskLevel = 'HIGH';
    } else if (probability >= 0.4) {
      riskLevel = 'MEDIUM';
    } else {
      riskLevel = 'LOW';
    }

    // Generate recommended actions
    const recommendedActions: string[] = [];
    if (!request.assignee) {
      recommendedActions.push('Assign a technician immediately');
    }
    if (probability > 0.6) {
      recommendedActions.push('Escalate to property manager');
      recommendedActions.push('Notify tenant of potential delay');
    }
    if (request.priority !== MaintenancePriority.HIGH && probability > 0.7) {
      recommendedActions.push('Consider upgrading priority level');
    }

    return {
      probability,
      riskLevel,
      factors,
      recommendedActions,
    };
  }

  /**
   * Determine if request should be auto-escalated
   */
  async shouldAutoEscalate(requestId: number): Promise<boolean> {
    const prediction = await this.predictSLABreach(requestId);
    return prediction.riskLevel === 'CRITICAL' || prediction.probability > 0.8;
  }
}

