import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { Role, NotificationType } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

describe('Notifications API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantToken: string;
  let tenantUser: any;

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
      data: TestDataFactory.createUser({
        username: 'tenant@test.com',
        role: Role.TENANT,
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

  describe('GET /notifications', () => {
    beforeEach(async () => {
      await prisma.notification.create({
        data: {
          userId: tenantUser.id,
          type: NotificationType.NEW_MESSAGE,
          title: 'Test Notification',
          message: 'This is a test notification',
        },
      });
    });

    it('should get notifications for user', async () => {
      const response = await request(app.getHttpServer())
        .get('/notifications')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      if (response.body.length > 0) {
        expect(response.body[0]).toHaveProperty('id');
        expect(response.body[0]).toHaveProperty('title');
      }
    });
  });

  describe('PUT /notifications/:id/read', () => {
    let notification: any;

    beforeEach(async () => {
      notification = await prisma.notification.create({
        data: {
          userId: tenantUser.id,
          type: NotificationType.NEW_MESSAGE,
          title: 'Test Notification',
          message: 'This is a test notification',
          read: false,
        },
      });
    });

    it('should mark notification as read', async () => {
      const response = await request(app.getHttpServer())
        .put(`/notifications/${notification.id}/read`)
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);

      expect(response.body.read).toBe(true);
    });
  });
});

