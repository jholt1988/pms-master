import { NotFoundException } from '@nestjs/common';
import { ToursService } from './tours.service';

/**
 * Org-isolation regression tests for ToursService. Tours are scoped to an
 * organization via their property (property.organizationId), so a caller must
 * never read or mutate a tour outside their org.
 */
describe('ToursService org scoping', () => {
  let service: ToursService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      tour: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        update: jest.fn(),
      },
    };
    const emailService = {} as any;
    service = new ToursService(prisma, emailService);
  });

  it('getTourById uses an org-scoped findFirst when orgId is provided', async () => {
    prisma.tour.findFirst.mockResolvedValue(null);

    const result = await service.getTourById('tour-1', 'org-1');

    expect(result).toBeNull();
    expect(prisma.tour.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'tour-1', property: { organizationId: 'org-1' } },
      }),
    );
    expect(prisma.tour.findUnique).not.toHaveBeenCalled();
  });

  it('getTours scopes the query by organization', async () => {
    await service.getTours({}, 'org-1');

    expect(prisma.tour.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ property: { organizationId: 'org-1' } }),
      }),
    );
  });

  it('assignTour rejects a cross-org tour with NotFound', async () => {
    prisma.tour.findFirst.mockResolvedValue(null);

    await expect(service.assignTour('tour-x', 'user-1', 'org-1')).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(prisma.tour.update).not.toHaveBeenCalled();
  });

  it('updateTourStatus rejects a cross-org tour with NotFound', async () => {
    prisma.tour.findFirst.mockResolvedValue(null);

    await expect(
      service.updateTourStatus('tour-x', 'COMPLETED', undefined, 'org-1'),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.tour.update).not.toHaveBeenCalled();
  });
});
