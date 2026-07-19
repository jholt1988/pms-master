import { Injectable, NotFoundException } from '@nestjs/common';
import {
  ApplicationStatus,
  BookkeepingTransactionStatus,
  LeaseRenewalStatus,
  LeaseStatus,
  MaintenancePriority,
  Role,
  Status,
  InspectionRequestStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { BriefingService } from '../briefing/briefing.service';
import { PolicyApprovalService } from '../policy/policy-approval.service';
import {
  CommandCenterDecisionCard,
  CommandCenterDecisionDetail,
  CommandCenterDecisionType,
  CommandCenterPriority,
  CommandCenterResponse,
  CommandCenterTimelineItem,
} from './command-center.types';
import { DecisionRecordService } from '../decisions/decision-record.service';

type Actor = {
  userId: string;
  role: Role;
};

type DecisionQueueFilters = {
  type?: string;
  priority?: string;
  propertyId?: string;
  status?: string;
  due?: string;
};

@Injectable()
export class CommandCenterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly briefingService: BriefingService,
    private readonly policyApprovalService: PolicyApprovalService,
    private readonly decisionRecordService: DecisionRecordService,
  ) {}

  async getCommandCenter(orgId: string, actor: Actor): Promise<CommandCenterResponse> {
    const [dailyBriefing, approvals, timeline, decisions] = await Promise.all([
      this.getDailyBriefing(orgId, actor),
      this.policyApprovalService.listPendingTasks(orgId),
      this.getTimeline(orgId),
      this.getDecisionQueue(orgId, actor),
    ]);
    const generatedAt = new Date().toISOString();

    return {
      metrics: {
        totalDecisions: decisions.length,
        criticalDecisions: decisions.filter((decision) => decision.priority === 'CRITICAL').length,
        pendingApprovals: approvals.length,
        generatedAt,
      },
      decisions,
      approvals,
      timeline,
      dailyBriefing,
    };
  }

  async getDecisionQueue(orgId: string, _actor: Actor, filters: DecisionQueueFilters = {}): Promise<CommandCenterDecisionCard[]> {
    const decisionGroups = await Promise.all([
      this.getDelinquencyDecisions(orgId),
      this.getMaintenanceTriageDecisions(orgId),
      this.getApplicationReviewDecisions(orgId),
      this.getRenewalReviewDecisions(orgId),
      this.getPaymentExceptionDecisions(orgId),
      this.getInspectionActionDecisions(orgId),
    ]);

    const decisions = decisionGroups
      .flat()
      .filter((decision) => this.matchesFilters(decision, filters))
      .sort((left, right) => right.score - left.score || left.createdAt.localeCompare(right.createdAt))
      .slice(0, 30);

    return Promise.all(decisions.map((decision) => this.linkSurfacedDecision(orgId, decision)));
  }

  async getDecisionDetail(orgId: string, actor: Actor, id: string): Promise<CommandCenterDecisionDetail> {
    const decision = (await this.getDecisionQueue(orgId, actor)).find((item) => item.id === id);
    if (!decision) {
      throw new NotFoundException('Command-center decision not found');
    }

    const decisionRecordsResult = await this.decisionRecordService.list(orgId, {
      workflowId: decision.type,
      entityType: decision.entity.type,
      entityId: decision.entity.id,
      take: 25,
      skip: 0,
    });
    const approvalTask = decision.approvalTaskId
      ? await this.prisma.approvalTask.findFirst({
          where: {
            id: decision.approvalTaskId,
            property: { organizationId: orgId },
          },
        })
      : null;

    const approvalTimeline = await this.getApprovalTimeline(orgId, decision);
    const recordTimeline = decisionRecordsResult.data.map((record: any) => ({
      id: record.id,
      title: record.recommendation,
      status: record.result ?? 'RECORDED',
      occurredAt: record.createdAt instanceof Date ? record.createdAt.toISOString() : String(record.createdAt),
      domain: 'decision',
    }));

    return {
      decision: {
        ...decision,
        timeline: [...recordTimeline, ...approvalTimeline].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
      },
      decisionRecords: decisionRecordsResult.data,
      approvalTask,
      auditTrail: [...recordTimeline, ...approvalTimeline].sort((left, right) => right.occurredAt.localeCompare(left.occurredAt)),
      sourceLinks: this.sourceLinks(decision),
    };
  }

  async executeDecisionAction(orgId: string, actor: Actor, id: string, actionId: string, note?: string) {
    const detail = await this.getDecisionDetail(orgId, actor, id);
    const action = detail.decision.actions.find((candidate) => candidate.id === actionId);
    if (!action) {
      throw new NotFoundException('Command-center action not found');
    }

    const existingPendingTask = await this.prisma.approvalTask.findFirst({
      where: {
        status: 'PENDING',
        propertyId: detail.decision.propertyId ?? undefined,
        title: detail.decision.recommendedAction,
        decisionRecords: {
          some: {
            organizationId: orgId,
            workflowId: detail.decision.type,
            entityType: detail.decision.entity.type,
            entityId: detail.decision.entity.id,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    if (existingPendingTask) {
      return { approvalTask: existingPendingTask, decision: detail.decision };
    }

    const approvalTask = await this.prisma.approvalTask.create({
      data: {
        title: detail.decision.recommendedAction,
        summary: `${detail.decision.title}. ${note?.trim() || detail.decision.summary}`,
        propertyId: detail.decision.propertyId ?? null,
        unitId: detail.decision.unitId ?? null,
        tenantId: detail.decision.tenantId ?? null,
        leaseId: detail.decision.entity.type === 'Lease' ? detail.decision.entity.id : null,
        workOrderId: detail.decision.entity.type === 'MaintenanceRequest' ? detail.decision.entity.id : null,
        createdById: actor.userId,
        actions: {
          evaluationId: detail.decision.decisionRecordId ?? detail.decision.id,
          workflowEventId: detail.decision.type,
          ruleName: 'Command center action approval',
          decision: detail.decision.id,
          actionId,
          actions: [],
        } as Prisma.InputJsonValue,
      },
    });

    await this.decisionRecordService.create({
      organizationId: orgId,
      workflowId: detail.decision.type,
      workflowInstanceId: detail.decision.id,
      actorId: actor.userId,
      entityType: detail.decision.entity.type,
      entityId: detail.decision.entity.id,
      recommendation: detail.decision.recommendedAction,
      rationale: [detail.decision.summary, ...(note?.trim() ? [`Operator note: ${note.trim()}`] : [])],
      evidenceRefs: detail.decision.evidence.map((evidence) => ({
        type: evidence.entityType ?? detail.decision.entity.type,
        id: evidence.entityId ?? detail.decision.entity.id,
        label: evidence.label,
      })),
      approvalTaskId: approvalTask.id,
      result: 'APPROVAL_TASK_CREATED',
    });

    return { approvalTask, decision: { ...detail.decision, approvalTaskId: approvalTask.id } };
  }

  async deferDecision(orgId: string, actor: Actor, id: string, reason?: string) {
    const detail = await this.getDecisionDetail(orgId, actor, id);
    const record = await this.decisionRecordService.create({
      organizationId: orgId,
      workflowId: detail.decision.type,
      workflowInstanceId: detail.decision.id,
      actorId: actor.userId,
      entityType: detail.decision.entity.type,
      entityId: detail.decision.entity.id,
      recommendation: detail.decision.recommendedAction,
      rationale: [
        detail.decision.summary,
        ...(reason?.trim() ? [`Deferred reason: ${reason.trim()}`] : ['Decision deferred without a reason.']),
      ],
      evidenceRefs: detail.decision.evidence.map((evidence) => ({
        type: evidence.entityType ?? detail.decision.entity.type,
        id: evidence.entityId ?? detail.decision.entity.id,
        label: evidence.label,
      })),
      approvalTaskId: detail.decision.approvalTaskId ?? undefined,
      result: 'DEFERRED',
    });
    return { decision: detail.decision, decisionRecord: record };
  }

  getDailyBriefing(orgId: string, actor: Actor) {
    return this.briefingService.getDailyBriefing(actor.userId, orgId);
  }

  private async getDelinquencyDecisions(orgId: string): Promise<CommandCenterDecisionCard[]> {
    const now = new Date();
    const invoices = await this.prisma.invoice.findMany({
      where: {
        OR: [{ status: 'OVERDUE' }, { dueDate: { lt: now }, status: { not: 'PAID' } }],
        lease: { unit: { property: { organizationId: orgId } } },
      },
      include: {
        lease: {
          include: {
            tenant: true,
            unit: { include: { property: true } },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
      take: 8,
    });

    return invoices.map((invoice) => {
      const daysOverdue = Math.max(0, Math.ceil((now.getTime() - invoice.dueDate.getTime()) / 86_400_000));
      return this.card({
        id: `delinquency:${invoice.id}`,
        type: 'DELINQUENCY_FOLLOW_UP',
        domain: 'payments',
        title: `Follow up on overdue invoice for ${this.userLabel(invoice.lease.tenant)}`,
        summary: `$${invoice.amountCents.toFixed(2)} due ${daysOverdue} day${daysOverdue === 1 ? '' : 's'} ago.`,
        priority: daysOverdue >= 14 ? 'CRITICAL' : daysOverdue >= 7 ? 'HIGH' : 'MEDIUM',
        score: 90 + Math.min(daysOverdue, 30),
        entityType: 'Invoice',
        entityId: String(invoice.id),
        entityLabel: invoice.description,
        propertyId: invoice.lease.unit.propertyId,
        unitId: invoice.lease.unitId,
        tenantId: invoice.lease.tenantId,
        dueAt: invoice.dueDate,
        createdAt: invoice.issuedAt,
        recommendedAction: 'Send compliant delinquency follow-up and offer payment options.',
        evidence: [
          { label: 'Amount', value: invoice.amountCents, source: 'Invoice.amount', entityType: 'Invoice', entityId: String(invoice.id) },
          { label: 'Days overdue', value: daysOverdue, source: 'Invoice.dueDate', entityType: 'Invoice', entityId: String(invoice.id) },
          { label: 'Property', value: invoice.lease.unit.property.name, source: 'Property.name', entityType: 'Property', entityId: invoice.lease.unit.propertyId },
        ],
        actions: [{ id: 'send-delinquency-follow-up', label: 'Prepare follow-up', mode: 'APPROVAL_REQUIRED' }],
      });
    });
  }

  private async getMaintenanceTriageDecisions(orgId: string): Promise<CommandCenterDecisionCard[]> {
    const requests = await this.prisma.maintenanceRequest.findMany({
      where: {
        status: { not: Status.COMPLETED },
        property: { organizationId: orgId },
        OR: [{ priority: { in: [MaintenancePriority.EMERGENCY, MaintenancePriority.HIGH] } }, { responseDueAt: { lte: new Date() } }],
      },
      include: {
        property: true,
        unit: true,
        author: true,
      },
      orderBy: [{ priority: 'asc' }, { createdAt: 'asc' }],
      take: 8,
    });

    return requests.map((request) =>
        this.card({
          id: `maintenance:${request.id}`,
          type: 'MAINTENANCE_TRIAGE',
          domain: 'maintenance',
          title: `Triage ${request.priority.toLowerCase()} maintenance: ${request.title}`,
          summary: request.description,
          priority: request.priority === MaintenancePriority.EMERGENCY ? 'CRITICAL' : 'HIGH',
          score: request.priority === MaintenancePriority.EMERGENCY ? 98 : 82,
          entityType: 'MaintenanceRequest',
          entityId: request.id,
          entityLabel: request.title,
          propertyId: request.propertyId,
          unitId: request.unitId,
          tenantId: request.authorId,
          dueAt: request.responseDueAt ?? request.dueAt,
          createdAt: request.createdAt,
          recommendedAction: 'Classify issue, assign owner, and prepare tenant response.',
          evidence: [
            { label: 'Priority', value: request.priority, source: 'MaintenanceRequest.priority', entityType: 'MaintenanceRequest', entityId: request.id },
            { label: 'Status', value: request.status, source: 'MaintenanceRequest.status', entityType: 'MaintenanceRequest', entityId: request.id },
            { label: 'Property', value: request.property?.name ?? null, source: 'Property.name', entityType: 'Property', entityId: request.propertyId ?? '' },
          ],
          actions: [{ id: 'assign-maintenance-owner', label: 'Assign and respond', mode: 'APPROVAL_REQUIRED' }],
        }),
    );
  }

  private async getApplicationReviewDecisions(orgId: string): Promise<CommandCenterDecisionCard[]> {
    const applications = await this.prisma.rentalApplication.findMany({
      where: {
        property: { organizationId: orgId },
        status: {
          in: [
            ApplicationStatus.PENDING,
            ApplicationStatus.PENDING_AI_REVIEW,
            ApplicationStatus.UNDER_REVIEW,
            ApplicationStatus.SCREENING,
            ApplicationStatus.SCORED,
            ApplicationStatus.DOCUMENTS_REVIEW,
          ],
        },
      },
      include: { property: true, unit: true },
      orderBy: { applicationDate: 'asc' },
      take: 8,
    });

    return applications.map((application) =>
      this.card({
        id: `application:${application.id}`,
        type: 'APPLICATION_REVIEW',
        domain: 'leasing',
        title: `Review application for ${application.fullName}`,
        summary: application.ai_summary ?? `Application is ${application.status.toLowerCase().replace(/_/g, ' ')}.`,
        priority: application.status === ApplicationStatus.SCORED ? 'HIGH' : 'MEDIUM',
        score: application.status === ApplicationStatus.SCORED ? 78 : 65,
        entityType: 'RentalApplication',
        entityId: String(application.id),
        entityLabel: application.fullName,
        propertyId: application.propertyId,
        unitId: application.unitId,
        createdAt: application.applicationDate,
        recommendedAction: 'Review screening evidence and prepare compliant approval or adverse action draft.',
        evidence: [
          { label: 'Status', value: application.status, source: 'RentalApplication.status', entityType: 'RentalApplication', entityId: String(application.id) },
          { label: 'Income', value: application.income, source: 'RentalApplication.income', entityType: 'RentalApplication', entityId: String(application.id) },
          { label: 'Credit score', value: application.creditScore, source: 'RentalApplication.creditScore', entityType: 'RentalApplication', entityId: String(application.id) },
          { label: 'Property', value: application.property.name, source: 'Property.name', entityType: 'Property', entityId: application.propertyId },
        ],
        actions: [{ id: 'review-application', label: 'Open review', mode: 'APPROVAL_REQUIRED' }],
      }),
    );
  }

  private async getRenewalReviewDecisions(orgId: string): Promise<CommandCenterDecisionCard[]> {
    const now = new Date();
    const leadDate = new Date(now);
    leadDate.setDate(leadDate.getDate() + 60);

    const leases = await this.prisma.lease.findMany({
      where: {
        status: { in: [LeaseStatus.ACTIVE, LeaseStatus.RENEWAL_PENDING] },
        endDate: { gte: now, lte: leadDate },
        unit: { property: { organizationId: orgId } },
      },
      include: {
        tenant: true,
        unit: { include: { property: true } },
        renewalOffers: { where: { status: LeaseRenewalStatus.OFFERED }, orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { endDate: 'asc' },
      take: 8,
    });

    return leases.map((lease) => {
      const daysUntilEnd = Math.ceil((lease.endDate.getTime() - now.getTime()) / 86_400_000);
      const pendingOffer = lease.renewalOffers[0];
      return this.card({
        id: `renewal:${lease.id}`,
        type: 'RENEWAL_REVIEW',
        domain: 'leasing',
        title: `Renewal review for ${this.userLabel(lease.tenant)}`,
        summary: pendingOffer
          ? `Renewal offer is pending at $${pendingOffer.proposedRentCents.toFixed(2)}.`
          : `Lease ends in ${daysUntilEnd} day${daysUntilEnd === 1 ? '' : 's'}.`,
        priority: daysUntilEnd <= lease.noticePeriodDays ? 'HIGH' : 'MEDIUM',
        score: daysUntilEnd <= lease.noticePeriodDays ? 80 : 62,
        entityType: 'Lease',
        entityId: lease.id,
        entityLabel: lease.unit.name,
        propertyId: lease.unit.propertyId,
        unitId: lease.unitId,
        tenantId: lease.tenantId,
        dueAt: lease.renewalDueAt ?? lease.endDate,
        createdAt: lease.createdAt,
        recommendedAction: 'Review rent, notice timing, and renewal terms before sending an offer.',
        evidence: [
          { label: 'Current rent', value: lease.rentAmountCents, source: 'Lease.rentAmount', entityType: 'Lease', entityId: lease.id },
          { label: 'Days until end', value: daysUntilEnd, source: 'Lease.endDate', entityType: 'Lease', entityId: lease.id },
          { label: 'Notice period days', value: lease.noticePeriodDays, source: 'Lease.noticePeriodDays', entityType: 'Lease', entityId: lease.id },
        ],
        actions: [{ id: 'prepare-renewal', label: 'Prepare renewal', mode: 'APPROVAL_REQUIRED' }],
      });
    });
  }

  private async getPaymentExceptionDecisions(orgId: string): Promise<CommandCenterDecisionCard[]> {
    const exceptions = await this.prisma.bookkeepingTransaction.findMany({
      where: {
        organizationId: orgId,
        status: BookkeepingTransactionStatus.EXCEPTION,
      },
      orderBy: { date: 'desc' },
      take: 8,
    });

    return exceptions.map((transaction) =>
      this.card({
        id: `payment-exception:${transaction.id}`,
        type: 'PAYMENT_EXCEPTION',
        domain: 'accounting',
        title: `Resolve payment exception: ${transaction.description}`,
        summary: transaction.exceptionReason ?? 'Bookkeeping transaction requires operator review.',
        priority: Math.abs(transaction.amountCents) >= 100_000 ? 'HIGH' : 'MEDIUM',
        score: Math.abs(transaction.amountCents) >= 100_000 ? 76 : 58,
        entityType: 'BookkeepingTransaction',
        entityId: transaction.id,
        entityLabel: transaction.description,
        createdAt: transaction.createdAt,
        dueAt: transaction.date,
        recommendedAction: 'Resolve exception, confirm allocation, and post only after review.',
        evidence: [
          { label: 'Amount cents', value: transaction.amountCents, source: 'BookkeepingTransaction.amountCents', entityType: 'BookkeepingTransaction', entityId: transaction.id },
          { label: 'Source type', value: transaction.sourceType, source: 'BookkeepingTransaction.sourceType', entityType: 'BookkeepingTransaction', entityId: transaction.id },
          { label: 'Reason', value: transaction.exceptionReason, source: 'BookkeepingTransaction.exceptionReason', entityType: 'BookkeepingTransaction', entityId: transaction.id },
        ],
        actions: [{ id: 'resolve-payment-exception', label: 'Resolve exception', mode: 'APPROVAL_REQUIRED' }],
      }),
    );
  }

  private async getInspectionActionDecisions(orgId: string): Promise<CommandCenterDecisionCard[]> {
    const requests = await this.prisma.inspectionRequest.findMany({
      where: {
        property: { organizationId: orgId },
        status: InspectionRequestStatus.PENDING,
      },
      include: {
        property: true,
        unit: true,
        tenant: true,
      },
      orderBy: { createdAt: 'asc' },
      take: 8,
    });

    return requests.map((request) =>
      this.card({
        id: `inspection-request:${request.id}`,
        type: 'INSPECTION_ACTION_ITEM',
        domain: 'inspections',
        title: `Review ${request.type.toLowerCase().replace(/_/g, ' ')} inspection request`,
        summary: request.notes ?? `Inspection request is pending for ${request.unit.name}.`,
        priority: request.type === 'EMERGENCY' ? 'HIGH' : 'MEDIUM',
        score: request.type === 'EMERGENCY' ? 75 : 55,
        entityType: 'InspectionRequest',
        entityId: String(request.id),
        entityLabel: request.unit.name,
        propertyId: request.propertyId,
        unitId: request.unitId,
        tenantId: request.tenantId,
        createdAt: request.createdAt,
        recommendedAction: 'Approve, deny, or schedule inspection with tenant-facing notes.',
        evidence: [
          { label: 'Type', value: request.type, source: 'InspectionRequest.type', entityType: 'InspectionRequest', entityId: String(request.id) },
          { label: 'Status', value: request.status, source: 'InspectionRequest.status', entityType: 'InspectionRequest', entityId: String(request.id) },
          { label: 'Property', value: request.property.name, source: 'Property.name', entityType: 'Property', entityId: request.propertyId },
        ],
        actions: [{ id: 'review-inspection-request', label: 'Review inspection', mode: 'APPROVAL_REQUIRED' }],
      }),
    );
  }

  private async getTimeline(orgId: string): Promise<CommandCenterTimelineItem[]> {
    const tasks = await this.prisma.approvalTask.findMany({
      where: {
        property: { organizationId: orgId },
      },
      orderBy: { updatedAt: 'desc' },
      take: 12,
    });

    return tasks.map((task) => ({
      id: task.id,
      title: task.title,
      status: task.status,
      occurredAt: (task.executedAt ?? task.decidedAt ?? task.updatedAt ?? task.createdAt).toISOString(),
      domain: 'approval',
    }));
  }

  private card(input: {
    id: string;
    type: CommandCenterDecisionType;
    domain: CommandCenterDecisionCard['domain'];
    title: string;
    summary: string;
    priority: CommandCenterPriority;
    score: number;
    entityType: string;
    entityId: string;
    entityLabel?: string | null;
    propertyId?: string | null;
    unitId?: string | null;
    tenantId?: string | null;
    dueAt?: Date | null;
    createdAt: Date;
    recommendedAction: string;
    evidence: CommandCenterDecisionCard['evidence'];
    actions: CommandCenterDecisionCard['actions'];
  }): CommandCenterDecisionCard {
    return {
      id: input.id,
      type: input.type,
      domain: input.domain,
      title: input.title,
      summary: input.summary,
      priority: input.priority,
      score: input.score,
      entity: {
        type: input.entityType,
        id: input.entityId,
        label: input.entityLabel,
      },
      propertyId: input.propertyId,
      unitId: input.unitId,
      tenantId: input.tenantId,
      dueAt: input.dueAt?.toISOString() ?? null,
      createdAt: input.createdAt.toISOString(),
      recommendedAction: input.recommendedAction,
      evidence: input.evidence,
      actions: input.actions,
      timeline: [],
    };
  }

  private userLabel(user: { firstName?: string | null; lastName?: string | null; email?: string | null; username?: string | null }) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.email || user.username || 'tenant';
  }

  private matchesFilters(decision: CommandCenterDecisionCard, filters: DecisionQueueFilters) {
    if (filters.type && decision.type !== filters.type) return false;
    if (filters.priority && decision.priority !== filters.priority) return false;
    if (filters.propertyId && decision.propertyId !== filters.propertyId) return false;
    if (filters.status === 'approval-linked' && !decision.approvalTaskId) return false;
    if (filters.status === 'unlinked' && decision.approvalTaskId) return false;
    if (filters.due === 'overdue' && (!decision.dueAt || new Date(decision.dueAt) >= new Date())) return false;
    if (filters.due === 'upcoming' && (!decision.dueAt || new Date(decision.dueAt) < new Date())) return false;
    return true;
  }

  private async linkSurfacedDecision(orgId: string, decision: CommandCenterDecisionCard): Promise<CommandCenterDecisionCard> {
    const existingRecord = await this.prisma.decisionRecord.findFirst({
      where: {
        organizationId: orgId,
        workflowId: decision.type,
        entityType: decision.entity.type,
        entityId: decision.entity.id,
        result: 'SURFACED',
      },
      orderBy: { createdAt: 'desc' },
    });
    const record = existingRecord ?? await this.decisionRecordService.create({
      organizationId: orgId,
      workflowId: decision.type,
      workflowInstanceId: decision.id,
      entityType: decision.entity.type,
      entityId: decision.entity.id,
      recommendation: decision.recommendedAction,
      rationale: [decision.summary],
      evidenceRefs: decision.evidence.map((evidence) => ({
        type: evidence.entityType ?? decision.entity.type,
        id: evidence.entityId ?? decision.entity.id,
        label: evidence.label,
      })),
      result: 'SURFACED',
    });
    const approvalTask = await this.findLinkedApprovalTask(orgId, decision, record.id);
    return {
      ...decision,
      decisionRecordId: record.id,
      approvalTaskId: approvalTask?.id ?? decision.approvalTaskId ?? null,
      actions: decision.actions.map((action) => ({
        ...action,
        approvalTaskId: approvalTask?.id ?? action.approvalTaskId ?? null,
      })),
    };
  }

  private async findLinkedApprovalTask(orgId: string, decision: CommandCenterDecisionCard, decisionRecordId?: string) {
    return this.prisma.approvalTask.findFirst({
      where: {
        property: decision.propertyId ? { organizationId: orgId } : undefined,
        propertyId: decision.propertyId ?? undefined,
        decisionRecords: decisionRecordId ? { some: { id: decisionRecordId } } : undefined,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private async getApprovalTimeline(orgId: string, decision: CommandCenterDecisionCard): Promise<CommandCenterTimelineItem[]> {
    const tasks = await this.prisma.approvalTask.findMany({
      where: {
        property: decision.propertyId ? { organizationId: orgId } : undefined,
        propertyId: decision.propertyId ?? undefined,
        OR: [
          { id: decision.approvalTaskId ?? undefined },
          { decisionRecords: { some: { entityType: decision.entity.type, entityId: decision.entity.id, organizationId: orgId } } },
        ],
      },
      orderBy: { updatedAt: 'desc' },
      take: 10,
    });

    return tasks.flatMap((task) => [
      {
        id: `${task.id}:created`,
        title: task.title,
        status: 'APPROVAL_CREATED',
        occurredAt: task.createdAt.toISOString(),
        domain: 'approval',
      },
      ...(task.decidedAt ? [{
        id: `${task.id}:decided`,
        title: task.title,
        status: task.status,
        occurredAt: task.decidedAt.toISOString(),
        domain: 'approval',
      }] : []),
      ...(task.executedAt ? [{
        id: `${task.id}:executed`,
        title: task.title,
        status: task.executionError ? 'EXECUTION_FAILED' : 'EXECUTED',
        occurredAt: task.executedAt.toISOString(),
        domain: 'execution',
      }] : []),
    ]);
  }

  private sourceLinks(decision: CommandCenterDecisionCard) {
    const links = [
      {
        label: decision.entity.label ?? decision.entity.type,
        entityType: decision.entity.type,
        entityId: decision.entity.id,
        route: this.routeForEntity(decision.entity.type, decision.entity.id),
      },
    ];
    for (const evidence of decision.evidence) {
      if (!evidence.entityType || !evidence.entityId) continue;
      if (links.some((link) => link.entityType === evidence.entityType && link.entityId === evidence.entityId)) continue;
      links.push({
        label: evidence.label,
        entityType: evidence.entityType,
        entityId: evidence.entityId,
        route: this.routeForEntity(evidence.entityType, evidence.entityId),
      });
    }
    return links;
  }

  private routeForEntity(entityType: string, entityId: string) {
    switch (entityType) {
      case 'Invoice':
        return `/api/payments/invoices?id=${entityId}`;
      case 'MaintenanceRequest':
        return `/api/maintenance/${entityId}`;
      case 'RentalApplication':
        return `/api/rental-applications/${entityId}`;
      case 'Lease':
        return `/api/leases/${entityId}`;
      case 'BookkeepingTransaction':
        return `/api/bookkeeping/transactions/exceptions?id=${entityId}`;
      case 'InspectionRequest':
        return `/api/inspections/requests?id=${entityId}`;
      case 'Property':
        return `/api/properties/${entityId}`;
      default:
        return `/api/${entityType.toLowerCase()}/${entityId}`;
    }
  }
}
