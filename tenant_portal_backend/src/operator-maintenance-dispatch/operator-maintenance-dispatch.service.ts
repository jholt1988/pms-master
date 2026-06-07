import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { BidStatus, MaintenancePriority, Role, Status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { MaintenanceService } from '../maintenance/maintenance.service';
import { ContractorBiddingService } from '../contractor-bidding/contractor-bidding.service';
import { AuditLogService } from '../shared/audit-log.service';
import {
  AwardVendorBidPayload,
  CompleteVendorDispatchPayload,
  DispatchVendorPayload,
  OperatorContractorBidSummary,
  OperatorMaintenanceDispatchActor,
  OperatorMaintenanceDispatchItem,
  OperatorMaintenanceDispatchWorkbench,
  OperatorVendorSummary,
  RejectVendorBidPayload,
  RequestBidPayload,
} from './operator-maintenance-dispatch.types';

type MaintenanceWithRelations = Awaited<ReturnType<OperatorMaintenanceDispatchService['findRequests']>>[number];
type VendorWithCompliance = Awaited<ReturnType<OperatorMaintenanceDispatchService['findVendors']>>[number];
type BidRecord = Awaited<ReturnType<OperatorMaintenanceDispatchService['findBids']>>[number];

@Injectable()
export class OperatorMaintenanceDispatchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly maintenanceService: MaintenanceService,
    private readonly contractorBiddingService: ContractorBiddingService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getWorkbench(
    orgId: string,
    _actor: OperatorMaintenanceDispatchActor,
    options: { propertyId?: string; priority?: MaintenancePriority; limit?: number } = {},
  ): Promise<OperatorMaintenanceDispatchWorkbench> {
    const limit = Math.min(Math.max(options.limit ?? 50, 1), 100);
    const [requests, vendors, bids] = await Promise.all([
      this.findRequests(orgId, options.propertyId, options.priority, limit),
      this.findVendors(orgId),
      this.findBids(orgId, options.propertyId),
    ]);
    const bidMap = new Map<string, BidRecord[]>();
    for (const bid of bids) {
      if (!bid.maintenanceRequestId) continue;
      bidMap.set(bid.maintenanceRequestId, [...(bidMap.get(bid.maintenanceRequestId) ?? []), bid]);
    }
    const items = requests.map((request) => this.mapRequest(request, bidMap.get(request.id) ?? []));
    const mappedBids = bids.filter((bid) => bid.status === BidStatus.OPEN || bid.status === BidStatus.BID_RECEIVED).map((bid) => this.mapBid(bid));

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        openRequests: items.length,
        emergencyRequests: items.filter((item) => item.priority === MaintenancePriority.HIGH).length,
        unassignedRequests: items.filter((item) => !item.assigneeId).length,
        vendorReadyRequests: items.filter((item) => item.nextAction === 'dispatch_vendor').length,
        bidsOpen: mappedBids.length,
        dispatchedRequests: items.filter((item) => item.latestDispatch && item.latestDispatch.status === BidStatus.AWARDED).length,
        completedDispatches: items.filter((item) => item.latestDispatch && item.latestDispatch.status === BidStatus.COMPLETED).length,
        dispatchBlocked: items.filter((item) => item.blockers.length > 0).length,
      },
      requests: items,
      vendors: vendors.map((vendor) => this.mapVendor(vendor)),
      openBids: mappedBids,
      sourceLinks: [
        { label: 'Canonical maintenance API', href: '/api/maintenance', entityType: 'MaintenanceRequest' },
        { label: 'Canonical vendors API', href: '/api/vendors', entityType: 'Vendor' },
        { label: 'Canonical contractor bidding API', href: '/api/contractor-bidding/bids', entityType: 'ContractorBid' },
      ],
    };
  }

  async dispatchVendor(orgId: string, actor: OperatorMaintenanceDispatchActor, requestId: string, payload: DispatchVendorPayload) {
    const [request, vendor] = await Promise.all([
      this.getRequestInOrg(orgId, requestId),
      this.prisma.vendor.findFirst({ where: { id: payload.vendorId, organizationId: orgId }, include: { compliances: true } }),
    ]);
    if (!vendor) throw new NotFoundException('Vendor not found.');
    if (request.status === Status.COMPLETED) throw new BadRequestException('Cannot dispatch vendor to completed request.');
    if (!request.propertyId) throw new BadRequestException('Maintenance request must have a property before dispatching a vendor.');

    const result = await this.maintenanceService.assignVendor(requestId, payload.vendorId, payload.notes, actor.userId, orgId);
    const createdBid = await this.contractorBiddingService.createBid(orgId, {
      propertyId: request.propertyId,
      maintenanceRequestId: requestId,
      vendorId: vendor.id,
      vendorName: vendor.name,
      vendorEmail: vendor.email,
      scope: payload.notes?.trim() || request.description,
    });
    const dispatch = await this.prisma.contractorBid.update({
      where: { id: createdBid.id },
      data: {
        status: BidStatus.AWARDED,
        awardedAt: new Date(),
        responseNotes: payload.notes?.trim() || null,
      },
    });
    await this.maintenanceService.addNoteScoped(
      requestId,
      { body: `Vendor dispatched: ${vendor.name}. ${payload.notes?.trim() || ''}`.trim() },
      actor.userId,
      actor.role,
      orgId,
    );
    if (request.status === Status.PENDING) {
      await this.maintenanceService.updateStatusScoped(
        requestId,
        { status: Status.IN_PROGRESS, note: `Vendor dispatch started: ${vendor.name}` },
        actor.userId,
        actor.role,
        orgId,
      );
    }
    if (payload.notifyTenant && payload.tenantMessage?.trim()) {
      await this.maintenanceService.notifyTenant(requestId, payload.tenantMessage.trim(), actor.userId, orgId);
    }
    await this.recordAudit(orgId, actor.userId, 'VENDOR_DISPATCHED', requestId, {
      bidId: dispatch.id,
      vendorId: vendor.id,
      vendorName: vendor.name,
      tenantNotified: Boolean(payload.notifyTenant && payload.tenantMessage?.trim()),
    });
    return { assignment: result, dispatch: this.mapBid(dispatch) };
  }

  async requestBid(orgId: string, actor: OperatorMaintenanceDispatchActor, requestId: string, payload: RequestBidPayload) {
    const request = await this.getRequestInOrg(orgId, requestId);
    if (!request.propertyId) throw new BadRequestException('Maintenance request must have a property before requesting vendor bids.');
    const vendor = payload.vendorId
      ? await this.prisma.vendor.findFirst({ where: { id: payload.vendorId, organizationId: orgId } })
      : null;
    if (payload.vendorId && !vendor) throw new NotFoundException('Vendor not found.');

    const bid = await this.contractorBiddingService.createBid(orgId, {
      propertyId: request.propertyId,
      maintenanceRequestId: requestId,
      vendorId: payload.vendorId,
      vendorName: payload.vendorName ?? vendor?.name,
      vendorEmail: payload.vendorEmail ?? vendor?.email,
      scope: payload.scope ?? request.description,
      bidAmountCents: payload.bidAmountCents,
      dueDate: payload.dueDate,
    });
    await this.maintenanceService.addNoteScoped(
      requestId,
      { body: `Vendor bid requested${vendor?.name ? ` from ${vendor.name}` : ''}: ${payload.scope ?? request.title}` },
      actor.userId,
      actor.role,
      orgId,
    );
    await this.recordAudit(orgId, actor.userId, 'VENDOR_BID_REQUESTED', requestId, {
      bidId: bid.id,
      vendorId: payload.vendorId ?? null,
    });
    return bid;
  }

  async awardBid(orgId: string, actor: OperatorMaintenanceDispatchActor, bidId: string, payload: AwardVendorBidPayload = {}) {
    const existing = await this.contractorBiddingService.getBid(orgId, bidId);
    if (!existing.maintenanceRequestId) throw new BadRequestException('Bid is not linked to a maintenance request.');
    const request = await this.getRequestInOrg(orgId, existing.maintenanceRequestId);
    if (request.status === Status.COMPLETED) throw new BadRequestException('Cannot award a bid for a completed request.');

    const awarded = await this.contractorBiddingService.awardBid(orgId, bidId);
    await this.maintenanceService.addNoteScoped(
      existing.maintenanceRequestId,
      { body: `Vendor bid awarded: ${existing.vendorName ?? 'Vendor'}. ${payload.note?.trim() || ''}`.trim() },
      actor.userId,
      actor.role,
      orgId,
    );
    if (request.status === Status.PENDING) {
      await this.maintenanceService.updateStatusScoped(
        existing.maintenanceRequestId,
        { status: Status.IN_PROGRESS, note: `Vendor award started: ${existing.vendorName ?? 'Vendor'}` },
        actor.userId,
        actor.role,
        orgId,
      );
    }
    if (payload.notifyTenant && payload.tenantMessage?.trim()) {
      await this.maintenanceService.notifyTenant(existing.maintenanceRequestId, payload.tenantMessage.trim(), actor.userId, orgId);
    }
    await this.recordAudit(orgId, actor.userId, 'VENDOR_BID_AWARDED', existing.maintenanceRequestId, {
      bidId,
      vendorId: existing.vendorId ?? null,
      tenantNotified: Boolean(payload.notifyTenant && payload.tenantMessage?.trim()),
    });
    return this.mapBid(awarded as BidRecord);
  }

  async completeDispatch(orgId: string, actor: OperatorMaintenanceDispatchActor, bidId: string, payload: CompleteVendorDispatchPayload = {}) {
    const existing = await this.contractorBiddingService.getBid(orgId, bidId);
    if (!existing.maintenanceRequestId) throw new BadRequestException('Dispatch is not linked to a maintenance request.');
    if (existing.status !== BidStatus.AWARDED && existing.status !== BidStatus.COMPLETED) {
      throw new BadRequestException('Only awarded dispatches can be completed.');
    }

    const note = payload.note?.trim() || 'Vendor dispatch completed.';
    const completed = await this.prisma.contractorBid.update({
      where: { id: bidId },
      data: {
        status: BidStatus.COMPLETED,
        responseNotes: note,
      },
    });
    await this.maintenanceService.addNoteScoped(
      existing.maintenanceRequestId,
      { body: `Vendor dispatch completed: ${existing.vendorName ?? 'Vendor'}. ${note}` },
      actor.userId,
      actor.role,
      orgId,
    );
    if (payload.completeRequest) {
      await this.maintenanceService.updateStatusScoped(
        existing.maintenanceRequestId,
        { status: Status.COMPLETED, note },
        actor.userId,
        actor.role,
        orgId,
      );
    }
    await this.recordAudit(orgId, actor.userId, 'VENDOR_DISPATCH_COMPLETED', existing.maintenanceRequestId, {
      bidId,
      vendorId: existing.vendorId ?? null,
      maintenanceRequestCompleted: Boolean(payload.completeRequest),
    });
    return this.mapBid(completed);
  }

  async rejectBid(orgId: string, actor: OperatorMaintenanceDispatchActor, bidId: string, payload: RejectVendorBidPayload = {}) {
    const existing = await this.contractorBiddingService.getBid(orgId, bidId);
    if (!existing.maintenanceRequestId) throw new BadRequestException('Bid is not linked to a maintenance request.');
    const rejected = await this.contractorBiddingService.rejectBid(orgId, bidId);
    await this.maintenanceService.addNoteScoped(
      existing.maintenanceRequestId,
      { body: `Vendor bid rejected: ${existing.vendorName ?? 'Vendor'}. ${payload.reason?.trim() || ''}`.trim() },
      actor.userId,
      actor.role,
      orgId,
    );
    await this.recordAudit(orgId, actor.userId, 'VENDOR_BID_REJECTED', existing.maintenanceRequestId, {
      bidId,
      vendorId: existing.vendorId ?? null,
      reason: payload.reason?.trim() || null,
    });
    return this.mapBid(rejected as BidRecord);
  }

  private async findRequests(orgId: string, propertyId?: string, priority?: MaintenancePriority, limit = 50) {
    return this.prisma.maintenanceRequest.findMany({
      where: {
        status: { not: Status.COMPLETED },
        ...(priority ? { priority } : {}),
        property: {
          organizationId: orgId,
          ...(propertyId ? { id: propertyId } : {}),
        },
      },
      include: {
        author: { select: { id: true, username: true, email: true } },
        property: { select: { id: true, name: true } },
        unit: { select: { id: true, unitNumber: true, name: true } },
        assignee: { select: { id: true, name: true, role: true, email: true, phone: true } },
        notes: { orderBy: { createdAt: 'desc' }, take: 3 },
        photos: { orderBy: { createdAt: 'desc' }, take: 3 },
      },
      orderBy: [{ priority: 'desc' }, { dueAt: 'asc' }, { createdAt: 'desc' }],
      take: limit,
    });
  }

  private async findVendors(orgId: string) {
    return this.prisma.vendor.findMany({
      where: { organizationId: orgId },
      include: { compliances: true },
      orderBy: { name: 'asc' },
    });
  }

  private async findBids(orgId: string, propertyId?: string) {
    return this.prisma.contractorBid.findMany({
      where: {
        property: { organizationId: orgId },
        ...(propertyId ? { propertyId } : {}),
        status: { in: [BidStatus.OPEN, BidStatus.BID_RECEIVED, BidStatus.AWARDED, BidStatus.COMPLETED] },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  private async getRequestInOrg(orgId: string, requestId: string) {
    const request = await this.prisma.maintenanceRequest.findFirst({
      where: { id: requestId, property: { organizationId: orgId } },
      include: { property: true, unit: true, author: true },
    });
    if (!request) throw new NotFoundException('Maintenance request not found.');
    return request;
  }

  private mapRequest(request: MaintenanceWithRelations, bids: BidRecord[]): OperatorMaintenanceDispatchItem {
    const blockers = [
      request.propertyId ? null : 'Property is missing.',
      request.status === Status.COMPLETED ? 'Request is already completed.' : null,
    ].filter(Boolean) as string[];
    const latestBid = bids[0] ? this.mapBid(bids[0]) : null;
    const dispatchHistory = bids
      .filter((bid) => bid.status === BidStatus.AWARDED || bid.status === BidStatus.COMPLETED)
      .map((bid) => this.mapBid(bid));
    const latestDispatch = dispatchHistory[0] ?? null;

    return {
      requestId: request.id,
      title: request.title,
      description: request.description,
      status: request.status,
      priority: request.priority,
      propertyId: request.propertyId ?? null,
      propertyName: request.property?.name ?? null,
      unitId: request.unitId ?? null,
      unitLabel: request.unit?.unitNumber ?? request.unit?.name ?? null,
      tenantId: request.authorId,
      tenantName: request.author?.username ?? 'Tenant',
      assigneeId: request.assigneeId ?? null,
      assigneeName: request.assignee?.name ?? null,
      dueAt: request.dueAt?.toISOString() ?? null,
      responseDueAt: request.responseDueAt?.toISOString() ?? null,
      createdAt: request.createdAt.toISOString(),
      updatedAt: request.updatedAt.toISOString(),
      notesCount: request.notes.length,
      photosCount: request.photos.length,
      bidsCount: bids.length,
      latestBid,
      latestDispatch,
      dispatchHistory,
      nextAction: this.getNextAction(request, bids, blockers),
      blockers,
      canonicalRoute: `/api/operator-maintenance-dispatch/requests/${request.id}`,
    };
  }

  private mapVendor(vendor: VendorWithCompliance): OperatorVendorSummary {
    const verified = vendor.compliances.filter((item) => item.status === 'VERIFIED').length;
    const expired = vendor.compliances.filter((item) => item.status === 'EXPIRED').length;
    return {
      id: vendor.id,
      name: vendor.name,
      type: vendor.type,
      email: vendor.email ?? null,
      phone: vendor.phone ?? null,
      verifiedComplianceCount: verified,
      expiredComplianceCount: expired,
      complianceStatus: expired > 0 ? 'BLOCKED' : verified > 0 ? 'READY' : 'REVIEW',
    };
  }

  private mapBid(bid: BidRecord): OperatorContractorBidSummary {
    return {
      id: bid.id,
      maintenanceRequestId: bid.maintenanceRequestId ?? null,
      propertyId: bid.propertyId,
      vendorId: bid.vendorId ?? null,
      vendorName: bid.vendorName ?? null,
      vendorEmail: bid.vendorEmail ?? null,
      scope: bid.scope,
      status: bid.status,
      bidAmountCents: bid.bidAmountCents ?? null,
      aiScore: bid.aiScore ?? null,
      dueDate: bid.dueDate?.toISOString() ?? null,
      awardedAt: bid.awardedAt?.toISOString() ?? null,
      responseNotes: bid.responseNotes ?? null,
      createdAt: bid.createdAt.toISOString(),
    };
  }

  private getNextAction(request: MaintenanceWithRelations, bids: BidRecord[], blockers: string[]) {
    if (blockers.length > 0) return 'blocked';
    if (request.status === Status.COMPLETED) return 'complete';
    if (bids.some((bid) => bid.status === BidStatus.AWARDED)) return 'monitor_vendor';
    if (bids.some((bid) => bid.status === BidStatus.OPEN || bid.status === BidStatus.BID_RECEIVED)) return 'monitor_vendor';
    if (!request.assigneeId && request.priority !== MaintenancePriority.HIGH) return 'assign_technician';
    if (request.priority === MaintenancePriority.HIGH || !request.assigneeId) return 'dispatch_vendor';
    return 'triage';
  }

  private async recordAudit(orgId: string, actorId: string, action: string, requestId: string, metadata: Record<string, unknown>) {
    await this.auditLogService.record({
      orgId,
      actorId,
      module: 'operator-maintenance-dispatch',
      action,
      entityType: 'MaintenanceRequest',
      entityId: requestId,
      result: 'SUCCESS',
      metadata,
    });
  }
}
