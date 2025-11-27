import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { resetDatabase } from './utils/reset-database';

describe('Leasing Agent API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let pmToken: string;
  let propertyManager: any;
  let property: any;
  let unit: any;
  let lead: any;

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

    // Create test property manager
    propertyManager = await prisma.user.create({
      data: TestDataFactory.createPropertyManager({
        username: 'pm@test.com',
      }),
    });

    // Create test property
    property = await prisma.property.create({
      data: TestDataFactory.createProperty(),
    });

    // Create test unit
    unit = await prisma.unit.create({
      data: TestDataFactory.createUnit(property.id),
    });

    // Login to get token
    const pmLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        username: 'pm@test.com',
        password: 'password123',
      });
    pmToken = pmLogin.body.access_token;
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  describe('POST /leasing/leads', () => {
    it('should create a new lead successfully', async () => {
      const response = await request(app.getHttpServer())
        .post('/leasing/leads')
        .send({
          sessionId: 'test-session-123',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '555-1234',
          preferredContactMethod: 'EMAIL',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.sessionId).toBe('test-session-123');
      expect(response.body.name).toBe('John Doe');
      expect(response.body.email).toBe('john@example.com');
      expect(response.body.status).toBe('NEW');
    });

    it('should update existing lead with same sessionId', async () => {
      // Create initial lead
      await request(app.getHttpServer())
        .post('/leasing/leads')
        .send({
          sessionId: 'test-session-456',
          name: 'Jane Smith',
          email: 'jane@example.com',
        })
        .expect(201);

      // Update with same sessionId
      const response = await request(app.getHttpServer())
        .post('/leasing/leads')
        .send({
          sessionId: 'test-session-456',
          name: 'Jane Smith Updated',
          phone: '555-9999',
        })
        .expect(201);

      expect(response.body.name).toBe('Jane Smith Updated');
      expect(response.body.phone).toBe('555-9999');
    });

    it('should reject request without sessionId', async () => {
      const response = await request(app.getHttpServer())
        .post('/leasing/leads')
        .send({
          name: 'Test User',
          email: 'test@example.com',
        })
        .expect(400);

      expect(response.body.message).toContain('sessionId');
    });
  });

  describe('GET /leasing/leads/session/:sessionId', () => {
    it('should return lead by session ID', async () => {
      // Create lead
      const createResponse = await request(app.getHttpServer())
        .post('/leasing/leads')
        .send({
          sessionId: 'test-session-789',
          name: 'Bob Johnson',
          email: 'bob@example.com',
        });

      const leadId = createResponse.body.id;

      // Retrieve by session ID
      const response = await request(app.getHttpServer())
        .get('/leasing/leads/session/test-session-789')
        .expect(200);

      expect(response.body.id).toBe(leadId);
      expect(response.body.sessionId).toBe('test-session-789');
      expect(response.body.name).toBe('Bob Johnson');
    });

    it('should return 404 for non-existent session', async () => {
      await request(app.getHttpServer())
        .get('/leasing/leads/session/non-existent-session')
        .expect(404);
    });
  });

  describe('GET /leasing/leads/:id', () => {
    it('should return lead by ID with relations', async () => {
      // Create lead
      const createResponse = await request(app.getHttpServer())
        .post('/leasing/leads')
        .send({
          sessionId: 'test-session-abc',
          name: 'Alice Williams',
          email: 'alice@example.com',
        });

      const leadId = createResponse.body.id;

      // Add a message
      await request(app.getHttpServer())
        .post(`/leasing/leads/${leadId}/messages`)
        .send({
          role: 'USER',
          content: 'Hello, I am interested in a 2-bedroom apartment',
        });

      // Retrieve with relations
      const response = await request(app.getHttpServer())
        .get(`/leasing/leads/${leadId}`)
        .expect(200);

      expect(response.body.id).toBe(leadId);
      expect(response.body.messages).toHaveLength(1);
      expect(response.body.messages[0].content).toContain('2-bedroom');
    });

    it('should return 404 for non-existent lead ID', async () => {
      await request(app.getHttpServer())
        .get('/leasing/leads/99999')
        .expect(404);
    });
  });

  describe('GET /leasing/leads', () => {
    beforeEach(async () => {
      // Create multiple leads for filtering tests
      await prisma.lead.createMany({
        data: [
          {
            sessionId: 'session-1',
            name: 'Lead One',
            email: 'lead1@test.com',
            status: 'NEW',
          },
          {
            sessionId: 'session-2',
            name: 'Lead Two',
            email: 'lead2@test.com',
            status: 'CONTACTED',
          },
          {
            sessionId: 'session-3',
            name: 'Lead Three',
            email: 'lead3@test.com',
            status: 'QUALIFIED',
          },
        ],
      });
    });

    it('should return all leads without filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/leasing/leads')
        .set('Authorization', `Bearer ${pmToken}`)
        .expect(200);

      expect(response.body.leads).toHaveLength(3);
      expect(response.body.total).toBe(3);
    });

    it('should filter leads by status', async () => {
      const response = await request(app.getHttpServer())
        .get('/leasing/leads?status=QUALIFIED')
        .set('Authorization', `Bearer ${pmToken}`)
        .expect(200);

      expect(response.body.leads).toHaveLength(1);
      expect(response.body.leads[0].status).toBe('QUALIFIED');
    });

    it('should search leads by name', async () => {
      const response = await request(app.getHttpServer())
        .get('/leasing/leads?search=Lead Two')
        .set('Authorization', `Bearer ${pmToken}`)
        .expect(200);

      expect(response.body.leads).toHaveLength(1);
      expect(response.body.leads[0].name).toBe('Lead Two');
    });

    it('should apply pagination', async () => {
      const response = await request(app.getHttpServer())
        .get('/leasing/leads?page=1&limit=2')
        .set('Authorization', `Bearer ${pmToken}`)
        .expect(200);

      expect(response.body.leads).toHaveLength(2);
      expect(response.body.page).toBe(1);
      expect(response.body.limit).toBe(2);
      expect(response.body.total).toBe(3);
    });
  });

  describe('POST /leasing/leads/:id/messages', () => {
    beforeEach(async () => {
      // Create a lead for message tests
      lead = await prisma.lead.create({
        data: {
          sessionId: 'msg-session-1',
          name: 'Message Test User',
          email: 'msgtest@example.com',
        },
      });
    });

    it('should add user message to conversation', async () => {
      const response = await request(app.getHttpServer())
        .post(`/leasing/leads/${lead.id}/messages`)
        .send({
          role: 'USER',
          content: 'I need a pet-friendly apartment',
        })
        .expect(201);

      expect(response.body.role).toBe('USER');
      expect(response.body.content).toBe('I need a pet-friendly apartment');
      expect(response.body.leadId).toBe(lead.id);
    });

    it('should add assistant message with metadata', async () => {
      const response = await request(app.getHttpServer())
        .post(`/leasing/leads/${lead.id}/messages`)
        .send({
          role: 'ASSISTANT',
          content: 'Here are some pet-friendly options',
          metadata: {
            propertiesShown: 3,
            source: 'ai-agent',
          },
        })
        .expect(201);

      expect(response.body.role).toBe('ASSISTANT');
      expect(response.body.metadata).toEqual({
        propertiesShown: 3,
        source: 'ai-agent',
      });
    });

    it('should reject message without role', async () => {
      const response = await request(app.getHttpServer())
        .post(`/leasing/leads/${lead.id}/messages`)
        .send({
          content: 'Message without role',
        })
        .expect(400);

      expect(response.body.message).toContain('role');
    });

    it('should reject message without content', async () => {
      const response = await request(app.getHttpServer())
        .post(`/leasing/leads/${lead.id}/messages`)
        .send({
          role: 'USER',
        })
        .expect(400);

      expect(response.body.message).toContain('content');
    });
  });

  describe('GET /leasing/leads/:id/messages', () => {
    beforeEach(async () => {
      // Create lead with messages
      lead = await prisma.lead.create({
        data: {
          sessionId: 'conv-session-1',
          name: 'Conversation Test',
          email: 'conv@test.com',
        },
      });

      await prisma.leadMessage.createMany({
        data: [
          {
            leadId: lead.id,
            role: 'USER',
            content: 'First message',
          },
          {
            leadId: lead.id,
            role: 'ASSISTANT',
            content: 'Response to first message',
          },
          {
            leadId: lead.id,
            role: 'USER',
            content: 'Second message',
          },
        ],
      });
    });

    it('should return conversation history in order', async () => {
      const response = await request(app.getHttpServer())
        .get(`/leasing/leads/${lead.id}/messages`)
        .expect(200);

      expect(response.body).toHaveLength(3);
      expect(response.body[0].content).toBe('First message');
      expect(response.body[1].content).toBe('Response to first message');
      expect(response.body[2].content).toBe('Second message');
    });
  });

  describe('POST /leasing/leads/:id/properties/search', () => {
    it('should search properties by criteria', async () => {
      // Create lead
      lead = await prisma.lead.create({
        data: {
          sessionId: 'search-session-1',
          name: 'Property Search User',
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/leasing/leads/${lead.id}/properties/search`)
        .send({
          bedrooms: 2,
          maxRent: 2000,
          petFriendly: true,
        })
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Verify properties returned match criteria
      response.body.forEach((prop: any) => {
        expect(prop.bedrooms).toBe(2);
        expect(prop.rent).toBeLessThanOrEqual(2000);
        expect(prop.petFriendly).toBe(true);
      });
    });

    it('should return available properties with no criteria', async () => {
      lead = await prisma.lead.create({
        data: {
          sessionId: 'search-session-2',
          name: 'Browse All User',
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/leasing/leads/${lead.id}/properties/search`)
        .send({})
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Should only return available properties
      response.body.forEach((prop: any) => {
        expect(prop.status).toBe('AVAILABLE');
      });
    });
  });

  describe('POST /leasing/leads/:id/inquiries', () => {
    beforeEach(async () => {
      lead = await prisma.lead.create({
        data: {
          sessionId: 'inquiry-session-1',
          name: 'Inquiry Test User',
          email: 'inquiry@test.com',
        },
      });
    });

    it('should record property inquiry successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/leasing/leads/${lead.id}/inquiries`)
        .send({
          propertyId: property.id,
          unitId: unit.id,
          interestLevel: 'HIGH',
        })
        .expect(201);

      expect(response.body.propertyId).toBe(property.id);
      expect(response.body.unitId).toBe(unit.id);
      expect(response.body.interestLevel).toBe('HIGH');
    });

    it('should record inquiry without specific unit', async () => {
      const response = await request(app.getHttpServer())
        .post(`/leasing/leads/${lead.id}/inquiries`)
        .send({
          propertyId: property.id,
          interestLevel: 'MEDIUM',
        })
        .expect(201);

      expect(response.body.propertyId).toBe(property.id);
      expect(response.body.unitId).toBeNull();
      expect(response.body.interestLevel).toBe('MEDIUM');
    });

    it('should reject inquiry without propertyId', async () => {
      const response = await request(app.getHttpServer())
        .post(`/leasing/leads/${lead.id}/inquiries`)
        .send({
          unitId: unit.id,
        })
        .expect(400);

      expect(response.body.message).toContain('propertyId');
    });
  });

  describe('PATCH /leasing/leads/:id/status', () => {
    beforeEach(async () => {
      lead = await prisma.lead.create({
        data: {
          sessionId: 'status-session-1',
          name: 'Status Update User',
          status: 'NEW',
        },
      });
    });

    it('should update lead status successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/leasing/leads/${lead.id}/status`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          status: 'CONTACTED',
        })
        .expect(200);

      expect(response.body.status).toBe('CONTACTED');
    });

    it('should set convertedAt when status is CONVERTED', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/leasing/leads/${lead.id}/status`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          status: 'CONVERTED',
        })
        .expect(200);

      expect(response.body.status).toBe('CONVERTED');
      expect(response.body.convertedAt).toBeDefined();
    });

    it('should reject invalid status', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/leasing/leads/${lead.id}/status`)
        .set('Authorization', `Bearer ${pmToken}`)
        .send({
          status: 'INVALID_STATUS',
        })
        .expect(400);

      expect(response.body.message).toBeDefined();
    });

    it('should require authentication for status updates', async () => {
      await request(app.getHttpServer())
        .patch(`/leasing/leads/${lead.id}/status`)
        .send({
          status: 'CONTACTED',
        })
        .expect(401);
    });
  });

  describe('GET /leasing/statistics', () => {
    beforeEach(async () => {
      // Create leads with different statuses
    const today = new Date();
    const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    await prisma.lead.create({
      data: {
        sessionId: 'stats-1',
        name: 'Stats Lead 1',
        status: 'NEW',
        createdAt: today,
      },
    });

    await prisma.lead.create({
      data: {
        sessionId: 'stats-2',
        name: 'Stats Lead 2',
        status: 'QUALIFIED',
        createdAt: today,
      },
    });

    await prisma.lead.create({
      data: {
        sessionId: 'stats-3',
        name: 'Stats Lead 3',
        status: 'CONVERTED',
        convertedAt: lastWeek,
        createdAt: lastWeek,
      },
    });

    await prisma.lead.create({
      data: {
        sessionId: 'stats-4',
        name: 'Stats Lead 4',
        status: 'LOST',
        createdAt: lastMonth,
      },
    });
    });

    it('should return lead statistics without date filters', async () => {
      const response = await request(app.getHttpServer())
        .get('/leasing/statistics')
        .set('Authorization', `Bearer ${pmToken}`)
        .expect(200);

      expect(response.body.totalLeads).toBe(4);
      expect(response.body.newLeads).toBeGreaterThan(0);
      expect(response.body.qualifiedLeads).toBeGreaterThan(0);
      expect(response.body.convertedLeads).toBe(1);
      expect(response.body.conversionRate).toBe(25); // 1/4 = 25%
    });

    it('should filter statistics by date range', async () => {
      const startDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app.getHttpServer())
        .get(`/leasing/statistics?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', `Bearer ${pmToken}`)
        .expect(200);

      // Should only include leads from last 10 days (not the 30-day old one)
      expect(response.body.totalLeads).toBeLessThanOrEqual(3);
    });

    it('should require authentication', async () => {
      await request(app.getHttpServer())
        .get('/leasing/statistics')
        .expect(401);
    });
  });
});
