import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { InspectionService } from './inspection.service';

describe('InspectionService request/start workflow', () => {
  const prisma: any = {
    lease: { findUnique: jest.fn() },
    unitInspection: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    inspectionRequest: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  };

  const service = new InspectionService(
    prisma as any,
    { sendNotificationEmail: jest.fn() } as any,
    { runV16Analysis: jest.fn() } as any,
  );

  beforeEach(() => jest.clearAllMocks());

  it('tenant can create move-in request with active lease', async () => {
    prisma.lease.findUnique.mockResolvedValue({
      id: 'lease-1',
      status: 'ACTIVE',
      unitId: 'unit-1',
      unit: { propertyId: 'prop-1', property: { organizationId: 'org-1' } },
    });
    prisma.inspectionRequest.findFirst.mockResolvedValue(null);
    prisma.inspectionRequest.create.mockResolvedValue({ id: 10, status: 'PENDING' });

    const result = await service.createInspectionRequest(
      { type: 'MOVE_IN', notes: 'Please approve' },
      { userId: 'tenant-1', role: 'TENANT' },
      'org-1',
    );

    expect(result.id).toBe(10);
    expect(prisma.inspectionRequest.create).toHaveBeenCalled();
  });

  it('blocks non-tenant request creation', async () => {
    await expect(
      service.createInspectionRequest({ type: 'MOVE_IN' }, { userId: 'pm-1', role: 'PROPERTY_MANAGER' }, 'org-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('start requires approved request', async () => {
    prisma.inspectionRequest.findFirst.mockResolvedValue({ id: 1, status: 'PENDING' });

    await expect(
      service.startApprovedInspection({ requestId: 1 }, { userId: 'tenant-1', role: 'TENANT' }, 'org-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('approving request restricted to PM/Admin', async () => {
    await expect(
      service.decideInspectionRequest(1, { decision: 'APPROVED' }, { userId: 'tenant-1', role: 'TENANT' }, 'org-1'),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
