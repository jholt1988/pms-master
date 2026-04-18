// Story 13: Decision Engine Integration for Portfolio Analytics
// GET /copilot/decisions, POST /copilot/decisions/:id/resolve
// Dependencies: 5, 6, 7, 8, 9, 10, 11 | Estimate: Large

import { Controller, Get, Post, Param, Body, Query, UseGuards, NotFoundException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/roles.guard';
import { Roles } from '../../auth/roles.decorator';
import { PrismaService } from '../../prisma/prisma.service';

interface ResolveDecisionDto {
  resolution?: string;
  note?: string;
}

interface DecisionQueryDto {
  domain?: string;
  status?: 'active' | 'resolved';
  urgency?: string;
  limit?: number;
  offset?: number;
}

@Controller('copilot')
@UseGuards(AuthGuard('jwt'), RolesGuard)
export class DecisionEngineController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('decisions')
  async getDecisions(
    @Query() query: DecisionQueryDto,
  ) {
    const { domain, status, urgency, limit = 20, offset = 0 } = query;

    const where: any = {};

    if (domain) {
      where.domain = domain;
    }

    if (status === 'active') {
      where.resolved = false;
    } else if (status === 'resolved') {
      where.resolved = true;
    }

    if (urgency) {
      where.urgency = urgency;
    }

    const [decisions, total] = await Promise.all([
      this.prisma.decision.findMany({
        where,
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        take: limit,
        skip: offset,
      }),
      this.prisma.decision.count({ where }),
    ]);

    return {
      data: decisions,
      total,
      limit,
      offset,
    };
  }

  @Get('decisions/summary')
  async getDecisionSummary() {
    const [
      activeCount,
      byDomain,
      byUrgency,
      highPriority,
    ] = await Promise.all([
      this.prisma.decision.count({ where: { resolved: false } }),
      this.prisma.decision.groupBy({
        by: ['domain'],
        where: { resolved: false },
        _count: true,
      }),
      this.prisma.decision.groupBy({
        by: ['urgency'],
        where: { resolved: false },
        _count: true,
      }),
      this.prisma.decision.count({
        where: {
          resolved: false,
          priority: { gte: 80 },
        },
      }),
    ]);

    return {
      activeCount,
      highPriorityCount: highPriority,
      byDomain: byDomain.map(d => ({ domain: d.domain, count: d._count })),
      byUrgency: byUrgency.map(d => ({ urgency: d.urgency, count: d._count })),
    };
  }

  @Post('decisions/:id/resolve')
  @Roles('PROPERTY_MANAGER', 'ADMIN')
  async resolveDecision(
    @Param('id') id: string,
    @Body() dto: ResolveDecisionDto,
  ) {
    const decisionId = parseInt(id, 10);

    const decision = await this.prisma.decision.findUnique({
      where: { id: decisionId },
    });

    if (!decision) {
      throw new NotFoundException('Decision not found');
    }

    const updated = await this.prisma.decision.update({
      where: { id: decisionId },
      data: {
        resolved: true,
        resolvedAt: new Date(),
        resolution: dto.resolution,
        note: dto.note,
      },
    });

    console.log('[DECISION] Resolved:', decisionId, dto.resolution);

    return {
      id: updated.id,
      domain: updated.domain,
      title: updated.title,
      resolved: updated.resolved,
      resolvedAt: updated.resolvedAt,
    };
  }

  @Get('radial-context')
  async getRadialContext() {
    // Gather context for radial command badge counts
    const [
      paymentsPending,
      leasesActive,
      maintenancePending,
      screeningQueue,
    ] = await Promise.all([
      this.prisma.payment.count({
        where: { status: { not: 'PAID' }, paymentDate: { lt: new Date() } },
      }),
      this.prisma.lease.count({ where: { status: 'ACTIVE' } }),
      this.prisma.maintenanceRequest.count({
        where: { status: { in: ['SUBMITTED', 'IN_PROGRESS'] } },
      }),
      this.prisma.rentalApplication.count({
        where: { status: 'PENDING_REVIEW' },
      }),
    ]);

    return {
      payments: paymentsPending,
      leases: leasesActive,
      repairs: maintenancePending,
      screening: screeningQueue,
    };
  }

  @Get('feed')
  async getCopilotFeed() {
    // Active decisions for feed
    const decisions = await this.prisma.decision.findMany({
      where: { resolved: false },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
      take: 50,
    });

    // Transform to feed items
    const feedItems = decisions.map(d => ({
      id: d.id,
      type: 'decision' as const,
      domain: d.domain,
      entityId: d.entityId,
      title: d.title,
      summary: d.context?.summary || d.title,
      priority: d.priority,
      urgency: d.urgency,
      createdAt: d.createdAt,
      actions: this.getActionsForDomain(d.domain),
    }));

    return { items: feedItems, total: feedItems.length };
  }

  private getActionsForDomain(domain: string): { label: string; action: string }[] {
    const actionMap: Record<string, { label: string; action: string }[]> = {
      payments: [
        { label: 'View Payment', action: 'navigate:/payments' },
        { label: 'Send Notice', action: 'api:/payments/:id/send-notice' },
      ],
      leasing: [
        { label: 'Review Application', action: 'navigate:/screening' },
        { label: 'Create Lease', action: 'navigate:/leases/new' },
      ],
      repairs: [
        { label: 'Schedule', action: 'api:/maintenance/:id/schedule' },
        { label: 'Assign Vendor', action: 'api:/maintenance/:id/assign' },
      ],
      financials: [
        { label: 'Categorize', action: 'api:/transactions/:id/categorize' },
        { label: 'Reconcile', action: 'api:/transactions/reconcile' },
      ],
    };

    return actionMap[domain] || [];
  }
}

// Decision generation worker (runs periodically)
@Controller('copilot')
export class DecisionWorker {
  constructor(private readonly prisma: PrismaService) {}

  async generateDecisions() {
    const results = {
      payments: 0,
      repairs: 0,
      screening: 0,
      financials: 0,
    };

    // Check for overdue payments without decisions
    const overduePayments = await this.prisma.payment.findMany({
      where: {
        status: { not: 'PAID' },
        paymentDate: { lt: new Date() },
      },
      take: 100,
    });

    for (const payment of overduePayments) {
      const existing = await this.prisma.decision.findFirst({
        where: {
          domain: 'payments',
          entityId: String(payment.id),
          resolved: false,
        },
      });

      if (!existing) {
        await this.prisma.decision.create({
          data: {
            domain: 'payments',
            type: 'PAYMENT_OVERDUE',
            entityId: String(payment.id),
            title: `Payment overdue - $${payment.amount}`,
            priority: 80,
            urgency: 'immediate',
            context: { paymentId: payment.id },
          },
        });
        results.payments++;
      }
    }

    // Check for pending maintenance
    const pendingMaintenance = await this.prisma.maintenanceRequest.findMany({
      where: {
        status: 'SUBMITTED',
      },
      take: 50,
    });

    for (const request of pendingMaintenance) {
      const existing = await this.prisma.decision.findFirst({
        where: {
          domain: 'repairs',
          entityId: String(request.id),
          resolved: false,
        },
      });

      if (!existing) {
        const priority = request.priority === 'URGENT' ? 90 : request.priority === 'HIGH' ? 70 : 50;
        const urgency = request.priority === 'URGENT' ? 'immediate' : 'today';

        await this.prisma.decision.create({
          data: {
            domain: 'repairs',
            type: 'MAINTENANCE_PENDING',
            entityId: String(request.id),
            title: `Schedule repair: ${request.title}`,
            priority,
            urgency,
            context: { requestId: request.id },
          },
        });
        results.repairs++;
      }
    }

    // Check for pending applications
    const pendingApps = await this.prisma.rentalApplication.findMany({
      where: { status: 'PENDING_REVIEW' },
      take: 20,
    });

    for (const app of pendingApps) {
      const existing = await this.prisma.decision.findFirst({
        where: {
          domain: 'screening',
          entityId: String(app.id),
          resolved: false,
        },
      });

      if (!existing) {
        await this.prisma.decision.create({
          data: {
            domain: 'screening',
            type: 'APPLICATION_REVIEW',
            entityId: String(app.id),
            title: `Review applicant: ${app.applicantName}`,
            priority: 60,
            urgency: 'this_week',
            context: { applicationId: app.id },
          },
        });
        results.screening++;
      }
    }

    console.log('[DECISIONWORKER] Generated:', results);
    return results;
  }
}