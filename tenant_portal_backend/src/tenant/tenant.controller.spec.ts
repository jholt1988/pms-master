import { TenantController } from './tenant.controller';

describe('TenantController', () => {
  const tenantService: any = {
    listTenants: jest.fn(),
    getTenantById: jest.fn(),
    getTenantWorkspace: jest.fn(),
    refreshHealth: jest.fn(),
    getActivityTimeline: jest.fn(),
    updateProfile: jest.fn(),
    addHouseholdMember: jest.fn(),
    removeHouseholdMember: jest.fn(),
    addViolation: jest.fn(),
    resolveViolation: jest.fn(),
  };

  let controller: TenantController;

  beforeEach(() => {
    jest.resetAllMocks();
    controller = new TenantController(tenantService);
  });

  it('forwards all tenant routes to service with mapped params', async () => {
    const query = { search: 'john', take: 10 } as any;
    const req = { user: { sub: 'actor-1' } } as any;

    await controller.listTenants(query, 'org-1');
    await controller.getTenant('tenant-1');
    await controller.getTenantWorkspace('tenant-1');
    await controller.getTenantHealth('tenant-1');
    await controller.getActivityTimeline('tenant-1', '20');
    await controller.getActivityTimeline('tenant-1');
    await controller.updateProfile('tenant-1', { preferredName: 'J' } as any, req);
    await controller.addHouseholdMember('tenant-1', { name: 'Member' } as any, req);
    await controller.removeHouseholdMember('hm-1', req);
    await controller.addViolation('tenant-1', { type: 'NOISE' } as any, req);
    await controller.resolveViolation('v-1', 'resolved', req);

    expect(tenantService.listTenants).toHaveBeenCalledWith(query, 'org-1');
    expect(tenantService.getTenantById).toHaveBeenCalledWith('tenant-1');
    expect(tenantService.getTenantWorkspace).toHaveBeenCalledWith('tenant-1');
    expect(tenantService.refreshHealth).toHaveBeenCalledWith('tenant-1');
    expect(tenantService.getActivityTimeline).toHaveBeenNthCalledWith(1, 'tenant-1', 20);
    expect(tenantService.getActivityTimeline).toHaveBeenNthCalledWith(2, 'tenant-1', 50);
    expect(tenantService.updateProfile).toHaveBeenCalledWith('tenant-1', { preferredName: 'J' }, 'actor-1');
    expect(tenantService.addHouseholdMember).toHaveBeenCalledWith('tenant-1', { name: 'Member' }, 'actor-1');
    expect(tenantService.removeHouseholdMember).toHaveBeenCalledWith('hm-1', 'actor-1');
    expect(tenantService.addViolation).toHaveBeenCalledWith('tenant-1', { type: 'NOISE' }, 'actor-1');
    expect(tenantService.resolveViolation).toHaveBeenCalledWith('v-1', 'resolved', 'actor-1');
  });
});

