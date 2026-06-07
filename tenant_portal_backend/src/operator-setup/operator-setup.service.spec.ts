import { UnitStatus } from '@prisma/client';
import { OperatorSetupService } from './operator-setup.service';

describe('OperatorSetupService', () => {
  it('returns org-scoped property and unit setup metrics', async () => {
    const prisma = {
      property: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'property-1',
            name: 'Oak House',
            address: '123 Main',
            city: 'Lawrence',
            state: 'KS',
            units: [
              { id: 'unit-1', status: UnitStatus.VACANT, bedrooms: 2, bathrooms: 1, squareFeet: 900 },
              { id: 'unit-2', status: UnitStatus.LISTED, bedrooms: null, bathrooms: 1, squareFeet: null },
            ],
          },
          {
            id: 'property-2',
            name: 'Elm House',
            address: null,
            city: null,
            state: 'KS',
            units: [],
          },
        ]),
      },
    };
    const service = new OperatorSetupService(prisma as any, {} as any, {} as any);

    const result = await service.getSummary('org-1');

    expect(prisma.property.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { organizationId: 'org-1' },
    }));
    expect(result.metrics).toMatchObject({
      properties: 2,
      units: 2,
      vacantUnits: 1,
      listedUnits: 1,
      unitsMissingDetails: 1,
      propertiesMissingAddress: 1,
    });
    expect(result.properties[1].setupWarnings).toContain('No units configured');
  });

  it('creates a property through PropertyService and records audit', async () => {
    const propertyService = {
      createProperty: jest.fn().mockResolvedValue({ id: 'property-1', name: 'Oak House' }),
    };
    const auditLogService = { record: jest.fn().mockResolvedValue(undefined) };
    const service = new OperatorSetupService({} as any, propertyService as any, auditLogService as any);

    await service.createProperty('org-1', 'actor-1', {
      name: 'Oak House',
      address: '123 Main St',
      city: 'Lawrence',
      state: 'KS',
    });

    expect(propertyService.createProperty).toHaveBeenCalledWith(expect.objectContaining({ name: 'Oak House' }), 'org-1');
    expect(auditLogService.record).toHaveBeenCalledWith(expect.objectContaining({
      orgId: 'org-1',
      actorId: 'actor-1',
      module: 'PROPERTY',
      action: 'PROPERTY_CREATED',
      entityType: 'Property',
      entityId: 'property-1',
    }));
  });
});
