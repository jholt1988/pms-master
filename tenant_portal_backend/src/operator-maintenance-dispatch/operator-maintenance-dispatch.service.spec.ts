import { MaintenancePriority, Role, Status } from '@prisma/client';
import { OperatorMaintenanceDispatchService } from './operator-maintenance-dispatch.service';

const request = {
  id: 'request-1',
  title: 'Kitchen sink leak',
  description: 'Water leaking under sink',
  status: Status.PENDING,
  priority: MaintenancePriority.HIGH,
  propertyId: 'property-1',
  property: { id: 'property-1', name: 'Oak House' },
  unitId: 'unit-1',
  unit: { id: 'unit-1', unitNumber: '2A', name: null },
  authorId: 'tenant-1',
  author: { id: 'tenant-1', username: 'Taylor Tenant', email: 'tenant@example.com' },
  assigneeId: null,
  assignee: null,
  dueAt: null,
  responseDueAt: new Date('2026-06-04T18:00:00Z'),
  createdAt: new Date('2026-06-04T12:00:00Z'),
  updatedAt: new Date('2026-06-04T12:30:00Z'),
  notes: [],
  photos: [{ id: 1 }],
};

describe('OperatorMaintenanceDispatchService', () => {
  it('returns dispatch workbench metrics with vendors and open bids', async () => {
    const prisma = {
      maintenanceRequest: { findMany: jest.fn().mockResolvedValue([request]) },
      vendor: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'vendor-1', name: 'Pipe Pros', type: 'CONTRACTOR', email: 'v@example.com', phone: null, compliances: [{ status: 'VERIFIED' }] },
        ]),
      },
      contractorBid: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'bid-1',
            maintenanceRequestId: 'request-1',
            propertyId: 'property-1',
            vendorId: 'vendor-1',
            vendorName: 'Pipe Pros',
            vendorEmail: 'v@example.com',
            scope: 'Fix leak',
            status: 'OPEN',
            bidAmountCents: null,
            aiScore: null,
            dueDate: null,
            awardedAt: null,
            responseNotes: null,
            createdAt: new Date('2026-06-04T13:00:00Z'),
          },
        ]),
      },
    };
    const service = new OperatorMaintenanceDispatchService(prisma as any, {} as any, {} as any, {} as any);

    const result = await service.getWorkbench('org-1', { userId: 'actor-1', role: Role.PROPERTY_MANAGER });

    expect(prisma.maintenanceRequest.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ property: { organizationId: 'org-1' } }),
    }));
    expect(result.metrics).toMatchObject({ openRequests: 1, emergencyRequests: 1, bidsOpen: 1, dispatchedRequests: 0 });
    expect(result.requests[0].nextAction).toBe('monitor_vendor');
    expect(result.vendors[0].complianceStatus).toBe('READY');
  });

  it('dispatches a vendor, starts the request, writes note, and records audit', async () => {
    const prisma = {
      maintenanceRequest: {
        findFirst: jest.fn().mockResolvedValue(request),
      },
      vendor: {
        findFirst: jest.fn().mockResolvedValue({ id: 'vendor-1', name: 'Pipe Pros', email: 'v@example.com', compliances: [] }),
      },
      contractorBid: {
        update: jest.fn().mockResolvedValue({
          id: 'bid-1',
          maintenanceRequestId: 'request-1',
          propertyId: 'property-1',
          vendorId: 'vendor-1',
          vendorName: 'Pipe Pros',
          vendorEmail: 'v@example.com',
          scope: 'Emergency leak',
          status: 'AWARDED',
          bidAmountCents: null,
          aiScore: null,
          dueDate: null,
          awardedAt: new Date('2026-06-04T13:00:00Z'),
          responseNotes: 'Emergency leak',
          createdAt: new Date('2026-06-04T13:00:00Z'),
        }),
      },
    };
    const maintenanceService = {
      assignVendor: jest.fn().mockResolvedValue({ success: true }),
      addNoteScoped: jest.fn().mockResolvedValue({ id: 1 }),
      updateStatusScoped: jest.fn().mockResolvedValue({ id: 'request-1', status: Status.IN_PROGRESS }),
      notifyTenant: jest.fn().mockResolvedValue({ success: true }),
    };
    const contractorBiddingService = {
      createBid: jest.fn().mockResolvedValue({ id: 'bid-1' }),
    };
    const auditLogService = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new OperatorMaintenanceDispatchService(prisma as any, maintenanceService as any, contractorBiddingService as any, auditLogService as any);

    const result = await service.dispatchVendor(
      'org-1',
      { userId: 'actor-1', role: Role.PROPERTY_MANAGER },
      'request-1',
      { vendorId: 'vendor-1', notes: 'Emergency leak', notifyTenant: true, tenantMessage: 'Vendor is on the way.' },
    );

    expect(maintenanceService.assignVendor).toHaveBeenCalledWith('request-1', 'vendor-1', 'Emergency leak', 'actor-1', 'org-1');
    expect(contractorBiddingService.createBid).toHaveBeenCalledWith('org-1', expect.objectContaining({
      propertyId: 'property-1',
      maintenanceRequestId: 'request-1',
      vendorId: 'vendor-1',
      scope: 'Emergency leak',
    }));
    expect(prisma.contractorBid.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'bid-1' },
      data: expect.objectContaining({ status: 'AWARDED' }),
    }));
    expect(maintenanceService.updateStatusScoped).toHaveBeenCalledWith(
      'request-1',
      expect.objectContaining({ status: Status.IN_PROGRESS }),
      'actor-1',
      Role.PROPERTY_MANAGER,
      'org-1',
    );
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
      module: 'operator-maintenance-dispatch',
      action: 'VENDOR_DISPATCHED',
      entityId: 'request-1',
    }));
    expect(result.dispatch.status).toBe('AWARDED');
  });

  it('completes an awarded vendor dispatch and writes audit', async () => {
    const prisma = {
      contractorBid: {
        update: jest.fn().mockResolvedValue({
          id: 'bid-1',
          maintenanceRequestId: 'request-1',
          propertyId: 'property-1',
          vendorId: 'vendor-1',
          vendorName: 'Pipe Pros',
          vendorEmail: 'v@example.com',
          scope: 'Fix leak',
          status: 'COMPLETED',
          bidAmountCents: null,
          aiScore: null,
          dueDate: null,
          awardedAt: new Date('2026-06-04T13:00:00Z'),
          responseNotes: 'Work finished',
          createdAt: new Date('2026-06-04T13:00:00Z'),
        }),
      },
    };
    const maintenanceService = {
      addNoteScoped: jest.fn().mockResolvedValue({ id: 1 }),
      updateStatusScoped: jest.fn().mockResolvedValue({ id: 'request-1', status: Status.COMPLETED }),
    };
    const contractorBiddingService = {
      getBid: jest.fn().mockResolvedValue({
        id: 'bid-1',
        maintenanceRequestId: 'request-1',
        vendorId: 'vendor-1',
        vendorName: 'Pipe Pros',
        status: 'AWARDED',
      }),
    };
    const auditLogService = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new OperatorMaintenanceDispatchService(prisma as any, maintenanceService as any, contractorBiddingService as any, auditLogService as any);

    const result = await service.completeDispatch(
      'org-1',
      { userId: 'actor-1', role: Role.PROPERTY_MANAGER },
      'bid-1',
      { note: 'Work finished', completeRequest: true },
    );

    expect(prisma.contractorBid.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'bid-1' },
      data: expect.objectContaining({ status: 'COMPLETED', responseNotes: 'Work finished' }),
    }));
    expect(maintenanceService.updateStatusScoped).toHaveBeenCalledWith(
      'request-1',
      expect.objectContaining({ status: Status.COMPLETED }),
      'actor-1',
      Role.PROPERTY_MANAGER,
      'org-1',
    );
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'VENDOR_DISPATCH_COMPLETED',
      entityId: 'request-1',
    }));
    expect(result.status).toBe('COMPLETED');
  });
});
