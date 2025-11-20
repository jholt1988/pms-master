import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';

describe('Payments API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let pmToken: string;
  let tenantToken: string;
  let tenant: any;
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

    // Clean up database
    await prisma.payment.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.lease.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();

    // Create test users
    tenant = await prisma.user.create({
      data: TestDataFactory.createUser({
        username: 'tenant@test.com',
        role: 'TENANT',
      }),
    });

    propertyManager = await prisma.user.create({
      data: TestDataFactory.createPropertyManager({
        username: 'pm@test.com',
      }),
    });

    // Create test property and unit
    property = await prisma.property.create({
      data: TestDataFactory.createProperty(),
    });

    unit = await prisma.unit.create({
      data: TestDataFactory.createUnit(property.id),
    });

    // Create test lease
    lease = await prisma.lease.create({
      data: TestDataFactory.createLease(tenant.id, unit.id),
    });

    // Login users to get tokens
    const tenantLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'tenant@test.com',
        password: 'password123',
      });
    tenantToken = tenantLogin.body.access_token;

    const pmLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'pm@test.com',
        password: 'password123',
      });
    pmToken = pmLogin.body.access_token;
  });

  afterAll(async () => {
    // Clean up
    await prisma.payment.deleteMany();
    await prisma.invoice.deleteMany();
    await prisma.lease.deleteMany();
    await prisma.unit.deleteMany();
    await prisma.property.deleteMany();
    await prisma.user.deleteMany();
    await app.close();
  });

  describe('POST /payments/invoices', () => {
    it('should create invoice as property manager', () => {
      return request(app.getHttpServer())
        .post('/payments/invoices')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          description: 'December Rent',
          amount: 1500,
          dueDate: '2025-12-01',
          leaseId: lease.id,
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.amount).toBe(1500);
          expect(res.body.description).toBe('December Rent');
        });
    });

    it('should reject invoice creation by tenant', () => {
      return request(app.getHttpServer())
        .post('/payments/invoices')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({
          description: 'Test',
          amount: 1500,
          dueDate: '2025-12-01',
          leaseId: lease.id,
        })
        .expect(403);
    });

    it('should reject invoice with invalid lease', () => {
      return request(app.getHttpServer())
        .post('/payments/invoices')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          description: 'Test',
          amount: 1500,
          dueDate: '2025-12-01',
          leaseId: 99999,
        })
        .expect(404);
    });

    it('should validate amount is positive', () => {
      return request(app.getHttpServer())
        .post('/payments/invoices')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          description: 'Test',
          amount: -100,
          dueDate: '2025-12-01',
          leaseId: lease.id,
        })
        .expect(400);
    });
  });

  describe('GET /payments/invoices', () => {
    let invoice1: any;
    let invoice2: any;

    beforeAll(async () => {
      // Create test invoices
      invoice1 = await prisma.invoice.create({
        data: TestDataFactory.createInvoice(lease.id, {
          description: 'November Rent',
          amount: 1500,
        }),
      });

      invoice2 = await prisma.invoice.create({
        data: TestDataFactory.createInvoice(lease.id, {
          description: 'December Rent',
          amount: 1500,
        }),
      });
    });

    it('should return invoices for tenant', () => {
      return request(app.getHttpServer())
        .get('/payments/invoices')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThan(0);
        });
    });

    it('should return all invoices for property manager', () => {
      return request(app.getHttpServer())
        .get('/payments/invoices')
        .set('Authorization', `Bearer ${pmToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
          expect(res.body.length).toBeGreaterThanOrEqual(2);
        });
    });

    it('should filter invoices by leaseId', () => {
      return request(app.getHttpServer())
        .get(`/payments/invoices?leaseId=${lease.id}`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200)
        .expect((res) => {
          expect(res.body.length).toBeGreaterThan(0);
          res.body.forEach((invoice: any) => {
            expect(invoice.leaseId).toBe(lease.id);
          });
        });
    });

    it('should reject unauthenticated requests', () => {
      return request(app.getHttpServer())
        .get('/payments/invoices')
        .expect(401);
    });
  });

  describe('POST /payments', () => {
    let invoice: any;

    beforeAll(async () => {
      invoice = await prisma.invoice.create({
        data: TestDataFactory.createInvoice(lease.id, {
          description: 'Test Payment Invoice',
          amount: 1800,
        }),
      });
    });

    it('should create payment as property manager', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          amount: 1800,
          leaseId: lease.id,
          status: 'COMPLETED',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.amount).toBe(1800);
          expect(res.body.status).toBe('COMPLETED');
        });
    });

    it('should handle partial payment', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          amount: 500,
          leaseId: lease.id,
          status: 'COMPLETED',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.amount).toBe(500);
        });
    });

    it('should record failed payment', () => {
      return request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          amount: 1800,
          leaseId: lease.id,
          status: 'FAILED',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body.status).toBe('FAILED');
        });
    });
  });

  describe('GET /payments', () => {
    it('should return payments for tenant', () => {
      return request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });

    it('should return all payments for property manager', () => {
      return request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${pmToken}`)
        .expect(200)
        .expect((res) => {
          expect(Array.isArray(res.body)).toBe(true);
        });
    });
  });

  describe('Payment Workflow Integration', () => {
    it('should complete full payment lifecycle', async () => {
      // 1. Property Manager creates invoice
      const createInvoiceRes = await request(app.getHttpServer())
        .post('/payments/invoices')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          description: 'January Rent',
          amount: 2000,
          dueDate: '2026-01-01',
          leaseId: lease.id,
        })
        .expect(201);

      const newInvoiceId = createInvoiceRes.body.id;

      // 2. Tenant views their invoices
      const viewInvoicesRes = await request(app.getHttpServer())
        .get('/payments/invoices')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(viewInvoicesRes.body.some((inv: any) => inv.id === newInvoiceId)).toBe(true);

      // 3. Property Manager records payment
      const createPaymentRes = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          amount: 2000,
          leaseId: lease.id,
          status: 'COMPLETED',
        })
        .expect(201);

      expect(createPaymentRes.body.amount).toBe(2000);

      // 4. Verify payment appears in payment history
      const viewPaymentsRes = await request(app.getHttpServer())
        .get('/payments')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(viewPaymentsRes.body.some((pmt: any) => pmt.amount === 2000)).toBe(true);
    });
  });

  describe('Performance Tests', () => {
    it('should respond to GET /payments/invoices quickly', async () => {
      const start = Date.now();

      await request(app.getHttpServer())
        .get('/payments/invoices')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(500); // Should respond in under 500ms
    });

    it('should handle concurrent requests', async () => {
      const requests = Array(10)
        .fill(null)
        .map(() =>
          request(app.getHttpServer())
            .get('/payments/invoices')
            .set('Authorization', `Bearer ${tenantToken}`)
        );

      const responses = await Promise.all(requests);
      responses.forEach((res) => {
        expect(res.status).toBe(200);
      });
    });
  });
});
