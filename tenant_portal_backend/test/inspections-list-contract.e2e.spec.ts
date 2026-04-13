import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { resetDatabase } from './utils/reset-database';
import { InspectionStatus, InspectionType, Role } from '@prisma/client';

describe('Inspections list contract (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantToken: string;
  let tenantUser: any;
  let otherTenant: any;
  let property: any;
  let unit: any;
  let otherUnit: any;
  let lease: any;

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

    tenantUser = await prisma.user.create({
      data: TestDataFactory.createUser({ username: 'tenant@test.com', role: Role.TENANT }),
    });
    otherTenant = await prisma.user.create({
      data: TestDataFactory.createUser({ username: 'tenant2@test.com', role: Role.TENANT }),
    });

    property = await prisma.property.create({ data: TestDataFactory.createProperty() });
    unit = await prisma.unit.create({ data: TestDataFactory.createUnit(property.id) });
    otherUnit = await prisma.unit.create({ data: TestDataFactory.createUnit(property.id) });

    lease = await prisma.lease.create({
      data: TestDataFactory.createLease(tenantUser.id, unit.id),
    });
    await prisma.lease.create({ data: TestDataFactory.createLease(otherTenant.id, otherUnit.id) });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'tenant@test.com', password: 'password123' });
    tenantToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('returns inspections/data/items/meta and stays tenant-scoped', async () => {
    const mine = await prisma.unitInspection.create({
      data: {
        property: { connect: { id: property.id } },
        unit: { connect: { id: unit.id } },
        tenant: { connect: { id: tenantUser.id } },
        createdBy: { connect: { id: tenantUser.id } },
        type: InspectionType.MOVE_IN,
        status: InspectionStatus.SCHEDULED,
        scheduledDate: new Date(),
      },
    });

    await prisma.unitInspection.create({
      data: {
        property: { connect: { id: property.id } },
        unit: { connect: { id: otherUnit.id } },
        tenant: { connect: { id: otherTenant.id } },
        createdBy: { connect: { id: otherTenant.id } },
        type: InspectionType.MOVE_OUT,
        status: InspectionStatus.SCHEDULED,
        scheduledDate: new Date(),
      },
    });

    const response = await request(app.getHttpServer())
      .get('/inspections')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    expect(response.body).toHaveProperty('inspections');
    expect(response.body).toHaveProperty('data');
    expect(response.body).toHaveProperty('items');
    expect(response.body).toHaveProperty('meta');
    expect(response.body.meta).toEqual(
      expect.objectContaining({
        total: expect.any(Number),
        page: expect.any(Number),
        limit: expect.any(Number),
        totalPages: expect.any(Number),
      }),
    );
    expect(response.body.inspections).toHaveLength(1);
    expect(response.body.inspections[0].id).toBe(mine.id);
    expect(response.body.data[0].id).toBe(mine.id);
    expect(response.body.items[0].id).toBe(mine.id);
  });

  it('preserves the contract shape for an empty inspection state', async () => {
    const response = await request(app.getHttpServer())
      .get('/inspections')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    expect(response.body.inspections).toEqual([]);
    expect(response.body.data).toEqual([]);
    expect(response.body.items).toEqual([]);
    expect(response.body.meta).toEqual(
      expect.objectContaining({ total: 0, page: expect.any(Number), limit: expect.any(Number) }),
    );
  });
});
