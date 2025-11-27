import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { TestDataFactory } from './factories';
import { Role } from '@prisma/client';
import { resetDatabase } from './utils/reset-database';

describe('Property API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let propertyManagerToken: string;
  let propertyManager: any;

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

    propertyManager = await prisma.user.create({
      data: TestDataFactory.createPropertyManager({
        username: 'pm@test.com',
      }),
    });

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ username: 'pm@test.com', password: 'password123' });
    propertyManagerToken = loginResponse.body.accessToken;
  });

  afterAll(async () => {
    await resetDatabase(prisma);
    await app.close();
  });

  describe('POST /property', () => {
    it('should create property', async () => {
      const response = await request(app.getHttpServer())
        .post('/property')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .send({
          name: 'Test Apartments',
          address: '123 Test St',
          city: 'Test City',
          state: 'CA',
          zipCode: '12345',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('Test Apartments');
    });
  });

  describe('GET /property', () => {
    beforeEach(async () => {
      await prisma.property.create({
        data: TestDataFactory.createProperty(),
      });
    });

    it('should get all properties', async () => {
      const response = await request(app.getHttpServer())
        .get('/property')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('GET /property/public', () => {
    beforeEach(async () => {
      await prisma.property.create({
        data: TestDataFactory.createProperty({
          name: 'Public Property',
        }),
      });
    });

    it('should get public properties without authentication', async () => {
      const response = await request(app.getHttpServer())
        .get('/property/public')
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });
});

