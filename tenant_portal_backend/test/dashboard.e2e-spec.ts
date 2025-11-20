import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CreateUserDto } from '../src/users/dto/create-user.dto';
import { Role } from '@prisma/client';
import { AuthService } from '../src/auth/auth.service';

describe('Dashboard (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;
  let propertyManagerToken: string;
  let tenantToken: string;
  let propertyManagerId: number;
  let tenantId: number;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    authService = app.get(AuthService);

    // Create a property manager and a tenant
    const propertyManagerDto: CreateUserDto = {
      username: 'manager_dashboard_test',
      password: 'Password123!',
      role: Role.PROPERTY_MANAGER,
    };
    const propertyManager = await prisma.user.create({ data: { ...propertyManagerDto, email: 'manager_dashboard_test@test.com' } });
    propertyManagerId = propertyManager.id;

    const tenantDto: CreateUserDto = {
      username: 'tenant_dashboard_test',
      password: 'Password123!',
      role: Role.TENANT,
    };
    const tenant = await prisma.user.create({ data: { ...tenantDto, email: 'tenant_dashboard_test@test.com' } });
    tenantId = tenant.id;

    // Get tokens
    propertyManagerToken = (await authService.login(propertyManagerDto, {})).accessToken;
    tenantToken = (await authService.login(tenantDto, {})).accessToken;
  });

  afterAll(async () => {
    await prisma.user.deleteMany({ where: { id: { in: [propertyManagerId, tenantId] } } });
    await app.close();
  });

  describe('/api/dashboard/metrics (GET)', () => {
    it('should return dashboard metrics for property manager', () => {
      return request(app.getHttpServer())
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body).toHaveProperty('totalProperties');
          expect(res.body).toHaveProperty('totalUnits');
          expect(res.body).toHaveProperty('occupancyRate');
          expect(res.body).toHaveProperty('totalTenants');
          expect(res.body).toHaveProperty('openMaintenanceRequests');
          expect(res.body).toHaveProperty('overdueRent');
        });
    });

    it('should return 403 for tenant', () => {
      return request(app.getHttpServer())
        .get('/api/dashboard/metrics')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(403);
    });
  });

  describe('/api/dashboard/tenant (GET)', () => {
    it('should return dashboard data for tenant', () => {
      return request(app.getHttpServer())
        .get('/api/dashboard/tenant')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200)
        .then((res) => {
          expect(res.body).toHaveProperty('lease');
          expect(res.body).toHaveProperty('payments');
          expect(res.body).toHaveProperty('maintenanceRequests');
          });
    });

    it('should also allow /api/tenant/dashboard for tenant', () => {
      return request(app.getHttpServer())
        .get('/api/tenant/dashboard')
        .set('Authorization', `Bearer ${tenantToken}`)
        .expect(200);
    });

    it('should return 403 for property manager', () => {
      return request(app.getHttpServer())
        .get('/api/dashboard/tenant')
        .set('Authorization', `Bearer ${propertyManagerToken}`)
        .expect(403);
    });
  });
});
