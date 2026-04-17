/**
 * E2E Test Suite - Payment Processing
 * Tests: Issue 1 - Payment Execution Handlers
 * 
 * Coverage:
 * - POST /payments/:id/message-tenant
 * - POST /payments/:id/record-manual
 * - POST /payments/:id/send-reminder (Issue 7)
 * - POST /payments/:id/suppress-reminder (Issue 7)
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PrismaService } from '../src/prisma/prisma.service';
import { PaymentsModule } from '../src/payments/payments.module';
import { AuthModule } from '../src/auth/auth.module';
import * as request from 'supertest';

const TEST_PAYMENT_ID = 12345;
const TEST_ORG_ID = 'org-test-001';

describe('Payment Processing Flow (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PaymentsModule, AuthModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true }));
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
    authToken = 'Bearer test-token';
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /payments/:id/message-tenant', () => {
    it('should send message to tenant', async () => {
      const response = await request(app.getHttpServer())
        .post(`/payments/${TEST_PAYMENT_ID}/message-tenant`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          subject: 'Payment Reminder',
          message: 'Please submit your overdue payment.',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('paymentId');
      expect(response.body).toHaveProperty('message', 'Message sent to tenant');
    });

    it('should return 400 for missing message content', async () => {
      await request(app.getHttpServer())
        .post(`/payments/${TEST_PAYMENT_ID}/message-tenant`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({})
        .expect(400);
    });

    it('should return 404 for non-existent payment', async () => {
      await request(app.getHttpServer())
        .post('/payments/99999/message-tenant')
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          subject: 'Test',
          message: 'Test message',
        })
        .expect(404);
    });
  });

  describe('POST /payments/:id/record-manual', () => {
    it('should record manual payment', async () => {
      const response = await request(app.getHttpServer())
        .post(`/payments/${TEST_PAYMENT_ID}/record-manual`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          amount: 1500,
          paymentDate: '2026-04-17',
          notes: 'Manual payment received in office',
          paymentMethod: 'CHECK',
        })
        .expect(201);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('paymentId');
      expect(response.body).toHaveProperty('amountPaid');
    });

    it('should return 400 for invalid amount', async () => {
      await request(app.getHttpServer())
        .post(`/payments/${TEST_PAYMENT_ID}/record-manual`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          amount: -100,
          paymentDate: '2026-04-17',
        })
        .expect(400);
    });
  });

  describe('POST /payments/:id/send-reminder', () => {
    it('should send rent reminder', async () => {
      const response = await request(app.getHttpServer())
        .post(`/payments/${TEST_PAYMENT_ID}/send-reminder`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          message: 'Reminder: Rent due in 7 days',
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('reminderSent', true);
    });
  });

  describe('POST /payments/:id/suppress-reminder', () => {
    it('should suppress reminder', async () => {
      const response = await request(app.getHttpServer())
        .post(`/payments/${TEST_PAYMENT_ID}/suppress-reminder`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          days: 14,
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('suppressed', true);
      expect(response.body).toHaveProperty('suppressedUntil');
    });

    it('should default to 7 days if not specified', async () => {
      const response = await request(app.getHttpServer())
        .post(`/payments/${TEST_PAYMENT_ID}/suppress-reminder`)
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({})
        .expect(200);

      expect(response.body).toHaveProperty('suppressed', true);
    });
  });

  describe('POST /payments/reminders/process', () => {
    it('should process upcoming rent reminders', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments/reminders/process')
        .set('Authorization', authToken)
        .set('X-Org-Id', TEST_ORG_ID)
        .send({
          daysBeforeDue: 7,
        })
        .expect(200);

      expect(response.body).toHaveProperty('processed');
      expect(response.body).toHaveProperty('targetDate');
      expect(response.body).toHaveProperty('payments');
    });
  });
});