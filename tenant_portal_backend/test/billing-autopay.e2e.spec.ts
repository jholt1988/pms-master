import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { resetDatabase } from './utils/reset-database';
import { LeaseStatus, Role } from '@prisma/client';

describe('Billing autopay API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantToken: string;
  let tenantUser: any;
  let otherTenant: any;
  let property: any;
  let unit: any;
  let otherUnit: any;
  let lease: any;
  let otherLease: any;
  let paymentMethod: any;
  let otherPaymentMethod: any;

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
      data: TestDataFactory.createLease(tenantUser.id, unit.id, { status: LeaseStatus.ACTIVE }),
    });
    otherLease = await prisma.lease.create({
      data: TestDataFactory.createLease(otherTenant.id, otherUnit.id, { status: LeaseStatus.ACTIVE }),
    });

    paymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: tenantUser.id,
        type: 'CARD',
        provider: 'STRIPE',
        providerCustomerId: 'cus_test_tenant',
        providerPaymentMethodId: 'pm_test_tenant',
        last4: '4242',
        brand: 'visa',
      },
    });
    otherPaymentMethod = await prisma.paymentMethod.create({
      data: {
        userId: otherTenant.id,
        type: 'CARD',
        provider: 'STRIPE',
        providerCustomerId: 'cus_test_other',
        providerPaymentMethodId: 'pm_test_other',
        last4: '1111',
        brand: 'visa',
      },
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'tenant@test.com', password: 'password123' });
    tenantToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('returns { leaseId, enrollment } for tenant autopay reads', async () => {
    await prisma.autopayEnrollment.create({
      data: { leaseId: lease.id, paymentMethodId: paymentMethod.id, active: true },
    });

    const response = await request(app.getHttpServer())
      .get('/billing/autopay')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    expect(response.body).toEqual({
      leaseId: lease.id,
      enrollment: expect.objectContaining({
        leaseId: lease.id,
        paymentMethodId: paymentMethod.id,
        active: true,
      }),
    });
  });

  it('creates or updates tenant autopay only with a tenant-owned payment method', async () => {
    const response = await request(app.getHttpServer())
      .post('/billing/autopay')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ leaseId: lease.id, paymentMethodId: paymentMethod.id })
      .expect(201);

    expect(response.body).toEqual(
      expect.objectContaining({
        leaseId: lease.id,
        paymentMethodId: paymentMethod.id,
        active: true,
      }),
    );

    await request(app.getHttpServer())
      .post('/billing/autopay')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ leaseId: lease.id, paymentMethodId: otherPaymentMethod.id })
      .expect(400);

    await request(app.getHttpServer())
      .post('/billing/autopay')
      .set('Authorization', `Bearer ${tenantToken}`)
      .send({ leaseId: otherLease.id, paymentMethodId: paymentMethod.id })
      .expect(400);
  });

  it('disables autopay and returns { leaseId, active: false }', async () => {
    await prisma.autopayEnrollment.create({
      data: { leaseId: lease.id, paymentMethodId: paymentMethod.id, active: true },
    });

    const response = await request(app.getHttpServer())
      .patch(`/billing/autopay/${lease.id}/disable`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    expect(response.body).toEqual({ leaseId: lease.id, active: false });
  });
});
