import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, PropertyAvailabilityStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreatePropertyDto,
  UpdatePropertyMarketingDto,
  PropertyAmenityDto,
  PropertyPhotoDto,
  PropertySearchQueryDto,
  SavePropertyFilterDto,
  PropertySortOption,
} from './dto/property.dto';

type SortDirection = 'asc' | 'desc';

interface NormalizedSearchFilters {
  searchTerm?: string;
  cities?: string[];
  states?: string[];
  propertyTypes?: string[];
  availabilityStatuses?: PropertyAvailabilityStatus[];
  amenityKeys?: string[];
  tags?: string[];
  minRent?: number;
  maxRent?: number;
  bedroomsMin?: number;
  bedroomsMax?: number;
  bathroomsMin?: number;
  bathroomsMax?: number;
  sortBy: PropertySortOption;
  sortOrder: SortDirection;
  page: number;
  pageSize: number;
}

const MAX_PAGE_SIZE = 50;
const DEFAULT_PAGE_SIZE = 12;

@Injectable()
export class PropertyService {
  constructor(private prisma: PrismaService) {}

  async createProperty(dto: CreatePropertyDto) {
    try {
      return await this.prisma.property.create({
        data: {
          name: dto.name,
          address: dto.address,
          city: dto.city,
          state: dto.state,
          zipCode: dto.zipCode,
          country: dto.country,
          propertyType: dto.propertyType,
          description: dto.description,
          latitude: dto.latitude,
          longitude: dto.longitude,
          bedrooms: dto.bedrooms,
          bathrooms: dto.bathrooms,
          minRent: dto.minRent,
          maxRent: dto.maxRent,
          yearBuilt: dto.yearBuilt,
          tags: dto.tags?.map((tag) => tag.trim().toLowerCase()).filter((tag) => tag.length > 0) ?? [],
        },
        include: {
          units: true,
        },
      });
    } catch (error) {
      console.error('Error creating property:', error);
      throw new BadRequestException('Failed to create property. Please check your input.');
    }
  }

  async createUnit(propertyId: number, name: string) {
    // Verify property exists
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    try {
      return await this.prisma.unit.create({
        data: {
          propertyId,
          name,
        },
        include: {
          property: true,
        },
      });
    } catch (error) {
      console.error('Error creating unit:', error);
      throw new BadRequestException('Failed to create unit. Please check your input.');
    }
  }

  async getAllProperties() {
    return this.prisma.property.findMany({
      include: {
        units: true,
        marketingProfile: true,
        photos: {
          orderBy: { displayOrder: 'asc' },
        },
        amenities: {
          include: { amenity: true },
        },
      },
    });
  }

  async getPropertyById(id: number) {
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        units: true,
      },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${id} not found`);
    }

    return property;
  }

  async getMarketingProfile(propertyId: number) {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        marketingProfile: true,
        photos: { orderBy: { displayOrder: 'asc' } },
        amenities: { include: { amenity: true } },
        units: true,
      },
    });

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    return {
      property: {
        id: property.id,
        name: property.name,
        address: property.address,
      },
      marketingProfile: property.marketingProfile,
      photos: property.photos,
      amenities: property.amenities.map((amenity) => ({
        id: amenity.amenityId,
        key: amenity.amenity.key,
        label: amenity.amenity.label,
        description: amenity.amenity.description,
        category: amenity.amenity.category,
        isFeatured: amenity.isFeatured,
        value: amenity.value,
      })),
      unitCount: property.units.length,
    };
  }

  async updateMarketingProfile(propertyId: number, dto: UpdatePropertyMarketingDto) {
    const property = await this.prisma.property.findUnique({ where: { id: propertyId } });

    if (!property) {
      throw new NotFoundException(`Property with ID ${propertyId} not found`);
    }

    const { photos, amenities, availableOn, ...profileFields } = dto;

    await this.prisma.propertyMarketingProfile.upsert({
      where: { propertyId },
      create: {
        propertyId,
        ...profileFields,
        availableOn: availableOn ? new Date(availableOn) : undefined,
      },
      update: {
        ...profileFields,
        availableOn: availableOn ? new Date(availableOn) : undefined,
      },
    });

    const propertyUpdate: Prisma.PropertyUpdateInput = {};
    if (dto.minRent !== undefined) {
      propertyUpdate.minRent = dto.minRent;
    }
    if (dto.maxRent !== undefined) {
      propertyUpdate.maxRent = dto.maxRent;
    }
    if (dto.marketingDescription) {
      propertyUpdate.description = dto.marketingDescription;
    }

    if (Object.keys(propertyUpdate).length) {
      await this.prisma.property.update({ where: { id: propertyId }, data: propertyUpdate });
    }

    if (photos) {
      await this.replacePhotos(propertyId, photos);
    }

    if (amenities) {
      await this.replaceAmenities(propertyId, amenities);
    }

    return this.getMarketingProfile(propertyId);
  }

  async searchProperties(filters: PropertySearchQueryDto) {
    const normalized = this.normalizeSearchFilters(filters);
    const where = this.buildSearchWhere(normalized);
    const orderBy = this.buildSortOrder(normalized.sortBy, normalized.sortOrder);

    const [items, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        include: {
          marketingProfile: true,
          photos: { orderBy: { displayOrder: 'asc' } },
          amenities: { include: { amenity: true } },
        },
        skip: (normalized.page - 1) * normalized.pageSize,
        take: normalized.pageSize,
        orderBy,
      }),
      this.prisma.property.count({ where }),
    ]);

    const totalPages = total > 0 ? Math.ceil(total / normalized.pageSize) : 0;

    return {
      items,
      total,
      page: normalized.page,
      pageSize: normalized.pageSize,
      totalPages,
      sortBy: normalized.sortBy,
      sortOrder: normalized.sortOrder,
    };
  }

  async getSavedFilters(userId: number) {
    return this.prisma.savedPropertyFilter.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async savePropertyFilter(userId: number, dto: SavePropertyFilterDto) {
    const normalized = this.normalizeSearchFilters(dto.filters ?? new PropertySearchQueryDto());
    const { page, pageSize, ...rest } = normalized;
    const { sortBy, sortOrder, ...filtersToPersist } = rest;
    const sanitizedFilters = this.sanitizeFilterPayload(filtersToPersist);

    return this.prisma.savedPropertyFilter.create({
      data: {
        name: dto.name,
        description: dto.description,
        filters: sanitizedFilters,
        sortBy,
        sortOrder,
        userId,
      },
    });
  }

  async deleteSavedFilter(userId: number, filterId: number) {
    const existing = await this.prisma.savedPropertyFilter.findUnique({
      where: { id: filterId },
      select: { id: true, userId: true },
    });

    if (!existing || existing.userId !== userId) {
      throw new NotFoundException(`Saved filter with ID ${filterId} was not found`);
    }

    await this.prisma.savedPropertyFilter.delete({ where: { id: filterId } });
  }

  private async replacePhotos(propertyId: number, photos: PropertyPhotoDto[]) {
    await this.prisma.propertyPhoto.deleteMany({ where: { propertyId } });

    if (!photos.length) {
      return;
    }

    await this.prisma.propertyPhoto.createMany({
      data: photos.map((photo, index) => ({
        propertyId,
        url: photo.url,
        caption: photo.caption,
        isPrimary: photo.isPrimary ?? index === 0,
        displayOrder: photo.displayOrder ?? index,
      })),
    });
  }

  private async replaceAmenities(propertyId: number, amenities: PropertyAmenityDto[]) {
    await this.prisma.propertyAmenity.deleteMany({ where: { propertyId } });

    if (!amenities.length) {
      return;
    }

    const normalized = [] as { amenityId: number; isFeatured: boolean; value?: string }[];
    for (const amenity of amenities) {
      const normalizedKey = amenity.key.trim().toLowerCase();
      const amenityRecord = await this.prisma.amenity.upsert({
        where: { key: normalizedKey },
        create: {
          key: normalizedKey,
          label: amenity.label,
          description: amenity.description,
          category: amenity.category,
        },
        update: {
          label: amenity.label,
          description: amenity.description,
          category: amenity.category,
        },
      });
      normalized.push({
        amenityId: amenityRecord.id,
        isFeatured: amenity.isFeatured ?? false,
        value: amenity.value,
      });
    }

    await this.prisma.propertyAmenity.createMany({
      data: normalized.map((record) => ({
        propertyId,
        amenityId: record.amenityId,
        isFeatured: record.isFeatured,
        value: record.value,
      })),
    });
  }

  private normalizeSearchFilters(filters?: PropertySearchQueryDto): NormalizedSearchFilters {
    const sortBy = filters?.sortBy ?? 'newest';
    const sortOrder: SortDirection = filters?.sortOrder ?? (sortBy === 'newest' ? 'desc' : 'asc');
    const page = filters?.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters?.pageSize && filters.pageSize > 0 ? Math.min(filters.pageSize, MAX_PAGE_SIZE) : DEFAULT_PAGE_SIZE;

    return {
      searchTerm: filters?.searchTerm?.trim() || undefined,
      cities: this.normalizeStringArray(filters?.cities),
      states: this.normalizeStringArray(filters?.states),
      propertyTypes: this.normalizeStringArray(filters?.propertyTypes),
      availabilityStatuses: filters?.availabilityStatuses?.length ? filters.availabilityStatuses : undefined,
      amenityKeys: this.normalizeStringArray(filters?.amenityKeys, true),
      tags: this.normalizeStringArray(filters?.tags, true),
      minRent: filters?.minRent,
      maxRent: filters?.maxRent,
      bedroomsMin: filters?.bedroomsMin,
      bedroomsMax: filters?.bedroomsMax,
      bathroomsMin: filters?.bathroomsMin,
      bathroomsMax: filters?.bathroomsMax,
      sortBy,
      sortOrder,
      page,
      pageSize,
    };
  }

  private normalizeStringArray(values?: string[], lowercase = false): string[] | undefined {
    if (!values?.length) {
      return undefined;
    }

    const normalized = values
      .map((value) => value?.toString().trim())
      .filter((value): value is string => Boolean(value && value.length > 0));

    if (!normalized.length) {
      return undefined;
    }

    return lowercase ? normalized.map((value) => value.toLowerCase()) : normalized;
  }

  private buildSearchWhere(filters: NormalizedSearchFilters): Prisma.PropertyWhereInput {
    const conditions: Prisma.PropertyWhereInput[] = [];

    if (filters.searchTerm) {
      const term = filters.searchTerm;
      conditions.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { address: { contains: term, mode: 'insensitive' } },
          { city: { contains: term, mode: 'insensitive' } },
          { state: { contains: term, mode: 'insensitive' } },
          { description: { contains: term, mode: 'insensitive' } },
          { tags: { hasSome: [term.toLowerCase()] } },
        ],
      });
    }

    if (filters.cities?.length) {
      conditions.push({ city: { in: filters.cities } });
    }

    if (filters.states?.length) {
      conditions.push({ state: { in: filters.states } });
    }

    if (filters.propertyTypes?.length) {
      conditions.push({ propertyType: { in: filters.propertyTypes } });
    }

    if (filters.tags?.length) {
      conditions.push({ tags: { hasSome: filters.tags } });
    }

    if (filters.availabilityStatuses?.length) {
      conditions.push({ marketingProfile: { availabilityStatus: { in: filters.availabilityStatuses } } });
    }

    if (filters.amenityKeys?.length) {
      conditions.push({
        amenities: {
          some: {
            amenity: {
              key: { in: filters.amenityKeys },
            },
          },
        },
      });
    }

    if (filters.minRent !== undefined) {
      conditions.push({
        OR: [
          { minRent: { gte: filters.minRent } },
          { marketingProfile: { minRent: { gte: filters.minRent } } },
        ],
      });
    }

    if (filters.maxRent !== undefined) {
      conditions.push({
        OR: [
          { maxRent: { lte: filters.maxRent } },
          { marketingProfile: { maxRent: { lte: filters.maxRent } } },
        ],
      });
    }

    if (filters.bedroomsMin !== undefined) {
      conditions.push({ bedrooms: { gte: filters.bedroomsMin } });
    }

    if (filters.bedroomsMax !== undefined) {
      conditions.push({ bedrooms: { lte: filters.bedroomsMax } });
    }

    if (filters.bathroomsMin !== undefined) {
      conditions.push({ bathrooms: { gte: filters.bathroomsMin } });
    }

    if (filters.bathroomsMax !== undefined) {
      conditions.push({ bathrooms: { lte: filters.bathroomsMax } });
    }

    if (!conditions.length) {
      return {};
    }

    return { AND: conditions };
  }

  private buildSortOrder(sortBy: PropertySortOption, sortOrder: SortDirection): Prisma.PropertyOrderByWithRelationInput[] {
    switch (sortBy) {
      case 'price':
        return [
          { minRent: sortOrder },
          { marketingProfile: { minRent: sortOrder } },
          { name: 'asc' },
        ];
      case 'bedrooms':
        return [
          { bedrooms: sortOrder },
          { name: 'asc' },
        ];
      case 'bathrooms':
        return [
          { bathrooms: sortOrder },
          { name: 'asc' },
        ];
      default:
        return [
          { createdAt: sortOrder === 'asc' ? 'asc' : 'desc' },
          { name: 'asc' },
        ];
    }
  }

  private sanitizeFilterPayload(filters: Record<string, unknown>): Prisma.InputJsonValue {
    const payload = Object.fromEntries(
      Object.entries(filters).filter(([_, value]) => {
        if (value === undefined || value === null) {
          return false;
        }

        if (Array.isArray(value) && value.length === 0) {
          return false;
        }

        return true;
      }),
    );

    return payload as Prisma.InputJsonValue;
  }
}
