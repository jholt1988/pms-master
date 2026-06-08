import { Injectable } from '@nestjs/common';
import {
  ApplicationStatus,
  BookkeepingTransactionStatus,
  InspectionRequestStatus,
  LeaseRenewalStatus,
  LeaseStatus,
  MaintenancePriority,
  OwnerStatementStatus,
  Status,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  OperatorWorkflowGroup,
  OperatorWorkflowItem,
  OperatorWorkflowsResponse,
} from './operator-workflows.types';

@Injectable()
export class OperatorWorkflowsService {
  constructor(private readonly prisma: PrismaService) {}

  async getWorkflows(orgId: string): Promise<OperatorWorkflowsResponse> {
    const groups = await Promise.all([
      this.getPaymentLedgerItems(orgId),
      this.getMaintenanceItems(orgId),
      this.getApplicationItems(orgId),
      this.getLeaseHandoffItems(orgId),
      this.getInspectionItems(orgId),
      this.getRenewalItems(orgId),
      this.getOwnerStatementItems(orgId),
    ]);
    const items = groups.flatMap((group) => group.items);

    return {
      generatedAt: new Date().toISOString(),
      groups,
      totals: {
        workflows: groups.length,
        items: items.length,
        highPriority: items.filter((item) => item.priority === 'HIGH').length,
        blocked: items.filter((item) => item.status === 'BLOCKED').length,
      },
    };
  }

  private async getPaymentLedgerItems(orgId: string): Promise<OperatorWorkflowGroup> {
    const [overdueInvoices, exceptions] = await Promise.all([
      this.prisma.invoice.findMany({
        where: {
          OR: [{ status: 'OVERDUE' }, { dueDate: { lt: new Date() }, status: { not: 'PAID' } }],
          lease: { unit: { property: { organizationId: orgId } } },
        },
        include: { lease: { include: { tenant: true, unit: { include: { property: true } } } } },
        orderBy: { dueDate: 'asc' },
        take: 6,
      }),
      this.prisma.bookkeepingTransaction.findMany({
        where: { organizationId: orgId, status: BookkeepingTransactionStatus.EXCEPTION },
        orderBy: { date: 'desc' },
        take: 4,
      }),
    ]);

    const invoiceItems = overdueInvoices.map((invoice): OperatorWorkflowItem => ({
      id: `invoice:${invoice.id}`,
      workflowId: 'WF-PAY-001',
      title: `Overdue invoice: ${invoice.lease.unit.property.name}`,
      summary: `${this.userLabel(invoice.lease.tenant)} owes $${invoice.amount.toFixed(2)} for ${invoice.description}.`,
      status: 'NEEDS_REVIEW',
      priority: invoice.amount >= 1000 ? 'HIGH' : 'MEDIUM',
      entityType: 'Invoice',
      entityId: String(invoice.id),
      propertyId: invoice.lease.unit.propertyId,
      unitId: invoice.lease.unitId,
      tenantId: invoice.lease.tenantId,
      amountCents: Math.round(invoice.amount * 100),
      dueAt: invoice.dueDate.toISOString(),
      updatedAt: invoice.issuedAt.toISOString(),
      canonicalRoute: '/api/payments/invoices',
      nextAction: 'Verify ledger state and prepare delinquency or payment-plan follow-up.',
    }));

    const exceptionItems = exceptions.map((transaction): OperatorWorkflowItem => ({
      id: `bookkeeping-exception:${transaction.id}`,
      workflowId: 'WF-PAY-001',
      title: `Payment exception: ${transaction.description}`,
      summary: transaction.exceptionReason ?? 'Transaction requires reconciliation review.',
      status: 'BLOCKED',
      priority: Math.abs(transaction.amountCents) >= 100_000 ? 'HIGH' : 'MEDIUM',
      entityType: 'BookkeepingTransaction',
      entityId: transaction.id,
      amountCents: transaction.amountCents,
      dueAt: transaction.date.toISOString(),
      updatedAt: transaction.updatedAt.toISOString(),
      canonicalRoute: '/api/bookkeeping/transactions/exceptions',
      nextAction: 'Resolve exception before posting or owner reporting.',
    }));

    return this.group('WF-PAY-001', 'Tenant payment and reconciliation', [...invoiceItems, ...exceptionItems]);
  }

  private async getMaintenanceItems(orgId: string): Promise<OperatorWorkflowGroup> {
    const requests = await this.prisma.maintenanceRequest.findMany({
      where: {
        property: { organizationId: orgId },
        status: { not: Status.COMPLETED },
      },
      include: { property: true, unit: true },
      orderBy: [{ priority: 'asc' }, { updatedAt: 'desc' }],
      take: 10,
    });

    return this.group(
      'WF-MNT-001',
      'Maintenance request to dispatch',
      requests.map((request): OperatorWorkflowItem => ({
        id: `maintenance:${request.id}`,
        workflowId: 'WF-MNT-001',
        title: request.title,
        summary: request.description,
        status: request.priority === MaintenancePriority.EMERGENCY ? 'BLOCKED' : 'IN_PROGRESS',
        priority: request.priority === MaintenancePriority.EMERGENCY || request.priority === MaintenancePriority.HIGH ? 'HIGH' : 'MEDIUM',
        entityType: 'MaintenanceRequest',
        entityId: request.id,
        propertyId: request.propertyId,
        unitId: request.unitId,
        tenantId: request.authorId,
        dueAt: (request.responseDueAt ?? request.dueAt)?.toISOString() ?? null,
        updatedAt: request.updatedAt.toISOString(),
        canonicalRoute: '/api/maintenance',
        nextAction: 'Triage severity, assign owner, and prepare tenant update.',
      })),
    );
  }

  private async getApplicationItems(orgId: string): Promise<OperatorWorkflowGroup> {
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
      take: 10,
    });

    return this.group(
      'WF-APP-001',
      'Tenant application to lease',
      applications.map((application): OperatorWorkflowItem => ({
        id: `application:${application.id}`,
        workflowId: 'WF-APP-001',
        title: `Application: ${application.fullName}`,
        summary: application.ai_summary ?? `Status is ${application.status.toLowerCase().replace(/_/g, ' ')}.`,
        status: application.status === ApplicationStatus.SCORED ? 'READY' : 'NEEDS_REVIEW',
        priority: application.status === ApplicationStatus.SCORED ? 'HIGH' : 'MEDIUM',
        entityType: 'RentalApplication',
        entityId: String(application.id),
        propertyId: application.propertyId,
        unitId: application.unitId,
        updatedAt: application.updatedAt.toISOString(),
        canonicalRoute: '/api/rental-applications',
        nextAction: 'Review screening evidence and disposition with fair-housing controls.',
      })),
    );
  }

  private async getLeaseHandoffItems(orgId: string): Promise<OperatorWorkflowGroup> {
    const applications = await this.prisma.rentalApplication.findMany({
      where: {
        property: { organizationId: orgId },
        status: { in: [ApplicationStatus.APPROVED, ApplicationStatus.CONDITIONALLY_APPROVED] },
        convertedLeaseId: null,
      },
      include: { property: true, unit: true },
      orderBy: { updatedAt: 'asc' },
      take: 8,
    });

    return this.group(
      'WF-LEASE-001',
      'Approved application to lease signing',
      applications.map((application): OperatorWorkflowItem => ({
        id: `lease-handoff:${application.id}`,
        workflowId: 'WF-LEASE-001',
        title: `Create lease for ${application.fullName}`,
        summary: `${application.property.name} ${application.unit.name} is ready for lease handoff.`,
        status: 'READY',
        priority: 'HIGH',
        entityType: 'RentalApplication',
        entityId: String(application.id),
        propertyId: application.propertyId,
        unitId: application.unitId,
        updatedAt: application.updatedAt.toISOString(),
        canonicalRoute: `/api/rental-applications/${application.id}/convert-to-lease`,
        nextAction: 'Confirm terms, generate lease packet, and route for signature.',
      })),
    );
  }

  private async getInspectionItems(orgId: string): Promise<OperatorWorkflowGroup> {
    const requests = await this.prisma.inspectionRequest.findMany({
      where: {
        property: { organizationId: orgId },
        status: InspectionRequestStatus.PENDING,
      },
      include: { property: true, unit: true },
      orderBy: { createdAt: 'asc' },
      take: 8,
    });

    return this.group(
      'WF-INSP-001',
      'Inspection to repair estimate',
      requests.map((request): OperatorWorkflowItem => ({
        id: `inspection-request:${request.id}`,
        workflowId: 'WF-INSP-001',
        title: `${request.type.toLowerCase().replace(/_/g, ' ')} inspection request`,
        summary: request.notes ?? `${request.property.name} ${request.unit.name} needs inspection review.`,
        status: 'NEEDS_REVIEW',
        priority: request.type === 'EMERGENCY' ? 'HIGH' : 'MEDIUM',
        entityType: 'InspectionRequest',
        entityId: String(request.id),
        propertyId: request.propertyId,
        unitId: request.unitId,
        tenantId: request.tenantId,
        updatedAt: request.updatedAt.toISOString(),
        canonicalRoute: '/api/inspections/requests',
        nextAction: 'Approve, deny, or schedule the inspection with tenant-facing notes.',
      })),
    );
  }

  private async getRenewalItems(orgId: string): Promise<OperatorWorkflowGroup> {
    const now = new Date();
    const leadDate = new Date(now);
    leadDate.setDate(leadDate.getDate() + 75);
    const leases = await this.prisma.lease.findMany({
      where: {
        unit: { property: { organizationId: orgId } },
        status: { in: [LeaseStatus.ACTIVE, LeaseStatus.RENEWAL_PENDING] },
        endDate: { gte: now, lte: leadDate },
      },
      include: {
        tenant: true,
        unit: { include: { property: true } },
        renewalOffers: { where: { status: LeaseRenewalStatus.OFFERED }, take: 1, orderBy: { createdAt: 'desc' } },
      },
      orderBy: { endDate: 'asc' },
      take: 8,
    });

    return this.group(
      'WF-RENEW-001',
      'Renewal offer to signed renewal',
      leases.map((lease): OperatorWorkflowItem => {
        const daysUntilEnd = Math.ceil((lease.endDate.getTime() - now.getTime()) / 86_400_000);
        return {
          id: `renewal:${lease.id}`,
          workflowId: 'WF-RENEW-001',
          title: `Renewal: ${this.userLabel(lease.tenant)}`,
          summary: lease.renewalOffers[0]
            ? 'Renewal offer is outstanding.'
            : `Lease ends in ${daysUntilEnd} day${daysUntilEnd === 1 ? '' : 's'}.`,
          status: lease.renewalOffers[0] ? 'IN_PROGRESS' : 'NEEDS_REVIEW',
          priority: daysUntilEnd <= lease.noticePeriodDays ? 'HIGH' : 'MEDIUM',
          entityType: 'Lease',
          entityId: lease.id,
          propertyId: lease.unit.propertyId,
          unitId: lease.unitId,
          tenantId: lease.tenantId,
          amountCents: Math.round(lease.rentAmount * 100),
          dueAt: lease.endDate.toISOString(),
          updatedAt: lease.updatedAt.toISOString(),
          canonicalRoute: `/api/leases/${lease.id}/renewal-offers`,
          nextAction: 'Review rent, deadline, and offer terms before sending renewal.',
        };
      }),
    );
  }

  private async getOwnerStatementItems(orgId: string): Promise<OperatorWorkflowGroup> {
    const statements = await this.prisma.ownerStatement.findMany({
      where: {
        organizationId: orgId,
        status: { in: [OwnerStatementStatus.DRAFT, OwnerStatementStatus.APPROVED] },
      },
      include: { owner: true },
      orderBy: { updatedAt: 'asc' },
      take: 8,
    });

    return this.group(
      'WF-OWNER-001',
      'Owner statement review',
      statements.map((statement): OperatorWorkflowItem => ({
        id: `owner-statement:${statement.id}`,
        workflowId: 'WF-OWNER-001',
        title: `Owner statement: ${this.userLabel(statement.owner)}`,
        summary: `${statement.month} statement net distribution is ${this.formatCents(statement.netDistributionCents)}.`,
        status: statement.status === OwnerStatementStatus.DRAFT ? 'NEEDS_REVIEW' : 'READY',
        priority: statement.status === OwnerStatementStatus.DRAFT ? 'MEDIUM' : 'LOW',
        entityType: 'OwnerStatement',
        entityId: statement.id,
        ownerId: statement.ownerId,
        amountCents: statement.netDistributionCents,
        updatedAt: statement.updatedAt.toISOString(),
        canonicalRoute: '/api/bookkeeping/owner-statements',
        nextAction: statement.status === OwnerStatementStatus.DRAFT ? 'Review posted entries and approve statement.' : 'Send approved statement.',
      })),
    );
  }

  private group(workflowId: OperatorWorkflowGroup['workflowId'], label: string, items: OperatorWorkflowItem[]): OperatorWorkflowGroup {
    return {
      workflowId,
      label,
      count: items.length,
      items,
    };
  }

  private userLabel(user: { firstName?: string | null; lastName?: string | null; email?: string | null; username?: string | null }) {
    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
    return fullName || user.email || user.username || 'user';
  }

  private formatCents(amountCents: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountCents / 100);
  }
}
