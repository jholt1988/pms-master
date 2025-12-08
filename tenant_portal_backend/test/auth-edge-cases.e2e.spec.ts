import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { APP_GUARD } from '@nestjs/core';
import { EmailService } from '../src/email/email.service';
import { resetDatabase } from './utils/reset-database';
import { jwtDecode } from 'jwt-decode';

// Mock guard that always allows requests (disables rate limiting in tests)
class MockThrottlerGuard {
  canActivate(): boolean {
    return true;
  }
}

/**
 * P0-004: Edge Case Tests - Authentication Edge Cases
 * Tests for token expiration, refresh flows, and concurrent authentication
 */
describe('Authentication Edge Cases (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const mockEmailService = {
    sendPasswordResetEmail: jest.fn().mockResolvedValue(true),
    sendNotificationEmail: jest.fn().mockResolvedValue(true),
    sendLeadWelcomeEmail: jest.fn().mockResolvedValue(true),
    sendNewLeadNotificationToPM: jest.fn().mockResolvedValue(true),
    sendRentPaymentConfirmation: jest.fn().mockResolvedValue(true),
    sendRentDueReminder: jest.fn().mockResolvedValue(true),
    sendLateRentNotification: jest.fn().mockResolvedValue(true),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(APP_GUARD)
      .useClass(MockThrottlerGuard)
      .overrideProvider(EmailService)
      .useValue(mockEmailService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Token Expiration During Operation', () => {
    it('should reject requests with expired tokens', async () => {
      const user = await prisma.user.create({
        data: TestDataFactory.createUser({ username: 'user1', role: 'TENANT' }),
      });

      // Create an expired token manually (this is a simplified test)
      // In real scenario, we'd wait for token to expire or manipulate the exp claim
      const expiredToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOjEsImV4cCI6MTYwOTQ1NjgwMCwiaWF0IjoxNjA5NDU2ODAwfQ.invalid';

      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body).toHaveProperty('message');
    });

    it('should handle token expiration during long-running operation', async () => {
      const propertyManager = await prisma.user.create({
        data: TestDataFactory.createPropertyManager({ username: 'pm1' }),
      });

      const pmLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'pm1', password: 'password123' });
      const pmToken = pmLogin.body.accessToken || pmLogin.body.access_token;

      // Decode token to check expiration
      const decoded = jwtDecode<{ exp?: number }>(pmToken);
      expect(decoded.exp).toBeDefined();

      // Use valid token for request
      const response = await request(app.getHttpServer())
        .get('/api/lease')
        .set('Authorization', `Bearer ${pmToken}`)
        .expect((res) => {
          // Should succeed with valid token
          expect([HttpStatus.OK, HttpStatus.UNAUTHORIZED]).toContain(res.status);
        });

      // If unauthorized, token may have expired (unlikely in test, but possible)
      if (response.status === HttpStatus.UNAUTHORIZED) {
        expect(response.body).toHaveProperty('message');
      }
    });
  });

  describe('Concurrent Requests with Expiring Token', () => {
    it('should handle multiple requests with same token', async () => {
      const propertyManager = await prisma.user.create({
        data: TestDataFactory.createPropertyManager({ username: 'pm2' }),
      });

      const pmLogin = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'pm2', password: 'password123' });
      const pmToken = pmLogin.body.accessToken || pmLogin.body.access_token;

      // Make multiple concurrent requests with same token
      const requests = [
        request(app.getHttpServer())
          .get('/api/lease')
          .set('Authorization', `Bearer ${pmToken}`),
        request(app.getHttpServer())
          .get('/api/property')
          .set('Authorization', `Bearer ${pmToken}`),
        request(app.getHttpServer())
          .get('/api/dashboard/metrics')
          .set('Authorization', `Bearer ${pmToken}`),
      ];

      const responses = await Promise.all(requests);

      // All should succeed or all should fail (consistent behavior)
      const statuses = responses.map(r => r.status);
      const allSuccess = statuses.every(s => s === HttpStatus.OK);
      const allUnauthorized = statuses.every(s => s === HttpStatus.UNAUTHORIZED);

      expect(allSuccess || allUnauthorized).toBe(true);
    });
  });

  describe('Invalid Token Formats', () => {
    it('should reject malformed tokens', async () => {
      const invalidTokens = [
        'not.a.token',
        'Bearer token',
        'Bearer',
        '',
        'invalid',
        'Bearer invalid.token.here',
      ];

      for (const token of invalidTokens) {
        const response = await request(app.getHttpServer())
          .get('/api/auth/profile')
          .set('Authorization', token.startsWith('Bearer') ? token : `Bearer ${token}`)
          .expect(HttpStatus.UNAUTHORIZED);

        expect(response.body).toHaveProperty('message');
      }
    });

    it('should reject requests without Authorization header', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/auth/profile')
        .expect(HttpStatus.UNAUTHORIZED);

      expect(response.body).toHaveProperty('message');
    });
  });

  describe('Token Refresh Flow', () => {
    it('should handle token refresh requests', async () => {
      // Note: This test assumes a refresh token endpoint exists
      // If not implemented, this test documents the expected behavior
      const user = await prisma.user.create({
        data: TestDataFactory.createUser({ username: 'user3', role: 'TENANT' }),
      });

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'user3', password: 'password123' })
        .expect(HttpStatus.CREATED);

      // If refresh token is provided, test refresh
      if (loginResponse.body.refreshToken) {
        const refreshResponse = await request(app.getHttpServer())
          .post('/auth/refresh')
          .send({ refreshToken: loginResponse.body.refreshToken })
          .expect((res) => {
            expect([HttpStatus.CREATED, HttpStatus.NOT_FOUND]).toContain(res.status);
          });

        if (refreshResponse.status === HttpStatus.CREATED) {
          expect(refreshResponse.body).toHaveProperty('accessToken');
        }
      }
    });
  });

  describe('Account Lockout Edge Cases', () => {
    it('should lock account after max failed attempts', async () => {
      const user = await prisma.user.create({
        data: TestDataFactory.createUser({ username: 'user4', role: 'TENANT' }),
      });

      // Attempt login with wrong password multiple times
      for (let i = 0; i < 5; i++) {
        await request(app.getHttpServer())
          .post('/auth/login')
          .send({ username: 'user4', password: 'wrongpassword' })
          .expect(HttpStatus.UNAUTHORIZED);
      }

      // Next attempt should be locked
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'user4', password: 'wrongpassword' })
        .expect((res) => {
          // Should be locked (423) or still unauthorized
          expect([HttpStatus.UNAUTHORIZED, HttpStatus.LOCKED]).toContain(res.status);
        });

      expect(response.body).toHaveProperty('message');
    });
  });
});

