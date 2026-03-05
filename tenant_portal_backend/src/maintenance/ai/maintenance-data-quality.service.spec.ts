import { MaintenanceDataQualityService } from './maintenance-data-quality.service';

describe('MaintenanceDataQualityService', () => {
  it('returns totals and KPI rates from prisma counts', async () => {
    const prisma: any = {
      maintenanceAsset: { count: jest.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(2) },
      maintenanceRequest: {
        count: jest
          .fn()
          .mockResolvedValueOnce(20)
          .mockResolvedValueOnce(8)
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(4),
      },
      maintenanceRequestHistory: { count: jest.fn().mockResolvedValueOnce(16).mockResolvedValueOnce(3) },
      maintenanceNote: { count: jest.fn().mockResolvedValue(9) },
      maintenancePhoto: { count: jest.fn().mockResolvedValue(11) },
      $queryRaw: jest.fn().mockResolvedValue([{ count: BigInt(2) }]),
    };

    const service = new MaintenanceDataQualityService(prisma);
    const report = await service.getReport();

    expect(report.totals.assets).toBe(10);
    expect(report.totals.requests).toBe(20);
    expect(report.kpis.assetsMissingInstallDate).toEqual({ count: 2, rate: 0.2 });
    expect(report.kpis.completedRequestsMissingCompletedAt).toEqual({ count: 1, rate: 0.125 });
    expect(report.kpis.completedAtBeforeCreatedAt).toEqual({ count: 2, rate: 0.1 });
    expect(report.kpis.requestsMissingPropertyUnitLeaseLinkage).toEqual({ count: 4, rate: 0.2 });
    expect(report.kpis.historyMissingActor).toEqual({ count: 3, rate: 0.1875 });
    expect(typeof report.generatedAt).toBe('string');
    expect(prisma.$queryRaw).toHaveBeenCalledTimes(1);
  });

  it('guards against divide-by-zero totals', async () => {
    const prisma: any = {
      maintenanceAsset: { count: jest.fn().mockResolvedValue(0) },
      maintenanceRequest: { count: jest.fn().mockResolvedValue(0) },
      maintenanceRequestHistory: { count: jest.fn().mockResolvedValue(0) },
      maintenanceNote: { count: jest.fn().mockResolvedValue(0) },
      maintenancePhoto: { count: jest.fn().mockResolvedValue(0) },
      $queryRaw: jest.fn().mockResolvedValue([{ count: BigInt(0) }]),
    };

    const service = new MaintenanceDataQualityService(prisma);
    const report = await service.getReport();

    expect(report.kpis.assetsMissingInstallDate).toEqual({ count: 0, rate: 0 });
    expect(report.kpis.completedRequestsMissingCompletedAt).toEqual({ count: 0, rate: 0 });
    expect(report.kpis.completedAtBeforeCreatedAt).toEqual({ count: 0, rate: 0 });
    expect(report.kpis.requestsMissingPropertyUnitLeaseLinkage).toEqual({ count: 0, rate: 0 });
    expect(report.kpis.historyMissingActor).toEqual({ count: 0, rate: 0 });
  });
});
