import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { Role, LeaseStatus } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

describe('Payments API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantToken: string;
  let tenantUser: any;
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

    // Create user
    tenantUser = await prisma.user.create({
      data: TestDataFactory.createUser({
        username: 'tenant@test.com',
        password: 'password123',
        role: Role.TENANT,
      }),
    });

    // Login
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'tenant@test.com', password: 'password123' });
    tenantToken = loginResponse.body.accessToken;

    // Create property, unit, and lease
    property = await prisma.property.create({
      data: TestDataFactory.createProperty(),
    });

    unit = await prisma.unit.create({
      data: TestDataFactory.createUnit(property.id),
    });

    lease = await prisma.lease.create({
      data: TestDataFactory.createLease(tenantUser.id, unit.id, {
        rentAmount: 2000,
        status: LeaseStatus.ACTIVE,
        depositAmount: 2000,
      }),
    });
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  describe('GET /payments/invoices', () => {
    beforeEach(async () => {
      // Create invoice
      await prisma.invoice.create({
        data: {
          leaseId: lease.id,
          description: 'Monthly Rent',
          amount: 2000,
          dueDate: new Date(),
          status: 'UNPAID',
        },
      });
    });

    it('should get invoices for tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/invoices')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('amount');
      }
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/payments/invoices')
        .expect(401);
    });
  });

  describe('POST /payments', () => {
    let invoice: any;

    beforeEach(async () => {
      invoice = await prisma.invoice.create({
        data: {
          leaseId: lease.id,
          description: 'Monthly Rent',
          amount: 2000,
          dueDate: new Date(),
          status: 'UNPAID',
        },
      });
    });

    it('should create payment for invoice', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          invoiceId: invoice.id,
          leaseId: lease.id,
          amount: 2000,
          paymentMethodId: null, // Using test mode
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('status');
    });

    it('should validate payment amount', async () => {
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          invoiceId: invoice.id,
          leaseId: lease.id,
          amount: -100, // Invalid amount
        })
        .expect(400);
    });
  });

  describe('GET /payments/payment-methods', () => {
    it('should get payment methods for tenant', async () => {
      const response = await request(app.getHttpServer())
        .get('/payments/payment-methods')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('POST /payments/payment-methods', () => {
    it('should create payment method', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/payment-methods')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          type: 'CARD',
          provider: 'STRIPE',
          last4: '4242',
          brand: 'Visa',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
    });
  });
});

