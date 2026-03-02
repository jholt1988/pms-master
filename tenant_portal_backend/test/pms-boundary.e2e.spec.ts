import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { LeaseStatus, OrgRole, Role } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

describe('PMS Boundary / Replay Safety (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

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
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('blocks cross-lease payment attempts across tenants', async () => {
    const [orgA, orgB] = await Promise.all([
      prisma.organization.create({ data: { name: 'Boundary Org A' } }),
      prisma.organization.create({ data: { name: 'Boundary Org B' } }),
    ]);

    const [tenantA, tenantB] = await Promise.all([
      prisma.user.create({ data: TestDataFactory.createUser({ username: 'tenantA@boundary.test', role: Role.TENANT }) }),
      prisma.user.create({ data: TestDataFactory.createUser({ username: 'tenantB@boundary.test', role: Role.TENANT }) }),
    ]);

    const [pmA, pmB] = await Promise.all([
      prisma.user.create({ data: TestDataFactory.createPropertyManager({ username: 'pmA@boundary.test' }) }),
      prisma.user.create({ data: TestDataFactory.createPropertyManager({ username: 'pmB@boundary.test' }) }),
    ]);

    await Promise.all([
      prisma.userOrganization.create({ data: { userId: pmA.id, organizationId: orgA.id, role: OrgRole.ADMIN } }),
      prisma.userOrganization.create({ data: { userId: pmB.id, organizationId: orgB.id, role: OrgRole.ADMIN } }),
      prisma.userOrganization.create({ data: { userId: tenantA.id, organizationId: orgA.id, role: OrgRole.MEMBER } }),
      prisma.userOrganization.create({ data: { userId: tenantB.id, organizationId: orgB.id, role: OrgRole.MEMBER } }),
    ]);

    const [propertyA, propertyB] = await Promise.all([
      prisma.property.create({ data: TestDataFactory.createProperty({ name: 'Boundary A Property', organizationId: orgA.id }) }),
      prisma.property.create({ data: TestDataFactory.createProperty({ name: 'Boundary B Property', organizationId: orgB.id }) }),
    ]);

    const [unitA, unitB] = await Promise.all([
      prisma.unit.create({ data: TestDataFactory.createUnit(propertyA.id) }),
      prisma.unit.create({ data: TestDataFactory.createUnit(propertyB.id) }),
    ]);

    const [leaseA, leaseB] = await Promise.all([
      prisma.lease.create({ data: TestDataFactory.createLease(tenantA.id, unitA.id, { status: LeaseStatus.ACTIVE }) }),
      prisma.lease.create({ data: TestDataFactory.createLease(tenantB.id, unitB.id, { status: LeaseStatus.ACTIVE }) }),
    ]);

    const invoiceB = await prisma.invoice.create({
      data: {
        leaseId: leaseB.id,
        description: 'Boundary Rent B',
        amount: 1500,
        dueDate: new Date(),
        status: 'UNPAID',
      },
    });

    const tenantALogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'tenantA@boundary.test', password: 'password123' })
      .expect(201);

    const tenantAToken = tenantALogin.body.accessToken as string;

    const res = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .send({
        invoiceId: invoiceB.id,
        leaseId: leaseB.id,
        amount: 1500,
      });

    expect([400, 403, 404]).toContain(res.status);

    const crossTenantPayments = await prisma.payment.count({
      where: {
        leaseId: leaseB.id,
        userId: tenantA.id,
      },
    });
    expect(crossTenantPayments).toBe(0);

    // sanity: own lease payment still works
    const invoiceA = await prisma.invoice.create({
      data: {
        leaseId: leaseA.id,
        description: 'Boundary Rent A',
        amount: 1200,
        dueDate: new Date(),
        status: 'UNPAID',
      },
    });

    await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${tenantAToken}`)
      .send({
        invoiceId: invoiceA.id,
        leaseId: leaseA.id,
        amount: 1200,
      })
      .expect(201);
  });

  it('enforces webhook replay idempotency by unique event id', async () => {
    const org = await prisma.organization.create({ data: { name: 'Replay Org' } });

    await prisma.stripeWebhookEvent.create({
      data: {
        eventId: 'evt_replay_test_1',
        eventType: 'payment_intent.succeeded',
        organizationId: org.id,
        payload: { sample: true },
      },
    });

    await expect(
      prisma.stripeWebhookEvent.create({
        data: {
          eventId: 'evt_replay_test_1',
          eventType: 'payment_intent.succeeded',
          organizationId: org.id,
          payload: { replay: true },
        },
      }),
    ).rejects.toThrow();

    const events = await prisma.stripeWebhookEvent.findMany({
      where: { eventId: 'evt_replay_test_1' },
    });
    expect(events).toHaveLength(1);
  });
});
