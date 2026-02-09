import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { Role } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

/**
 * Regression: messaging endpoints under the production-like global prefix (/api)
 * must return bare JSON arrays (not wrapped objects).
 */
describe('Messaging API (e2e) — /api prefix response shape', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let tenantToken: string;
  let tenantUser: any;
  let propertyManager: any;

  function countExpressHandlers(method: string, path: string): number {
    // Express-only; this project uses @nestjs/platform-express.
    const server: any = app.getHttpAdapter().getInstance();
    const stack = server?._router?.stack ?? [];
    const target = method.toLowerCase();

    return stack.filter((layer: any) => {
      if (!layer.route) return false;
      const routePath = layer.route.path;
      const methods = layer.route.methods || {};
      return routePath === path && methods[target];
    }).length;
  }

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(new ValidationPipe());
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Optional but useful: fail fast if duplicate handlers are registered.
    expect(countExpressHandlers('GET', '/api/messaging/conversations')).toBe(1);
    expect(countExpressHandlers('GET', '/api/messaging/conversations/:id/messages')).toBe(1);
  });

  beforeEach(async () => {
    await resetDatabase(prisma);

    tenantUser = await prisma.user.create({
      data: TestDataFactory.createUser({
        username: 'tenant@test.com',
        role: Role.TENANT,
      }),
    });

    propertyManager = await prisma.user.create({
      data: TestDataFactory.createPropertyManager({
        username: 'pm@test.com',
      }),
    });

    const tenantLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ username: 'tenant@test.com', password: 'password123' })
      .expect(201);
    tenantToken = tenantLogin.body.accessToken;

    // Seed: one conversation with participants
    const conversation = await prisma.conversation.create({
      data: { subject: 'Test Conversation' },
    });

    await prisma.conversationParticipant.createMany({
      data: [
        { conversationId: conversation.id, userId: tenantUser.id },
        { conversationId: conversation.id, userId: propertyManager.id },
      ],
    });

    // Seed: one message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        senderId: tenantUser.id,
        content: 'Message 1',
      },
    });
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  it('GET /api/messaging/conversations returns a bare JSON array', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/messaging/conversations')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).not.toHaveProperty('conversations');
    expect(res.body).not.toHaveProperty('data');

    if (res.body.length > 0) {
      expect(res.body[0]).toEqual(expect.objectContaining({ id: expect.any(Number) }));
    }
  });

  it('GET /api/messaging/conversations/:id/messages returns a bare JSON array', async () => {
    const conversation = await prisma.conversation.findFirst({
      orderBy: { id: 'asc' },
    });
    expect(conversation).toBeTruthy();

    const res = await request(app.getHttpServer())
      .get(`/api/messaging/conversations/${conversation!.id}/messages`)
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).not.toHaveProperty('messages');
    expect(res.body).not.toHaveProperty('data');

    if (res.body.length > 0) {
      expect(res.body[0]).toEqual(expect.objectContaining({ content: expect.any(String) }));
    }
  });
});
