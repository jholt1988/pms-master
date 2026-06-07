import { Injectable } from '@nestjs/common';
import { UnitStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePropertyDto, CreateUnitDto, UpdatePropertyDto, UpdateUnitDto } from '../property/dto/property.dto';
import { PropertyService } from '../property/property.service';
import { AuditLogService } from '../shared/audit-log.service';
import { OperatorSetupSummary } from './operator-setup.types';

@Injectable()
export class OperatorSetupService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly propertyService: PropertyService,
    private readonly auditLogService: AuditLogService,
  ) {}

  async getSummary(orgId: string): Promise<OperatorSetupSummary> {
    const properties = await this.prisma.property.findMany({
      where: { organizationId: orgId },
      include: { units: true },
      orderBy: { name: 'asc' },
    });
    const allUnits = properties.flatMap((property) => property.units);

    return {
      generatedAt: new Date().toISOString(),
      metrics: {
        properties: properties.length,
        units: allUnits.length,
        vacantUnits: allUnits.filter((unit) => unit.status === UnitStatus.VACANT).length,
        listedUnits: allUnits.filter((unit) => unit.status === UnitStatus.LISTED).length,
        unitsMissingDetails: allUnits.filter((unit) => !unit.bedrooms || !unit.bathrooms || !unit.squareFeet).length,
        propertiesMissingAddress: properties.filter((property) => !property.address || !property.city || !property.state).length,
      },
      properties: properties.map((property) => {
        const setupWarnings = [
          ...(!property.address || !property.city || !property.state ? ['Missing complete address'] : []),
          ...(property.units.length === 0 ? ['No units configured'] : []),
          ...(property.units.some((unit) => !unit.bedrooms || !unit.bathrooms || !unit.squareFeet) ? ['Some units are missing bed/bath/square feet'] : []),
        ];

        return {
          id: property.id,
          name: property.name,
          address: property.address,
          city: property.city,
          state: property.state,
          unitCount: property.units.length,
          vacantUnits: property.units.filter((unit) => unit.status === UnitStatus.VACANT).length,
          listedUnits: property.units.filter((unit) => unit.status === UnitStatus.LISTED).length,
          setupWarnings,
        };
      }),
    };
  }

  async createProperty(orgId: string, actorId: string, dto: CreatePropertyDto) {
    const property = await this.propertyService.createProperty(dto, orgId);
    await this.auditLogService.record({
      orgId,
      actorId,
      module: 'PROPERTY',
      action: 'PROPERTY_CREATED',
      entityType: 'Property',
      entityId: property.id,
      result: 'SUCCESS',
      metadata: { name: dto.name, city: dto.city, state: dto.state },
    });
    return property;
  }

  async updateProperty(orgId: string, actorId: string, propertyId: string, dto: UpdatePropertyDto) {
    const property = await this.propertyService.updateProperty(propertyId, dto, orgId);
    await this.auditLogService.record({
      orgId,
      actorId,
      module: 'PROPERTY',
      action: 'PROPERTY_UPDATED',
      entityType: 'Property',
      entityId: propertyId,
      result: 'SUCCESS',
      metadata: { changedFields: Object.keys(dto) },
    });
    return property;
  }

  async createUnit(orgId: string, actorId: string, propertyId: string, dto: CreateUnitDto) {
    const unit = await this.propertyService.createUnit(propertyId, dto, orgId);
    await this.auditLogService.record({
      orgId,
      actorId,
      module: 'PROPERTY',
      action: 'UNIT_CREATED',
      entityType: 'Unit',
      entityId: unit.id,
      result: 'SUCCESS',
      metadata: { propertyId, name: dto.name, unitNumber: dto.unitNumber, status: dto.status ?? UnitStatus.VACANT },
    });
    return unit;
  }

  async updateUnit(orgId: string, actorId: string, propertyId: string, unitId: string, dto: UpdateUnitDto) {
    const unit = await this.propertyService.updateUnit(propertyId, unitId, dto, orgId);
    await this.auditLogService.record({
      orgId,
      actorId,
      module: 'PROPERTY',
      action: 'UNIT_UPDATED',
      entityType: 'Unit',
      entityId: unitId,
      result: 'SUCCESS',
      metadata: { propertyId, changedFields: Object.keys(dto), status: dto.status },
    });
    return unit;
  }
}
