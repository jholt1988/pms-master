import { Role, LeaseStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

// Simple test data generator without external dependencies
export const testData = {
  counter: 1,
  getUniqueId: () => testData.counter++,
  email: () => `user${testData.getUniqueId()}@test.com`,
  firstName: () => ['John', 'Jane', 'Bob', 'Alice', 'Mike', 'Sarah'][testData.getUniqueId() % 6],
  lastName: () => ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia'][testData.getUniqueId() % 6],
  fullName: () => `${testData.firstName()} ${testData.lastName()}`,
  phone: () => `(555) ${String(testData.getUniqueId()).padStart(3, '0')}-${String(Math.random() * 10000).padStart(4, '0')}`,
  street: () => `${testData.getUniqueId() * 100 + 23} ${['Main', 'Oak', 'Pine', 'Maple', 'Cedar'][testData.getUniqueId() % 5]} St`,
  city: () => ['Springfield', 'Riverside', 'Franklin', 'Clinton', 'Madison'][testData.getUniqueId() % 5],
  state: () => ['CA', 'TX', 'NY', 'FL', 'IL'][testData.getUniqueId() % 5],
  zipCode: () => String(10000 + testData.getUniqueId() * 100),
  amount: (min = 1000, max = 3000) => min + Math.floor(Math.random() * (max - min)),
  date: (daysOffset = 0) => {
    const date = new Date();
    date.setDate(date.getDate() + daysOffset);
    return date;
  },
  boolean: () => Math.random() > 0.5,
  paragraph: () => 'This is a test message. It contains multiple sentences. This helps simulate realistic data.',
  word: () => ['Property', 'Unit', 'Lease', 'Payment', 'Tour', 'Lead'][testData.getUniqueId() % 6],
};

/**
 * Test Data Factory
 * Creates realistic test data for all entities
 */
export class TestDataFactory {
  /**
   * Create a test user
   */
  static createUser(overrides: any = {}) {
    const { password: overridePassword, ...rest } = overrides;
    const rawPassword =
      overridePassword ?? '$2b$10$EbjqSDgryMwv8OnktwWGTuDyDRhdYa32TcScJ.CgfYT2PWaD0k/IS';
    const password =
      typeof rawPassword === 'string' && rawPassword.startsWith('$2')
        ? rawPassword
        : bcrypt.hashSync(rawPassword, 10);

    return {
      username: testData.email(),
      password, // bcrypt hash of 'password123' by default
      role: Role.TENANT,
      ...rest,
    };
  }

  /**
   * Create a test property manager user
   */
  static createPropertyManager(overrides: any = {}) {
    return this.createUser({
      username: `pm_${testData.email()}`,
      role: Role.PROPERTY_MANAGER,
      ...overrides,
    });
  }

  /**
   * Create a test property
   */
  static createProperty(overrides: any = {}) {
    return {
      name: testData.word() + ' Apartments',
      address: testData.street(),
      city: testData.city(),
      state: testData.state(),
      zipCode: testData.zipCode(),
      propertyType: ['Apartment', 'Townhome', 'Condo'][testData.getUniqueId() % 3],
      minRent: testData.amount(1200, 2500),
      maxRent: testData.amount(2500, 4000),
      bedrooms: 1 + (testData.getUniqueId() % 3),
      bathrooms: 1 + (testData.getUniqueId() % 2) * 0.5,
      tags: ['pet-friendly', 'downtown', 'gym'].slice(0, (testData.getUniqueId() % 3) + 1),
      ...overrides,
    };
  }

  /**
   * Create a test unit
   */
  static createUnit(propertyId: number, overrides: any = {}) {
    const unitNum = String(100 + testData.getUniqueId());
    return {
      name: `Unit ${unitNum}`,
      propertyId,
      unitNumber: unitNum,
      bedrooms: 1 + (testData.getUniqueId() % 3),
      bathrooms: 1 + ((testData.getUniqueId() % 3) * 0.5),
      squareFeet: 600 + (testData.getUniqueId() % 900),
      hasParking: testData.boolean(),
      hasLaundry: testData.boolean(),
      hasBalcony: testData.boolean(),
      hasAC: testData.boolean(),
      isFurnished: testData.boolean(),
      petsAllowed: testData.boolean(),
      ...overrides,
    };
  }

  /**
   * Create a test lease
   */
  static createLease(tenantId: number, unitId: number, overrides: any = {}) {
    // Prisma schema no longer exposes securityDeposit, so strip it from overrides to avoid invalid writes
    const { securityDeposit, ...sanitizedOverrides } = overrides;
    const startDate = testData.date(30);
    const endDate = new Date(startDate);
    endDate.setFullYear(endDate.getFullYear() + 1);

    return {
      tenantId,
      unitId,
      startDate,
      endDate,
      rentAmount: testData.amount(1000, 3000),
      depositAmount: testData.amount(500, 2000),
      status: LeaseStatus.ACTIVE,
      ...sanitizedOverrides,
    };
  }

  /**
   * Create a test invoice
   */
  static createInvoice(leaseId: number, overrides: any = {}) {
    const dueDate = testData.date(30);
    
    return {
      leaseId,
      description: 'Monthly Rent',
      amount: testData.amount(1000, 3000),
      dueDate,
      status: 'UNPAID',
      ...overrides,
    };
  }

  /**
   * Create an overdue invoice
   */
  static createOverdueInvoice(leaseId: number, overrides: any = {}) {
    const dueDate = testData.date(-10); // 10 days ago
    
    return this.createInvoice(leaseId, {
      dueDate,
      status: 'UNPAID',
      ...overrides,
    });
  }

  /**
   * Create an upcoming invoice (due in 5 days)
   */
  static createUpcomingInvoice(leaseId: number, overrides: any = {}) {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 5);
    
    return this.createInvoice(leaseId, {
      dueDate,
      status: 'UNPAID',
      ...overrides,
    });
  }

  /**
   * Create a test payment
   */
  static createPayment(leaseId: number, userId: number, overrides: any = {}) {
    return {
      leaseId,
      userId,
      amount: testData.amount(1000, 3000),
      status: 'COMPLETED',
      paymentDate: new Date(),
      ...overrides,
    };
  }

  /**
   * Create a test lead
   */
  static createLead(overrides: any = {}) {
    const id = testData.getUniqueId();
    return {
      sessionId: `session-${id}`,
      name: `${testData.firstName()} ${testData.lastName()}`,
      email: testData.email(),
      phone: testData.phone(),
      status: 'NEW',
      bedrooms: 1 + (id % 3),
      budget: testData.amount(1000, 3000),
      moveInDate: testData.date(30).toISOString(),
      ...overrides,
    };
  }

  /**
   * Create a qualified lead with all required information
   */
  static createQualifiedLead(overrides: any = {}) {
    return this.createLead({
      name: `${testData.firstName()} ${testData.lastName()}`,
      email: testData.email(),
      phone: testData.phone(),
      bedrooms: 2,
      budget: 1800,
      moveInDate: testData.date(30).toISOString(),
      status: 'QUALIFIED',
      ...overrides,
    });
  }

  /**
   * Create a conversation message
   */
  static createMessage(leadId: number, role: 'USER' | 'ASSISTANT', overrides: any = {}) {
    return {
      leadId,
      role,
      content: testData.paragraph(),
      ...overrides,
    };
  }

  /**
   * Create a tour
   */
  static createTour(leadId: number, unitId: number, overrides: any = {}) {
    return {
      leadId,
      unitId,
      tourDate: testData.date(7),
      status: 'SCHEDULED',
      ...overrides,
    };
  }

  /**
   * Create a late fee
   */
  static createLateFee(invoiceId: number, overrides: any = {}) {
    return {
      invoiceId,
      amount: testData.amount(25, 100),
      description: 'Late Payment Fee',
      ...overrides,
    };
  }

  /**
   * Create a property inquiry
   */
  static createPropertyInquiry(leadId: number, unitId: number, overrides: any = {}) {
    return {
      leadId,
      unitId,
      inquiryDate: new Date(),
      notes: testData.paragraph(),
      ...overrides,
    };
  }

  /**
   * Generate multiple test entities
   */
  static createMany<T>(factory: () => T, count: number): T[] {
    return Array.from({ length: count }, factory);
  }

  /**
   * Create a complete test scenario with related entities
   */
  static async createCompleteScenario() {
    return {
      tenant: this.createUser({ role: Role.TENANT, username: 'tenant@test.com' }),
      propertyManager: this.createUser({ role: Role.PROPERTY_MANAGER, username: 'pm@test.com' }),
      property: this.createProperty(),
      // Additional entities can be created after IDs are assigned
    };
  }
}

/**
 * Mock Data Helpers
 */
export class MockHelpers {
  /**
   * Create a mock request object with user
   */
  static createMockRequest(user: any) {
    return {
      user,
    } as any;
  }

  /**
   * Create a mock authenticated tenant request
   */
  static createTenantRequest(userId = 1) {
    return this.createMockRequest({
      userId,
      role: Role.TENANT,
    });
  }

  /**
   * Create a mock authenticated property manager request
   */
  static createPMRequest(userId = 2) {
    return this.createMockRequest({
      userId,
      role: Role.PROPERTY_MANAGER,
    });
  }
}
