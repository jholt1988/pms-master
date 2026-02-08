import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { MaintenancePriority, OrgRole, Role, Status } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

describe('Maintenance security boundaries (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tenantA: any;
  let tenantB: any;
  let pmA: any;
  let pmB: any;

  let tokenTenantA: string;
  let tokenTenantB: string;
  let tokenPmA: string;
  let tokenPmB: string;

  let orgA: any;
  let orgB: any;
  let propertyA: any;
  let propertyB: any;
  let unitA: any;
  let unitB: any;
  let leaseA: any;
  let leaseB: any;

  let requestA: any;
  let requestB: any;

  async function login(username: string) {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username, password: 'password123' });
    return res.body.access_token || res.body.accessToken;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);

    // Orgs
    orgA = await prisma.organization.create({ data: { name: 'Org A' } });
    orgB = await prisma.organization.create({ data: { name: 'Org B' } });

    // Users
    tenantA = await prisma.user.create({
      data: TestDataFactory.createUser({ username: 'tenantA@test.com', role: Role.TENANT }),
    });
    tenantB = await prisma.user.create({
      data: TestDataFactory.createUser({ username: 'tenantB@test.com', role: Role.TENANT }),
    });

    pmA = await prisma.user.create({
      data: TestDataFactory.createPropertyManager({ username: 'pmA@test.com' }),
    });
    pmB = await prisma.user.create({
      data: TestDataFactory.createPropertyManager({ username: 'pmB@test.com' }),
    });

    // Org memberships (single-org mode)
    await prisma.userOrganization.create({
      data: { userId: pmA.id, organizationId: orgA.id, role: OrgRole.ADMIN },
    });
    await prisma.userOrganization.create({
      data: { userId: pmB.id, organizationId: orgB.id, role: OrgRole.ADMIN },
    });

    // Properties/units/leases
    propertyA = await prisma.property.create({
      data: TestDataFactory.createProperty({ organizationId: orgA.id }),
    });
    propertyB = await prisma.property.create({
      data: TestDataFactory.createProperty({ organizationId: orgB.id }),
    });

    unitA = await prisma.unit.create({ data: TestDataFactory.createUnit(propertyA.id) });
    unitB = await prisma.unit.create({ data: TestDataFactory.createUnit(propertyB.id) });

    leaseA = await prisma.lease.create({ data: TestDataFactory.createLease(tenantA.id, unitA.id) });
    leaseB = await prisma.lease.create({ data: TestDataFactory.createLease(tenantB.id, unitB.id) });

    // Maintenance requests (one per org/lease)
    requestA = await prisma.maintenanceRequest.create({
      data: {
        title: 'A request',
        description: 'A desc',
        priority: MaintenancePriority.MEDIUM,
        status: Status.PENDING,
        author: { connect: { id: tenantA.id } },
        lease: { connect: { id: leaseA.id } },
        unit: { connect: { id: unitA.id } },
        property: { connect: { id: propertyA.id } },
      },
    });

    requestB = await prisma.maintenanceRequest.create({
      data: {
        title: 'B request',
        description: 'B desc',
        priority: MaintenancePriority.MEDIUM,
        status: Status.PENDING,
        author: { connect: { id: tenantB.id } },
        lease: { connect: { id: leaseB.id } },
        unit: { connect: { id: unitB.id } },
        property: { connect: { id: propertyB.id } },
      },
    });

    // Tokens
    tokenTenantA = await login('tenantA@test.com');
    tokenTenantB = await login('tenantB@test.com');
    tokenPmA = await login('pmA@test.com');
    tokenPmB = await login('pmB@test.com');
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('tenant cannot read another tenant\'s maintenance request (lease boundary)', async () => {
    await request(app.getHttpServer())
      .get(`/maintenance/${requestB.id}`)
      .set('Authorization', `Bearer ${tokenTenantA}`)
      .expect(403);
  });

  it('PM cannot update status of request in a different org (org boundary)', async () => {
    await request(app.getHttpServer())
      .patch(`/maintenance/${requestB.id}/status`)
      .set('Authorization', `Bearer ${tokenPmA}`)
      .send({ status: Status.IN_PROGRESS })
      .expect(403);
  });

  it('PM cannot assign technician for request in a different org (org boundary)', async () => {
    const techInB = await prisma.technician.create({ data: { name: 'Tech B' } });

    await request(app.getHttpServer())
      .patch(`/maintenance/${requestB.id}/assign`)
      .set('Authorization', `Bearer ${tokenPmA}`)
      .send({ technicianId: techInB.id })
      .expect(403);
  });

  it('tenant cannot add note to another lease request; PM cannot add note cross-org', async () => {
    // Tenant cross-lease
    await request(app.getHttpServer())
      .post(`/maintenance/${requestB.id}/notes`)
      .set('Authorization', `Bearer ${tokenTenantA}`)
      .send({ body: 'nope' })
      .expect(403);

    // PM cross-org
    await request(app.getHttpServer())
      .post(`/maintenance/${requestB.id}/notes`)
      .set('Authorization', `Bearer ${tokenPmA}`)
      .send({ body: 'nope' })
      .expect(403);
  });

  it('tenant can create request, but cannot override unit/property (derived from lease)', async () => {
    // Create an extra unit in orgB to try to target
    const evilUnit = await prisma.unit.create({ data: TestDataFactory.createUnit(propertyB.id) });

    const res = await request(app.getHttpServer())
      .post('/maintenance')
      .set('Authorization', `Bearer ${tokenTenantA}`)
      .send({
        title: 'Try to override',
        description: 'Attempt',
        unitId: evilUnit.id,
        propertyId: propertyB.id,
      })
      .expect(201);

    expect(res.body.leaseId).toBe(leaseA.id);
    expect(res.body.unitId).toBe(unitA.id);
    expect(res.body.propertyId).toBe(propertyA.id);
  });
});
