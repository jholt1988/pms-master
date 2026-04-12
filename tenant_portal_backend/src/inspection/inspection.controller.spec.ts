import { InspectionController } from './inspection.controller';

describe('InspectionController', () => {
  const inspectionService = {
    getInspections: jest.fn(),
  };

  const estimateService = {};

  let controller: InspectionController;

  beforeEach(() => {
    inspectionService.getInspections.mockReset();
    controller = new InspectionController(inspectionService as any, estimateService as any);
  });

  it('returns both normalized and back-compat inspection list shapes', async () => {
    inspectionService.getInspections.mockResolvedValueOnce({
      inspections: [{ id: 1, type: 'MOVE_IN', status: 'SCHEDULED', createdAt: '2026-04-13T00:00:00.000Z' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
    });

    await expect(
      controller.getInspections({ status: 'SCHEDULED' } as any, {
        user: { userId: 'tenant-1', role: 'TENANT' },
        org: { orgId: 'org-1' },
      } as any),
    ).resolves.toEqual({
      inspections: [{ id: 1, type: 'MOVE_IN', status: 'SCHEDULED', createdAt: '2026-04-13T00:00:00.000Z' }],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      data: [{ id: 1, type: 'MOVE_IN', status: 'SCHEDULED', createdAt: '2026-04-13T00:00:00.000Z' }],
      items: [{ id: 1, type: 'MOVE_IN', status: 'SCHEDULED', createdAt: '2026-04-13T00:00:00.000Z' }],
      meta: { total: 1, page: 1, limit: 20, totalPages: 1 },
    });
  });
});
