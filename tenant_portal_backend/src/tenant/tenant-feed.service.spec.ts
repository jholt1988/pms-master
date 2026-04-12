import { TenantFeedService } from './tenant-feed.service';

describe('TenantFeedService', () => {
  const prisma: any = {
    lease: { findFirst: jest.fn() },
    maintenanceRequest: { findMany: jest.fn() },
    message: { findMany: jest.fn() },
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('surfaces feed-build failures instead of returning a fake empty feed', async () => {
    const service = new TenantFeedService(prisma);
    prisma.lease.findFirst.mockRejectedValueOnce(new Error('db unavailable'));

    await expect(service.getTenantFeed('tenant-1')).rejects.toThrow('db unavailable');
  });
});
