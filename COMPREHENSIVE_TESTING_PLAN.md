# Comprehensive Testing Plan - Property Management Suite

**Version:** 1.0  
**Date:** November 9, 2025  
**Status:** Ready for Implementation

---

## 📋 Table of Contents

1. [Testing Strategy Overview](#testing-strategy-overview)
2. [Test Environment Setup](#test-environment-setup)
3. [Unit Testing Plan](#unit-testing-plan)
4. [Integration Testing Plan](#integration-testing-plan)
5. [End-to-End Testing Plan](#end-to-end-testing-plan)
6. [API Testing Plan](#api-testing-plan)
7. [Email Notification Testing](#email-notification-testing)
8. [AI Features Testing](#ai-features-testing)
9. [Performance Testing](#performance-testing)
10. [Security Testing](#security-testing)
11. [Test Data Management](#test-data-management)
12. [Continuous Integration](#continuous-integration)
13. [Test Reporting](#test-reporting)

---

## 🎯 Testing Strategy Overview

### Testing Pyramid

```
                    /\
                   /  \
                  / E2E \
                 /--------\
                /          \
               / Integration \
              /--------------\
             /                \
            /   Unit Tests     \
           /____________________\
```

**Test Coverage Goals:**
- Unit Tests: 80%+ code coverage
- Integration Tests: All API endpoints
- E2E Tests: All critical user workflows
- Performance Tests: Response time < 200ms for 95% of requests

### Testing Tools Stack

**Backend Testing:**
- Jest - Unit & Integration testing
- Supertest - API endpoint testing
- Artillery - Load/performance testing
- Prisma Test Client - Database testing

**Frontend Testing:**
- Jest - Unit testing
- React Testing Library - Component testing
- Cypress - E2E testing
- MSW (Mock Service Worker) - API mocking

**Email Testing:**
- Ethereal Email - Email capture and validation
- MailHog - Local SMTP testing

**API Testing:**
- Postman/Newman - API testing & automation
- Swagger/OpenAPI - API documentation testing

---

## 🔧 Test Environment Setup

### 1. Test Database Configuration

**Create Test Database:**
```bash
# PostgreSQL
createdb property_management_test

# Update .env.test
DATABASE_URL="postgresql://user:password@localhost:5432/property_management_test"
NODE_ENV=test
```

**Test Database Seeding:**
```typescript
// prisma/seed-test.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedTestData() {
  // Create test users
  const testTenant = await prisma.user.create({
    data: {
      username: 'tenant@test.com',
      password: 'hashed_password',
      role: 'TENANT',
    },
  });

  const testPM = await prisma.user.create({
    data: {
      username: 'pm@test.com',
      password: 'hashed_password',
      role: 'PROPERTY_MANAGER',
    },
  });

  // Create test property
  const testProperty = await prisma.property.create({
    data: {
      name: 'Test Property',
      address: '123 Test St',
      city: 'Test City',
      state: 'TS',
      zipCode: '12345',
    },
  });

  // Create test unit
  const testUnit = await prisma.unit.create({
    data: {
      propertyId: testProperty.id,
      unitNumber: '101',
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 1000,
      status: 'VACANT',
    },
  });

  // Create test lease
  const testLease = await prisma.lease.create({
    data: {
      tenantId: testTenant.id,
      unitId: testUnit.id,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
      rentAmount: 1500,
      status: 'ACTIVE',
    },
  });

  console.log('Test data seeded successfully');
}

seedTestData()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
```

**Run seed:**
```bash
npx ts-node prisma/seed-test.ts
```

### 2. Test Configuration Files

**jest.config.js (Backend):**
```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.ts', '**/?(*.)+(spec|test).ts'],
  transform: {
    '^.+\\.ts$': 'ts-jest',
  },
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/*.interface.ts',
    '!src/main.ts',
  ],
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  setupFilesAfterEnv: ['<rootDir>/test/setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

**test/setup.ts:**
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Clear test database before running tests
  await prisma.$executeRaw`TRUNCATE TABLE "User" CASCADE`;
  await prisma.$executeRaw`TRUNCATE TABLE "Property" CASCADE`;
  // ... truncate other tables
});

afterAll(async () => {
  await prisma.$disconnect();
});
```

**cypress.config.ts (Frontend):**
```typescript
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
    },
    env: {
      apiUrl: 'http://localhost:3001',
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});
```

---

## 🧪 Unit Testing Plan

### Backend Unit Tests

#### 1. Service Layer Tests

**Location:** `src/**/*.service.spec.ts`

**Example: PaymentsService Tests**
```typescript
// src/payments/payments.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsService } from './payments.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

describe('PaymentsService', () => {
  let service: PaymentsService;
  let prismaService: PrismaService;
  let emailService: EmailService;

  const mockPrismaService = {
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    payment: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };

  const mockEmailService = {
    sendRentPaymentConfirmation: jest.fn(),
    sendRentDueReminder: jest.fn(),
    sendLateRentNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: EmailService, useValue: mockEmailService },
      ],
    }).compile();

    service = module.get<PaymentsService>(PaymentsService);
    prismaService = module.get<PrismaService>(PrismaService);
    emailService = module.get<EmailService>(EmailService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createInvoice', () => {
    it('should create an invoice successfully', async () => {
      const mockInvoice = {
        id: 1,
        description: 'Monthly Rent',
        amount: 1500,
        dueDate: new Date('2025-12-01'),
        leaseId: 1,
        status: 'UNPAID',
      };

      mockPrismaService.lease.findUnique.mockResolvedValue({ id: 1 });
      mockPrismaService.invoice.create.mockResolvedValue(mockInvoice);

      const result = await service.createInvoice({
        description: 'Monthly Rent',
        amount: 1500,
        dueDate: '2025-12-01',
        leaseId: 1,
      });

      expect(result).toEqual(mockInvoice);
      expect(mockPrismaService.invoice.create).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException when lease not found', async () => {
      mockPrismaService.lease.findUnique.mockResolvedValue(null);

      await expect(
        service.createInvoice({
          description: 'Monthly Rent',
          amount: 1500,
          dueDate: '2025-12-01',
          leaseId: 999,
        })
      ).rejects.toThrow('Lease not found');
    });
  });

  describe('createPayment', () => {
    it('should create payment and send confirmation email', async () => {
      const mockLease = {
        id: 1,
        tenantId: 1,
        tenant: { id: 1, username: 'tenant@test.com' },
        unit: { unitNumber: '101', property: { address: '123 Test St' } },
      };

      const mockPayment = {
        id: 1,
        amount: 1500,
        status: 'COMPLETED',
        paymentDate: new Date(),
        leaseId: 1,
        userId: 1,
      };

      mockPrismaService.lease.findUnique.mockResolvedValue(mockLease);
      mockPrismaService.payment.create.mockResolvedValue(mockPayment);
      mockEmailService.sendRentPaymentConfirmation.mockResolvedValue(undefined);

      const result = await service.createPayment({
        amount: 1500,
        leaseId: 1,
        status: 'COMPLETED',
      });

      expect(result).toEqual(mockPayment);
      expect(mockEmailService.sendRentPaymentConfirmation).toHaveBeenCalledTimes(1);
    });
  });

  describe('sendRentDueReminders (Cron Job)', () => {
    it('should send reminders for upcoming invoices', async () => {
      const mockInvoices = [
        {
          id: 1,
          amount: 1500,
          dueDate: new Date(),
          status: 'UNPAID',
          lease: {
            tenant: { id: 1, username: 'tenant@test.com' },
            unit: { unitNumber: '101', property: { address: '123 Test St' } },
          },
        },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);
      mockEmailService.sendRentDueReminder.mockResolvedValue(undefined);

      await service.sendRentDueReminders();

      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledTimes(1);
      expect(mockEmailService.sendRentDueReminder).toHaveBeenCalledTimes(1);
    });
  });
});
```

**Test Coverage Requirements:**
- ✅ All service methods
- ✅ Error handling (NotFoundException, BadRequestException)
- ✅ Edge cases (null values, empty arrays)
- ✅ Async operations
- ✅ Database interactions (mocked)
- ✅ Email sending (mocked)

#### 2. Controller Tests

**Example: PaymentsController Tests**
```typescript
// src/payments/payments.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let service: PaymentsService;

  const mockPaymentsService = {
    createInvoice: jest.fn(),
    getInvoicesForUser: jest.fn(),
    createPayment: jest.fn(),
    getPaymentsForUser: jest.fn(),
    testRentDueReminder: jest.fn(),
    testLateRentNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [
        { provide: PaymentsService, useValue: mockPaymentsService },
      ],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
    service = module.get<PaymentsService>(PaymentsService);
  });

  describe('createInvoice', () => {
    it('should create invoice', async () => {
      const dto = {
        description: 'Rent',
        amount: 1500,
        dueDate: '2025-12-01',
        leaseId: 1,
      };

      mockPaymentsService.createInvoice.mockResolvedValue({ id: 1, ...dto });

      const result = await controller.createInvoice(dto);

      expect(result).toHaveProperty('id');
      expect(mockPaymentsService.createInvoice).toHaveBeenCalledWith(dto);
    });
  });

  describe('getInvoices', () => {
    it('should return invoices for tenant', async () => {
      const mockRequest = { user: { userId: 1, role: 'TENANT' } };
      const mockInvoices = [{ id: 1, amount: 1500 }];

      mockPaymentsService.getInvoicesForUser.mockResolvedValue(mockInvoices);

      const result = await controller.getInvoices(mockRequest as any);

      expect(result).toEqual(mockInvoices);
      expect(mockPaymentsService.getInvoicesForUser).toHaveBeenCalledWith(1, 'TENANT', undefined);
    });
  });
});
```

#### 3. Email Service Tests

**Example: EmailService Tests**
```typescript
// src/email/email.service.spec.ts
describe('EmailService', () => {
  let service: EmailService;
  let configService: ConfigService;

  const mockConfigService = {
    get: jest.fn((key, defaultValue) => {
      const config = {
        SMTP_HOST: 'smtp.test.com',
        SMTP_PORT: '587',
        SMTP_USER: 'test@test.com',
        SMTP_PASS: 'password',
        SMTP_FROM: 'noreply@test.com',
        APP_URL: 'http://localhost:3000',
      };
      return config[key] || defaultValue;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EmailService,
        { provide: ConfigService, useValue: mockConfigService },
      ],
    }).compile();

    service = module.get<EmailService>(EmailService);
  });

  describe('sendRentDueReminder', () => {
    it('should send rent due reminder email', async () => {
      const tenant = { email: 'tenant@test.com', firstName: 'John' };
      const lease = {
        unit: { unitNumber: '101', property: { address: '123 Test St' } },
      };
      const payment = { amount: 1500, dueDate: new Date('2025-12-01') };

      // Mock transporter
      const sendMailSpy = jest.spyOn(service['transporter'], 'sendMail')
        .mockResolvedValue({ messageId: 'test-id' } as any);

      await service.sendRentDueReminder(tenant, lease, payment);

      expect(sendMailSpy).toHaveBeenCalledTimes(1);
      expect(sendMailSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'tenant@test.com',
          subject: expect.stringContaining('Rent Payment Reminder'),
        })
      );
    });
  });
});
```

### Frontend Unit Tests

#### 1. Component Tests

**Example: LeasingAgentBot Component**
```typescript
// src/components/LeasingAgentBot.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeasingAgentBot } from './LeasingAgentBot';
import { LeasingAgentService } from '../services/LeasingAgentService';

jest.mock('../services/LeasingAgentService');

describe('LeasingAgentBot', () => {
  const mockService = LeasingAgentService as jest.Mocked<typeof LeasingAgentService>;

  beforeEach(() => {
    mockService.prototype.initConversation.mockResolvedValue({
      content: 'Welcome message',
      timestamp: new Date(),
    });
  });

  it('should render chatbot interface', () => {
    render(<LeasingAgentBot />);
    expect(screen.getByText(/AI Leasing Agent/i)).toBeInTheDocument();
  });

  it('should send message when user types and clicks send', async () => {
    mockService.prototype.sendMessage.mockResolvedValue({
      content: 'Bot response',
      timestamp: new Date(),
    });

    render(<LeasingAgentBot />);

    const input = screen.getByPlaceholderText(/Type your message/i);
    const sendButton = screen.getByRole('button', { name: /send/i });

    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.click(sendButton);

    await waitFor(() => {
      expect(screen.getByText('Hello')).toBeInTheDocument();
      expect(screen.getByText('Bot response')).toBeInTheDocument();
    });
  });

  it('should handle quick action buttons', async () => {
    mockService.prototype.sendMessage.mockResolvedValue({
      content: 'Browse properties response',
      timestamp: new Date(),
    });

    render(<LeasingAgentBot />);

    const browseButton = screen.getByText(/Browse Properties/i);
    fireEvent.click(browseButton);

    await waitFor(() => {
      expect(mockService.prototype.sendMessage).toHaveBeenCalledWith(
        expect.any(String),
        'I want to browse available properties'
      );
    });
  });
});
```

#### 2. Service Tests

**Example: LeasingAgentService Tests**
```typescript
// src/services/LeasingAgentService.test.ts
describe('LeasingAgentService', () => {
  let service: LeasingAgentService;

  beforeEach(() => {
    service = new LeasingAgentService();
  });

  describe('extractLeadInfo', () => {
    it('should extract name from message', () => {
      const message = "Hi, I'm John Smith";
      service.sendMessage('session-1', message);
      
      const leadInfo = service.getLeadInfo('session-1');
      expect(leadInfo.name).toBe('John Smith');
    });

    it('should extract email from message', () => {
      const message = 'My email is john@example.com';
      service.sendMessage('session-1', message);
      
      const leadInfo = service.getLeadInfo('session-1');
      expect(leadInfo.email).toBe('john@example.com');
    });

    it('should extract budget from various formats', () => {
      const testCases = [
        { message: 'Budget is $1500', expected: 1500 },
        { message: 'I can afford 1800 per month', expected: 1800 },
        { message: 'Between $1200 and $1500', expected: 1200 },
      ];

      testCases.forEach(({ message, expected }) => {
        const sessionId = `session-${Math.random()}`;
        service.sendMessage(sessionId, message);
        const leadInfo = service.getLeadInfo(sessionId);
        expect(leadInfo.budget).toBe(expected);
      });
    });
  });
});
```

---

## 🔗 Integration Testing Plan

### Backend Integration Tests

**Test API endpoints with real database**

#### 1. Authentication Flow

```typescript
// test/auth.e2e-spec.ts
import { Test } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';

describe('Authentication (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('/auth/register (POST)', () => {
    it('should register a new user', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'newuser@test.com',
          password: 'SecurePass123!',
          role: 'TENANT',
        })
        .expect(201)
        .expect((res) => {
          expect(res.body).toHaveProperty('id');
          expect(res.body.username).toBe('newuser@test.com');
          expect(res.body).not.toHaveProperty('password');
        });
    });

    it('should reject duplicate username', () => {
      return request(app.getHttpServer())
        .post('/auth/register')
        .send({
          username: 'newuser@test.com',
          password: 'SecurePass123!',
          role: 'TENANT',
        })
        .expect(409);
    });
  });

  describe('/auth/login (POST)', () => {
    it('should login with valid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'newuser@test.com',
          password: 'SecurePass123!',
        })
        .expect(200)
        .expect((res) => {
          expect(res.body).toHaveProperty('access_token');
          expect(res.body).toHaveProperty('user');
        });
    });

    it('should reject invalid credentials', () => {
      return request(app.getHttpServer())
        .post('/auth/login')
        .send({
          username: 'newuser@test.com',
          password: 'WrongPassword',
        })
        .expect(401);
    });
  });
});
```

#### 2. Payments Workflow

```typescript
// test/payments.e2e-spec.ts
describe('Payments Workflow (e2e)', () => {
  let app: INestApplication;
  let pmToken: string;
  let tenantToken: string;
  let leaseId: number;

  beforeAll(async () => {
    // Setup app and authenticate users
    // Create test lease
  });

  it('PM creates invoice', () => {
    return request(app.getHttpServer())
      .post('/payments/invoices')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        description: 'December Rent',
        amount: 1500,
        dueDate: '2025-12-01',
        leaseId: leaseId,
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.id).toBeDefined();
        expect(res.body.amount).toBe(1500);
      });
  });

  it('Tenant views invoices', () => {
    return request(app.getHttpServer())
      .get('/payments/invoices')
      .set('Authorization', `Bearer ${tenantToken}`)
      .expect(200)
      .expect((res) => {
        expect(Array.isArray(res.body)).toBe(true);
        expect(res.body.length).toBeGreaterThan(0);
      });
  });

  it('Tenant makes payment', () => {
    return request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({
        amount: 1500,
        leaseId: leaseId,
        status: 'COMPLETED',
      })
      .expect(201)
      .expect((res) => {
        expect(res.body.status).toBe('COMPLETED');
      });
  });
});
```

#### 3. Leasing Agent Workflow

```typescript
// test/leasing-agent.e2e-spec.ts
describe('AI Leasing Agent (e2e)', () => {
  it('should create new lead', () => {
    return request(app.getHttpServer())
      .post('/api/leads')
      .send({
        sessionId: 'test-session-1',
        name: 'John Doe',
        email: 'john@test.com',
        status: 'NEW',
      })
      .expect(201);
  });

  it('should save conversation messages', () => {
    return request(app.getHttpServer())
      .post('/api/leads/test-session-1/messages')
      .send({
        role: 'USER',
        content: 'I need a 2 bedroom apartment',
      })
      .expect(201);
  });

  it('should retrieve lead by session', () => {
    return request(app.getHttpServer())
      .get('/api/leads/session/test-session-1')
      .expect(200)
      .expect((res) => {
        expect(res.body.name).toBe('John Doe');
        expect(res.body.messages).toBeDefined();
      });
  });
});
```

---

## 🌐 End-to-End Testing Plan

### Cypress E2E Tests

**Test complete user workflows**

#### 1. Tenant Rent Payment Flow

```typescript
// cypress/e2e/tenant-payment-flow.cy.ts
describe('Tenant Rent Payment Flow', () => {
  beforeEach(() => {
    // Login as tenant
    cy.visit('/login');
    cy.get('[data-testid="username-input"]').type('tenant@test.com');
    cy.get('[data-testid="password-input"]').type('password123');
    cy.get('[data-testid="login-button"]').click();
    cy.url().should('include', '/dashboard');
  });

  it('should complete full payment workflow', () => {
    // Navigate to payments
    cy.get('[data-testid="payments-link"]').click();
    cy.url().should('include', '/payments');

    // View unpaid invoices
    cy.get('[data-testid="invoice-list"]').should('be.visible');
    cy.get('[data-testid="unpaid-invoice"]').first().should('exist');

    // Select invoice to pay
    cy.get('[data-testid="pay-button"]').first().click();

    // Fill payment form
    cy.get('[data-testid="payment-amount"]').should('have.value', '1500');
    cy.get('[data-testid="payment-method-select"]').select('Credit Card');
    cy.get('[data-testid="card-number"]').type('4111111111111111');
    cy.get('[data-testid="card-expiry"]').type('12/25');
    cy.get('[data-testid="card-cvv"]').type('123');

    // Submit payment
    cy.get('[data-testid="submit-payment"]').click();

    // Verify success
    cy.get('[data-testid="success-message"]').should('contain', 'Payment successful');
    cy.get('[data-testid="payment-confirmation"]').should('be.visible');

    // Verify invoice marked as paid
    cy.visit('/payments');
    cy.get('[data-testid="paid-invoice"]').should('exist');
  });

  it('should handle payment failure gracefully', () => {
    cy.get('[data-testid="pay-button"]').first().click();
    cy.get('[data-testid="card-number"]').type('4000000000000002'); // Decline test card
    cy.get('[data-testid="submit-payment"]').click();

    cy.get('[data-testid="error-message"]').should('contain', 'Payment failed');
    cy.get('[data-testid="retry-button"]').should('be.visible');
  });
});
```

#### 2. AI Leasing Agent Conversation

```typescript
// cypress/e2e/leasing-agent.cy.ts
describe('AI Leasing Agent', () => {
  beforeEach(() => {
    cy.visit('/lease');
  });

  it('should complete lead qualification workflow', () => {
    // Bot should initialize
    cy.get('[data-testid="chatbot"]').should('be.visible');
    cy.get('[data-testid="welcome-message"]').should('exist');

    // User provides name
    cy.get('[data-testid="chat-input"]').type("Hi, I'm Jane Smith{enter}");
    cy.get('[data-testid="message"]').contains('Jane Smith').should('exist');

    // User provides email
    cy.get('[data-testid="chat-input"]').type('jane@example.com{enter}');
    
    // User provides requirements
    cy.get('[data-testid="chat-input"]').type('I need a 2 bedroom apartment{enter}');
    cy.get('[data-testid="chat-input"]').type('My budget is $1800{enter}');
    cy.get('[data-testid="chat-input"]').type('I want to move in December{enter}');

    // Bot should show properties
    cy.get('[data-testid="property-card"]').should('have.length.at.least', 1);

    // Schedule tour
    cy.get('[data-testid="schedule-tour-button"]').first().click();
    cy.get('[data-testid="tour-date-picker"]').click();
    cy.get('[data-testid="tour-time-select"]').select('2:00 PM');
    cy.get('[data-testid="confirm-tour"]').click();

    // Verify confirmation
    cy.get('[data-testid="tour-confirmation"]').should('contain', 'Tour scheduled');
  });

  it('should handle quick actions', () => {
    cy.get('[data-testid="quick-action-browse"]').click();
    cy.get('[data-testid="message"]').should('contain', 'browse available properties');

    cy.get('[data-testid="quick-action-tour"]').click();
    cy.get('[data-testid="message"]').should('contain', 'schedule a tour');
  });
});
```

#### 3. Property Manager Lead Management

```typescript
// cypress/e2e/pm-lead-management.cy.ts
describe('Property Manager Lead Management', () => {
  beforeEach(() => {
    // Login as PM
    cy.login('pm@test.com', 'password123');
    cy.visit('/lead-management');
  });

  it('should view and manage leads', () => {
    // View lead list
    cy.get('[data-testid="lead-list"]').should('be.visible');
    cy.get('[data-testid="lead-card"]').should('have.length.at.least', 1);

    // Filter leads by status
    cy.get('[data-testid="status-filter"]').select('QUALIFIED');
    cy.get('[data-testid="lead-card"]').should('exist');

    // View lead details
    cy.get('[data-testid="view-lead-button"]').first().click();
    cy.get('[data-testid="lead-details"]').should('be.visible');
    cy.get('[data-testid="lead-name"]').should('not.be.empty');
    cy.get('[data-testid="lead-email"]').should('not.be.empty');

    // Update lead status
    cy.get('[data-testid="status-select"]').select('TOURING');
    cy.get('[data-testid="save-status"]').click();
    cy.get('[data-testid="success-toast"]').should('contain', 'Status updated');
  });

  it('should view conversation history', () => {
    cy.get('[data-testid="view-lead-button"]').first().click();
    cy.get('[data-testid="view-conversation"]').click();

    // Conversation modal opens
    cy.get('[data-testid="conversation-modal"]').should('be.visible');
    cy.get('[data-testid="message"]').should('have.length.at.least', 1);

    // Can scroll through messages
    cy.get('[data-testid="message-list"]').scrollTo('bottom');
  });
});
```

---

## 🔌 API Testing Plan

### Postman Collection Structure

**Collections to Create:**

1. **Authentication APIs**
   - Register user
   - Login
   - Refresh token
   - Logout

2. **Payments APIs**
   - Create invoice
   - Get invoices
   - Create payment
   - Get payments
   - Get payment history

3. **Leasing Agent APIs**
   - Create lead
   - Get lead by session
   - Save message
   - Get conversation history
   - Search properties
   - Record property inquiry
   - Update lead status

4. **Email Notifications APIs**
   - Test rent due reminder
   - Test late rent notification
   - Test payment confirmation

### Newman Automation

**Run Postman tests in CI/CD:**

```bash
# Install Newman
npm install -g newman

# Run collection
newman run postman_collection.json \
  --environment postman_environment.json \
  --reporters cli,json \
  --reporter-json-export results.json
```

**Example Test Script in Postman:**

```javascript
// Test: Create Invoice
pm.test("Status code is 201", function () {
    pm.response.to.have.status(201);
});

pm.test("Response has invoice ID", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('id');
    pm.environment.set("invoiceId", jsonData.id);
});

pm.test("Amount matches request", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.amount).to.eql(1500);
});

pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});
```

---

## 📧 Email Notification Testing

### Test Strategy

**1. Development Testing with Ethereal**

```typescript
// test/email-testing.ts
import { EmailService } from '../src/email/email.service';
import * as nodemailer from 'nodemailer';

describe('Email Notification Tests', () => {
  let emailService: EmailService;
  let testAccount: nodemailer.TestAccount;

  beforeAll(async () => {
    // Create Ethereal test account
    testAccount = await nodemailer.createTestAccount();
    
    // Configure email service with test account
    process.env.SMTP_HOST = 'smtp.ethereal.email';
    process.env.SMTP_PORT = '587';
    process.env.SMTP_USER = testAccount.user;
    process.env.SMTP_PASS = testAccount.pass;
  });

  it('should send rent due reminder', async () => {
    const tenant = {
      email: 'tenant@test.com',
      firstName: 'John',
    };
    const lease = {
      unit: { unitNumber: '101', property: { address: '123 Test St' } },
    };
    const payment = {
      amount: 1500,
      dueDate: new Date('2025-12-01'),
    };

    await emailService.sendRentDueReminder(tenant, lease, payment);

    // Get preview URL
    const sentEmails = await getEtherealEmails(testAccount);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(sentEmails[0]));
    
    // Assertions
    expect(sentEmails).toHaveLength(1);
    expect(sentEmails[0].subject).toContain('Rent Payment Reminder');
  });
});
```

**2. Email Content Validation**

```typescript
describe('Email Content Validation', () => {
  it('should include all required fields in rent due reminder', async () => {
    const emailHtml = await captureEmailHtml();

    // Check for required elements
    expect(emailHtml).toContain('$1,500.00'); // Amount
    expect(emailHtml).toContain('December 1, 2025'); // Due date
    expect(emailHtml).toContain('123 Test St'); // Property address
    expect(emailHtml).toContain('Unit 101'); // Unit number
    expect(emailHtml).toContain('Pay Now'); // CTA button
  });

  it('should have valid HTML structure', async () => {
    const emailHtml = await captureEmailHtml();

    // Validate HTML
    expect(emailHtml).toMatch(/<html>/);
    expect(emailHtml).toMatch(/<\/html>/);
    expect(emailHtml).not.toContain('undefined');
    expect(emailHtml).not.toContain('null');
  });
});
```

**3. Email Delivery Testing**

```typescript
describe('Email Delivery Tests', () => {
  it('should retry on temporary failure', async () => {
    // Mock SMTP server returning temp failure
    const mockTransporter = {
      sendMail: jest.fn()
        .mockRejectedValueOnce(new Error('450 Temporary failure'))
        .mockResolvedValueOnce({ messageId: 'success' }),
    };

    // Implement retry logic test
    await emailService.sendWithRetry(mockTransporter, mailOptions);

    expect(mockTransporter.sendMail).toHaveBeenCalledTimes(2);
  });
});
```

---

## 🤖 AI Features Testing

### AI Leasing Agent Tests

**1. Natural Language Understanding**

```typescript
describe('NLP Extraction Tests', () => {
  const testCases = [
    // Name extraction
    { input: "Hi, I'm John Smith", expected: { name: 'John Smith' } },
    { input: "My name is Jane Doe", expected: { name: 'Jane Doe' } },
    { input: "This is Michael Johnson", expected: { name: 'Michael Johnson' } },
    
    // Email extraction
    { input: "Email me at john@example.com", expected: { email: 'john@example.com' } },
    { input: "My email: jane.doe@test.co.uk", expected: { email: 'jane.doe@test.co.uk' } },
    
    // Budget extraction
    { input: "Budget is $1500", expected: { budget: 1500 } },
    { input: "I can afford 1800 per month", expected: { budget: 1800 } },
    { input: "Between $1200 and $1500", expected: { budget: 1200 } },
    { input: "under $2000", expected: { budget: 2000 } },
    
    // Bedroom extraction
    { input: "I need a 2 bedroom apartment", expected: { bedrooms: 2 } },
    { input: "Looking for 3br", expected: { bedrooms: 3 } },
    { input: "studio apartment", expected: { bedrooms: 0 } },
    
    // Date extraction
    { input: "Move in December 1st", expected: { moveInDate: expect.any(String) } },
    { input: "ASAP", expected: { moveInDate: expect.stringContaining('ASAP') } },
  ];

  testCases.forEach(({ input, expected }) => {
    it(`should extract from: "${input}"`, () => {
      const service = new LeasingAgentService();
      service.sendMessage('test-session', input);
      const leadInfo = service.getLeadInfo('test-session');
      
      Object.keys(expected).forEach(key => {
        expect(leadInfo[key]).toEqual(expected[key]);
      });
    });
  });
});
```

**2. Conversation Flow Tests**

```typescript
describe('Conversation Flow Tests', () => {
  it('should guide user through lead qualification', async () => {
    const service = new LeasingAgentService();
    const sessionId = 'test-flow-1';

    // Step 1: Initial greeting
    const response1 = await service.initConversation(sessionId);
    expect(response1.content).toContain('welcome');

    // Step 2: User provides name
    const response2 = await service.sendMessage(sessionId, "I'm John");
    expect(response2.content).toMatch(/budget|bedroom|move.*in/i);

    // Step 3: User provides requirements
    const response3 = await service.sendMessage(sessionId, '2 bedrooms, $1800 budget');
    expect(response3.content).toMatch(/move.*in|when/i);

    // Step 4: User provides move-in date
    const response4 = await service.sendMessage(sessionId, 'December 1st');
    
    // Should now show properties
    expect(response4.content).toContain('property') || expect(response4.content).toContain('found');
  });
});
```

**3. Backend Integration Tests**

```typescript
describe('AI Agent Backend Integration', () => {
  it('should save lead to database', async () => {
    const leadData = {
      sessionId: 'integration-test-1',
      name: 'John Doe',
      email: 'john@test.com',
      bedrooms: 2,
      budget: 1800,
      status: 'QUALIFIED',
    };

    const response = await request(app.getHttpServer())
      .post('/api/leads')
      .send(leadData)
      .expect(201);

    expect(response.body.id).toBeDefined();
  });

  it('should save conversation messages', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/leads/integration-test-1/messages')
      .send({
        role: 'USER',
        content: 'I need a 2 bedroom apartment',
      })
      .expect(201);

    expect(response.body.id).toBeDefined();
  });
});
```

---

## ⚡ Performance Testing

### Load Testing with Artillery

**artillery-config.yml:**
```yaml
config:
  target: 'http://localhost:3001'
  phases:
    - duration: 60
      arrivalRate: 5
      name: Warm up
    - duration: 120
      arrivalRate: 10
      rampTo: 50
      name: Ramp up load
    - duration: 60
      arrivalRate: 50
      name: Sustained load
  processor: "./test-processor.js"

scenarios:
  - name: "Payment Flow"
    flow:
      - post:
          url: "/auth/login"
          json:
            username: "tenant@test.com"
            password: "password123"
          capture:
            json: "$.access_token"
            as: "token"
      - get:
          url: "/payments/invoices"
          headers:
            Authorization: "Bearer {{ token }}"
      - post:
          url: "/payments"
          headers:
            Authorization: "Bearer {{ token }}"
          json:
            amount: 1500
            leaseId: 1
            status: "COMPLETED"

  - name: "Leasing Agent Chat"
    flow:
      - post:
          url: "/api/leads"
          json:
            sessionId: "{{ $uuid }}"
            name: "Test User"
            status: "NEW"
      - post:
          url: "/api/leads/{{ $uuid }}/messages"
          json:
            role: "USER"
            content: "I need a 2 bedroom apartment"
```

**Run load tests:**
```bash
artillery run artillery-config.yml --output report.json
artillery report report.json
```

### Performance Benchmarks

**Target Metrics:**
- API Response Time: < 200ms (p95)
- Database Query Time: < 50ms (p95)
- Page Load Time: < 2s
- Time to Interactive: < 3s
- Email Send Time: < 1s

**Example Performance Test:**
```typescript
describe('Performance Tests', () => {
  it('should respond to GET /payments/invoices quickly', async () => {
    const start = Date.now();
    
    await request(app.getHttpServer())
      .get('/payments/invoices')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(200);
  });

  it('should handle 100 concurrent requests', async () => {
    const requests = Array(100).fill(null).map(() =>
      request(app.getHttpServer())
        .get('/api/leads')
        .set('Authorization', `Bearer ${token}`)
    );

    const start = Date.now();
    await Promise.all(requests);
    const duration = Date.now() - start;

    expect(duration).toBeLessThan(5000); // 5 seconds for 100 requests
  });
});
```

---

## 🔒 Security Testing

### Security Test Cases

**1. Authentication & Authorization**

```typescript
describe('Security Tests', () => {
  describe('Authentication', () => {
    it('should reject requests without token', async () => {
      await request(app.getHttpServer())
        .get('/payments/invoices')
        .expect(401);
    });

    it('should reject expired tokens', async () => {
      const expiredToken = generateExpiredToken();
      
      await request(app.getHttpServer())
        .get('/payments/invoices')
        .set('Authorization', `Bearer ${expiredToken}`)
        .expect(401);
    });

    it('should reject invalid tokens', async () => {
      await request(app.getHttpServer())
        .get('/payments/invoices')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });
  });

  describe('Authorization', () => {
    it('should prevent tenant from accessing PM endpoints', async () => {
      await request(app.getHttpServer())
        .post('/payments/invoices')
        .set('Authorization', `Bearer ${tenantToken}`)
        .send({ description: 'Test', amount: 1500 })
        .expect(403);
    });

    it('should prevent access to other users data', async () => {
      // Tenant 1 tries to access Tenant 2's data
      await request(app.getHttpServer())
        .get('/payments/invoices?leaseId=999')
        .set('Authorization', `Bearer ${tenant1Token}`)
        .expect(403);
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should sanitize malicious input', async () => {
      await request(app.getHttpServer())
        .get('/payments/invoices?leaseId=1 OR 1=1')
        .set('Authorization', `Bearer ${token}`)
        .expect(400); // Should reject malformed input
    });
  });

  describe('XSS Prevention', () => {
    it('should escape HTML in user input', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/leads')
        .send({
          sessionId: 'test',
          name: '<script>alert("xss")</script>',
        })
        .expect(201);

      expect(response.body.name).not.toContain('<script>');
    });
  });
});
```

**2. Rate Limiting**

```typescript
describe('Rate Limiting', () => {
  it('should limit login attempts', async () => {
    const attempts = Array(6).fill(null).map(() =>
      request(app.getHttpServer())
        .post('/auth/login')
        .send({ username: 'test@test.com', password: 'wrong' })
    );

    const responses = await Promise.all(attempts);
    const lastResponse = responses[responses.length - 1];
    
    expect(lastResponse.status).toBe(429); // Too many requests
  });
});
```

---

## 💾 Test Data Management

### Test Data Factory

**Create reusable test data:**

```typescript
// test/factories/index.ts
import { faker } from '@faker-js/faker';

export class TestDataFactory {
  static createUser(overrides = {}) {
    return {
      username: faker.internet.email(),
      password: 'TestPass123!',
      role: 'TENANT',
      ...overrides,
    };
  }

  static createProperty(overrides = {}) {
    return {
      name: faker.company.name() + ' Apartments',
      address: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zipCode: faker.location.zipCode(),
      ...overrides,
    };
  }

  static createLease(tenantId: number, unitId: number, overrides = {}) {
    const startDate = faker.date.future();
    return {
      tenantId,
      unitId,
      startDate,
      endDate: new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000),
      rentAmount: faker.number.int({ min: 1000, max: 3000 }),
      status: 'ACTIVE',
      ...overrides,
    };
  }

  static createInvoice(leaseId: number, overrides = {}) {
    return {
      leaseId,
      description: 'Monthly Rent',
      amount: faker.number.int({ min: 1000, max: 3000 }),
      dueDate: faker.date.future(),
      status: 'UNPAID',
      ...overrides,
    };
  }
}
```

**Usage:**
```typescript
const testUser = TestDataFactory.createUser({ role: 'PROPERTY_MANAGER' });
const testProperty = TestDataFactory.createProperty();
```

### Database Seeding for Tests

```typescript
// test/seed-test-db.ts
export async function seedDatabase() {
  const prisma = new PrismaClient();

  // Create users
  const tenant = await prisma.user.create({
    data: TestDataFactory.createUser({ username: 'tenant@test.com' }),
  });

  const pm = await prisma.user.create({
    data: TestDataFactory.createUser({ 
      username: 'pm@test.com',
      role: 'PROPERTY_MANAGER',
    }),
  });

  // Create properties and units
  for (let i = 0; i < 5; i++) {
    const property = await prisma.property.create({
      data: TestDataFactory.createProperty(),
    });

    for (let j = 0; j < 10; j++) {
      await prisma.unit.create({
        data: {
          propertyId: property.id,
          unitNumber: `${100 + j}`,
          bedrooms: faker.number.int({ min: 1, max: 3 }),
          bathrooms: faker.number.int({ min: 1, max: 2 }),
          squareFeet: faker.number.int({ min: 600, max: 1500 }),
          status: 'VACANT',
        },
      });
    }
  }

  await prisma.$disconnect();
}
```

---

## 🔄 Continuous Integration

### GitHub Actions Workflow

**.github/workflows/test.yml:**
```yaml
name: Test Suite

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]

jobs:
  backend-tests:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: property_management_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: tenant_portal_backend/package-lock.json
      
      - name: Install dependencies
        working-directory: ./tenant_portal_backend
        run: npm ci
      
      - name: Run Prisma migrations
        working-directory: ./tenant_portal_backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/property_management_test
        run: npx prisma migrate deploy
      
      - name: Run unit tests
        working-directory: ./tenant_portal_backend
        run: npm run test:unit
      
      - name: Run integration tests
        working-directory: ./tenant_portal_backend
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/property_management_test
        run: npm run test:e2e
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./tenant_portal_backend/coverage/lcov.info

  frontend-tests:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
          cache-dependency-path: tenant_portal_app/package-lock.json
      
      - name: Install dependencies
        working-directory: ./tenant_portal_app
        run: npm ci
      
      - name: Run tests
        working-directory: ./tenant_portal_app
        run: npm run test -- --coverage
      
      - name: Build
        working-directory: ./tenant_portal_app
        run: npm run build

  e2e-tests:
    runs-on: ubuntu-latest
    needs: [backend-tests, frontend-tests]
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: |
          cd tenant_portal_backend && npm ci
          cd ../tenant_portal_app && npm ci
      
      - name: Start backend
        working-directory: ./tenant_portal_backend
        run: |
          npm run start &
          sleep 10
      
      - name: Start frontend
        working-directory: ./tenant_portal_app
        run: |
          npm run start &
          sleep 10
      
      - name: Run Cypress tests
        working-directory: ./tenant_portal_app
        run: npx cypress run
      
      - name: Upload Cypress screenshots
        if: failure()
        uses: actions/upload-artifact@v3
        with:
          name: cypress-screenshots
          path: tenant_portal_app/cypress/screenshots
```

---

## 📊 Test Reporting

### Coverage Reports

**Generate coverage report:**
```bash
# Backend
cd tenant_portal_backend
npm run test:cov

# Frontend
cd tenant_portal_app
npm run test -- --coverage
```

**View coverage:**
```bash
open coverage/lcov-report/index.html
```

### Test Summary Template

**test-results-summary.md:**
```markdown
# Test Results Summary

**Date:** {{ date }}
**Build:** {{ build_number }}
**Branch:** {{ branch }}

## Overview

| Category | Total | Passed | Failed | Skipped | Coverage |
|----------|-------|--------|--------|---------|----------|
| Unit Tests | 250 | 248 | 2 | 0 | 85% |
| Integration Tests | 45 | 44 | 1 | 0 | - |
| E2E Tests | 30 | 30 | 0 | 0 | - |
| **Total** | **325** | **322** | **3** | **0** | **85%** |

## Failed Tests

### Unit Tests
1. `PaymentsService.createPayment` - Timeout error
2. `EmailService.sendRentDueReminder` - Network error

### Integration Tests
1. `Payments Workflow - Late payment` - Database connection error

## Performance Metrics

| Endpoint | Avg Response Time | P95 | P99 |
|----------|-------------------|-----|-----|
| GET /payments/invoices | 45ms | 120ms | 250ms |
| POST /payments | 78ms | 150ms | 300ms |
| GET /api/leads | 32ms | 80ms | 180ms |

## Coverage by Module

| Module | Statements | Branches | Functions | Lines |
|--------|------------|----------|-----------|-------|
| Payments | 92% | 88% | 95% | 91% |
| Auth | 95% | 90% | 97% | 94% |
| Leasing | 82% | 75% | 85% | 80% |
| Email | 78% | 70% | 80% | 75% |

## Recommendations

1. ✅ Increase coverage in Email module
2. ✅ Fix flaky timeout in PaymentsService
3. ✅ Add more edge case tests for Leasing Agent
4. ✅ Improve error handling in network calls
```

---

## 🎯 Implementation Checklist

### Phase 1: Unit Testing (Week 1-2)
- [ ] Set up Jest configuration
- [ ] Create test data factories
- [ ] Write service layer tests
- [ ] Write controller tests
- [ ] Write email service tests
- [ ] Achieve 80% code coverage
- [ ] Set up coverage reporting

### Phase 2: Integration Testing (Week 3)
- [ ] Set up test database
- [ ] Create database seeding scripts
- [ ] Write authentication flow tests
- [ ] Write payments workflow tests
- [ ] Write leasing agent API tests
- [ ] Test email notifications

### Phase 3: E2E Testing (Week 4)
- [ ] Set up Cypress
- [ ] Write tenant payment flow tests
- [ ] Write AI leasing agent tests
- [ ] Write PM dashboard tests
- [ ] Configure CI/CD integration

### Phase 4: Performance & Security (Week 5)
- [ ] Set up Artillery load testing
- [ ] Run performance benchmarks
- [ ] Write security test suite
- [ ] Test rate limiting
- [ ] Vulnerability scanning

### Phase 5: Documentation & CI (Week 6)
- [ ] Document test procedures
- [ ] Set up GitHub Actions
- [ ] Configure automated test runs
- [ ] Create test reporting dashboard
- [ ] Train team on testing practices

---

## 📝 Testing Best Practices

### General Guidelines

1. **Write tests first (TDD)**
   - Define expected behavior
   - Write failing test
   - Implement feature
   - Test passes

2. **Keep tests independent**
   - Each test should run in isolation
   - No shared state between tests
   - Use beforeEach/afterEach for setup/teardown

3. **Test one thing at a time**
   - Single assertion per test (when possible)
   - Clear test names
   - Follow AAA pattern (Arrange, Act, Assert)

4. **Mock external dependencies**
   - Database calls
   - API calls
   - Email sending
   - File system operations

5. **Use descriptive test names**
   ```typescript
   // Good
   it('should send confirmation email when payment succeeds')
   
   // Bad
   it('test payment')
   ```

6. **Test edge cases**
   - Null values
   - Empty arrays
   - Invalid input
   - Boundary conditions

7. **Maintain test data**
   - Use factories for consistent data
   - Clean up after tests
   - Use realistic test data

### Code Coverage Goals

- **Critical paths:** 95%+
- **Business logic:** 90%+
- **Controllers:** 85%+
- **Utilities:** 80%+

---

## 🚀 Next Steps

1. **Review this testing plan** with the development team
2. **Prioritize test implementation** based on critical features
3. **Set up test infrastructure** (databases, CI/CD, tools)
4. **Begin with unit tests** for core business logic
5. **Gradually add integration and E2E tests**
6. **Monitor and improve** test coverage over time

---

**Questions or feedback?** This testing plan is a living document and should be updated as the application evolves.
