import { NotFoundException } from '@nestjs/common';
import { PropertyService } from './property.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PropertyService - search and saved filters', () => {
  let service: PropertyService;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(() => {
    prisma = {
      property: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, name: 'Test Property' }]),
        count: jest.fn().mockResolvedValue(1),
      },
      propertyMarketingProfile: {
        upsert: jest.fn(),
      },
      propertyPhoto: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      propertyAmenity: {
        deleteMany: jest.fn(),
        createMany: jest.fn(),
      },
      amenity: {
        upsert: jest.fn().mockResolvedValue({ id: 1 }),
      },
      savedPropertyFilter: {
        findMany: jest.fn(),
        create: jest.fn(),
        findUnique: jest.fn(),
        delete: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    service = new PropertyService(prisma);
  });

  it('applies complex filters and returns paginated results', async () => {
    const response = await service.searchProperties({
      searchTerm: 'Loft',
      cities: ['Austin'],
      states: ['TX'],
      propertyTypes: ['Loft'],
      amenityKeys: ['pool', 'gym'],
      minRent: 1500,
      maxRent: 3200,
      bedroomsMin: 2,
      bathroomsMin: 2,
      sortBy: 'price',
      sortOrder: 'asc',
      page: 2,
      pageSize: 5,
    });

    expect(prisma.property.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 5,
        take: 5,
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({ city: { in: ['Austin'] } }),
            expect.objectContaining({ state: { in: ['TX'] } }),
          ]),
        }),
      }),
    );
    expect(response.total).toBe(1);
    expect(response.page).toBe(2);
  });

  it('saves normalized filter payloads for reuse', async () => {
    (prisma.savedPropertyFilter.create as jest.Mock).mockResolvedValue({ id: 99 });

    await service.savePropertyFilter(5, {
      name: 'Luxury Units',
      filters: {
        searchTerm: 'Downtown',
        tags: ['Luxury ', ' skyline '],
        minRent: 3000,
      },
    });

    expect(prisma.savedPropertyFilter.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Luxury Units',
          userId: 5,
          filters: expect.objectContaining({
            searchTerm: 'Downtown',
            tags: ['luxury', 'skyline'],
            minRent: 3000,
          }),
        }),
      }),
    );
  });

  it('prevents deleting filters that belong to other users', async () => {
    (prisma.savedPropertyFilter.findUnique as jest.Mock).mockResolvedValue({ id: 1, userId: 9 });

    await expect(service.deleteSavedFilter(4, 1)).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.savedPropertyFilter.delete).not.toHaveBeenCalled();
  });
});
