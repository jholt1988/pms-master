import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { resetDatabase } from './utils/reset-database';
import { LeaseStatus, MaintenancePriority, Role, Status } from '@prisma/client';

describe('Tenant feed API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantToken: string;
  let tenantUser: any;
  let propertyManager: any;
  let property: any;
  let unit: any;
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
    propertyManager = await prisma.user.create({
      data: TestDataFactory.createPropertyManager({ username: 'pm@test.com' }),
    });
    property = await prisma.property.create({ data: TestDataFactory.createProperty() });
    unit = await prisma.unit.create({ data: TestDataFactory.createUnit(property.id) });
    lease = await prisma.lease.create({
      data: TestDataFactory.createLease(tenantUser.id, unit.id, {
        status: LeaseStatus.ACTIVE,
        endDate: new Date(Date.now() + 10 * 86_400_000),
      }),
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

  it('returns bare { items, generatedAt } with tenant-safe fields sorted by priority', async () => {
    await prisma.invoice.create({
      data: {
        leaseId: lease.id,
        description: 'Monthly Rent',
        amount: 2100,
        dueDate: new Date(Date.now() - 86_400_000),
        status: 'OVERDUE',
      },
    });
    await prisma.maintenanceRequest.create({
      data: {
        authorId: tenantUser.id,
        unitId: unit.id,
        title: 'Water leak',
        description: 'Sink leak',
        priority: MaintenancePriority.EMERGENCY,
        status: Status.PENDING,
      },
    });
    const conversation = await prisma.conversation.create({
      data: {
        participants: {
          create: [{ userId: tenantUser.id }, { userId: propertyManager.id }],
        },
      },
    });
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: propertyManager.id,
        content: 'Please review your renewal packet.',
      },
    });

    const response = await request(app.getHttpServer())
      .get('/tenant/feed')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    expect(response.body).toEqual({
      items: expect.any(Array),
      generatedAt: expect.any(String),
    });
    expect(response.body.items.length).toBeGreaterThan(0);
    for (const item of response.body.items) {
      expect(item).toEqual(
        expect.objectContaining({
          id: expect.any(String),
          kind: expect.any(String),
          domain: expect.any(String),
          title: expect.any(String),
          summary: expect.any(String),
          priority: expect.any(Number),
          timestamp: expect.any(String),
          navigateTo: expect.any(String),
        }),
      );
      expect(item.actions).toBeUndefined();
      expect(item.allowedRoles).toBeUndefined();
    }
    const priorities = response.body.items.map((item: any) => item.priority);
    expect(priorities).toEqual([...priorities].sort((a, b) => b - a));
  });

  it('returns an empty bare feed when there are no items', async () => {
    const response = await request(app.getHttpServer())
      .get('/tenant/feed')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    expect(response.body.items).toEqual([]);
    expect(response.body.generatedAt).toEqual(expect.any(String));
    expect(response.body.data).toBeUndefined();
  });
});
