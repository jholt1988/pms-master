import { randomUUID } from 'node:crypto';
import { faker } from '@faker-js/faker';
import {
  ApplicationDecisionReasonCode,
  ApplicationStatus,
  BillingFrequency,
  BillingAlignment,
  DocumentCategory,
  EstimateStatus,
  ExpenseCategory,
  InspectionCondition,
  InspectionStatus,
  InspectionType,
  LeaseStatus,
  MaintenanceAssetCategory,
  MaintenancePriority,
  ManualChargeStatus,
  ManualChargeType,
  ManualPaymentAppliedTo,
  ManualPaymentMethod,
  ManualPaymentStatus,
  NotificationType,
  OrgRole,
  PaymentMethodType,
  PaymentProvider,
  PaymentStatus,
  PreferredContactMethod,
  PrismaClient,
  QualificationStatus,
  Recommendation,
  Role,
  RoomType,
  Status,
  TechnicianRole,
  UnitStatus,
} from '@prisma/client';

export type MockSeedOptions = {
  organizations?: number;
  propertiesPerOrg?: number;
  unitsPerProperty?: number;
  vacancyRatio?: number;
  applicantsPerVacantUnit?: number;
};

export type MockSeedFactoryConfig = {
  fakerSeed?: number;
  now?: Date;
  assetBaseUrl?: string;
  passwordHash?: string;
  runLabel?: string;
};

export type MockSeedSummary = {
  organizations: number;
  users: number;
  properties: number;
  units: number;
  leases: number;
  applications: number;
  maintenanceRequests: number;
  inspections: number;
  repairEstimates: number;
  invoices: number;
  payments: number;
  notifications: number;
  ownerStatements: number;
};

type CreatedUser = {
  id: string;
  role: Role;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
};

type OrgBundle = {
  organizationId: string;
  admin: CreatedUser;
  manager: CreatedUser;
  owner: CreatedUser;
  technicianUser: CreatedUser;
};

export class MockSeedFactory {
  private readonly now: Date;
  private readonly assetBaseUrl: string;
  private readonly passwordHash: string;
  private readonly runLabel: string;
  private readonly amenityMap = new Map<string, number>();
  private readonly counts: MockSeedSummary = {
    organizations: 0,
    users: 0,
    properties: 0,
    units: 0,
    leases: 0,
    applications: 0,
    maintenanceRequests: 0,
    inspections: 0,
    repairEstimates: 0,
    invoices: 0,
    payments: 0,
    notifications: 0,
    ownerStatements: 0,
  };

  constructor(
    private readonly prisma: PrismaClient,
    config: MockSeedFactoryConfig = {},
  ) {
    const seed = config.fakerSeed ?? 20260411;
    faker.seed(seed);
    this.now = config.now ?? new Date();
    this.assetBaseUrl = config.assetBaseUrl ?? 'https://cdn.example.local/mock-assets';
    this.passwordHash =
      config.passwordHash ??
      '$2b$10$u1fR1z8c8uQ8ZZ5E7q4q6eXf3rM6u3H7c5L9mQ7kA7eW9u5dXv8Q2';
    this.runLabel =
      config.runLabel ??
      `${this.now.getUTCFullYear()}${String(this.now.getUTCMonth() + 1).padStart(2, '0')}${String(
        this.now.getUTCDate(),
      ).padStart(2, '0')}-${faker.string.alphanumeric(5).toLowerCase()}`;
  }

  async seed(options: MockSeedOptions = {}): Promise<MockSeedSummary> {
    const orgCount = options.organizations ?? 1;
    const propertiesPerOrg = options.propertiesPerOrg ?? 2;
    const unitsPerProperty = options.unitsPerProperty ?? 6;
    const vacancyRatio = options.vacancyRatio ?? 0.34;
    const applicantsPerVacantUnit = options.applicantsPerVacantUnit ?? 2;

    await this.seedAmenityCatalog();
    const allAmenities = await this.prisma.amenity.findMany({
      select: { id: true, key: true },
    });
    for (const a of allAmenities) {
      this.amenityMap.set(a.key, a.id);
    }

    for (let orgIndex = 1; orgIndex <= orgCount; orgIndex += 1) {
      const org = await this.createOrganizationBundle(orgIndex);
      const technician = await this.createTechnician(org.organizationId, org.technicianUser.id);

      await Promise.all(Array.from({ length: propertiesPerOrg }).map(async (_, propertyIndexBase) => {
        const propertyIndex = propertyIndexBase + 1;
        const property = await this.createProperty(org.organizationId, propertyIndex);
        const slaByPriority = await this.createSlaPolicies(property.id);

        const occupiedUnits = Math.max(1, Math.round(unitsPerProperty * (1 - vacancyRatio)));

        await Promise.all(Array.from({ length: unitsPerProperty }).map(async (_, unitIndexBase) => {
          const unitIndex = unitIndexBase + 1;
          const occupied = unitIndex <= occupiedUnits;
          const unit = await this.createUnit(property.id, propertyIndex, unitIndex, occupied);

          if (occupied) {
            const tenant = await this.createUser(Role.TENANT, `tenant-${orgIndex}-${propertyIndex}-${unitIndex}`);
            const lease = await this.createLease(unit.id, tenant.id, unitIndex);

            await Promise.all([
              this.createNotificationPreference(tenant.id),
              this.createRentRecommendation(unit.id, lease.rentAmount),
              (async () => {
                const billing = await this.createBillingArtifacts({
                  organizationId: org.organizationId,
                  propertyId: property.id,
                  unitId: unit.id,
                  leaseId: lease.id,
                  tenantId: tenant.id,
                  createdById: org.manager.id,
                });
                await this.createNotifications(tenant.id, billing.nextInvoiceDueDate, lease.rentAmount);
              })(),
              (async () => {
                const maintenanceRequest = await this.createMaintenanceRequest({
                  authorId: tenant.id,
                  propertyId: property.id,
                  unitId: unit.id,
                  leaseId: lease.id,
                  assigneeId: technician.id,
                  slaPolicyId: this.pickSlaPolicyId(slaByPriority),
                });
                
                const inspection = await this.createInspection({
                  propertyId: property.id,
                  unitId: unit.id,
                  leaseId: lease.id,
                  tenantId: tenant.id,
                  inspectorId: org.manager.id,
                  createdById: org.manager.id,
                });

                await this.createRepairEstimate({
                  propertyId: property.id,
                  unitId: unit.id,
                  inspectionId: inspection.id,
                  maintenanceRequestId: maintenanceRequest.id,
                  generatedById: org.manager.id,
                  approvedById: org.admin.id,
                });
              })(),
              this.createLeaseDocumentsAndHistory(lease.id, org.manager.id, property.id),
            ]);
          } else {
            await this.createApplicationsForVacantUnit({
              propertyId: property.id,
              unitId: unit.id,
              applicantsPerVacantUnit,
              screenerId: org.manager.id,
              orgIndex,
              propertyIndex,
              unitIndex,
            });
          }
        }));

        await this.createPropertyExpenses(property.id, org.manager.id);
      }));

      await this.createOwnerStatement(org.organizationId, org.owner.id, org.admin.id);
      await this.createQuickBooksConnection(org.organizationId, org.admin.id);
    }

    return { ...this.counts };
  }

  private async seedAmenityCatalog(): Promise<void> {
    const amenities = [
      { key: 'central-air', label: 'Central Air', category: 'Cooling' },
      { key: 'dishwasher', label: 'Dishwasher', category: 'Kitchen' },
      { key: 'laundry', label: 'Laundry', category: 'Convenience' },
      { key: 'parking', label: 'Parking', category: 'Convenience' },
      { key: 'pet-friendly', label: 'Pet Friendly', category: 'Policy' },
      { key: 'security-cameras', label: 'Security Cameras', category: 'Safety' },
    ];

    await this.prisma.amenity.createMany({
      data: amenities,
      skipDuplicates: true,
    });
  }

  private async createOrganizationBundle(orgIndex: number): Promise<OrgBundle> {
    const organization = await this.prisma.organization.create({
      data: {
        name: `Mock Portfolio ${orgIndex} ${this.runLabel}`,
        delinquencyAmountWeight: 0.45,
        delinquencyDaysWeight: 0.55,
        stripeOnboardingStatus: 'COMPLETED',
        stripeChargesEnabled: true,
        stripePayoutsEnabled: true,
        stripeDetailsSubmitted: true,
        stripeConnectedAccountId: `acct_mock_${this.runLabel}_${orgIndex}`,
        stripeCapabilities: {
          card_payments: 'active',
          transfers: 'active',
        },
        stripeOnboardingCompletedAt: this.daysAgo(40),
        stripeLastOnboardingCheckAt: this.daysAgo(2),
      },
    });
    this.counts.organizations += 1;

    const [admin, manager, owner, technicianUser] = await Promise.all([
      this.createUser(Role.ADMIN, `admin-${orgIndex}`),
      this.createUser(Role.PROPERTY_MANAGER, `manager-${orgIndex}`),
      this.createUser(Role.OWNER, `owner-${orgIndex}`),
      this.createUser(Role.PROPERTY_MANAGER, `tech-user-${orgIndex}`),
    ]);

    await this.prisma.userOrganization.createMany({
      data: [
        { userId: admin.id, organizationId: organization.id, role: OrgRole.ADMIN },
        { userId: manager.id, organizationId: organization.id, role: OrgRole.ADMIN },
        { userId: owner.id, organizationId: organization.id, role: OrgRole.OWNER },
        { userId: technicianUser.id, organizationId: organization.id, role: OrgRole.MEMBER },
      ],
      skipDuplicates: true,
    });

    return {
      organizationId: organization.id,
      admin,
      manager,
      owner,
      technicianUser,
    };
  }

  private async createTechnician(organizationId: string, userId: string) {
    return this.prisma.technician.create({
      data: {
        organizationId,
        userId,
        name: `${faker.person.firstName()} ${faker.person.lastName()}`,
        email: this.uniqueEmail(`vendor-tech-${organizationId.slice(0, 6)}`),
        phone: faker.phone.number({ style: "human" }),
        role: TechnicianRole.IN_HOUSE,
        active: true,
        emergencyService: true,
        insuranceOnFile: true,
        preferredContact: PreferredContactMethod.EMAIL,
        trades: ['plumbing', 'electrical', 'hvac'],
        serviceZips: [faker.location.zipCode('#####'), faker.location.zipCode('#####')],
        notes: 'Mock in-house technician seeded for demo workflows.',
      },
    });
  }

  private async createProperty(organizationId: string, propertyIndex: number) {
    const property = await this.prisma.property.create({
      data: {
        organizationId,
        name: `${faker.location.street()} Residences ${propertyIndex}`,
        address: faker.location.streetAddress(),
        city: faker.location.city(),
        state: faker.location.state({ abbreviated: true }),
        zipCode: faker.location.zipCode('#####'),
        country: 'USA',
        latitude: Number(faker.location.latitude()),
        longitude: Number(faker.location.longitude()),
        propertyType: faker.helpers.arrayElement(['Apartment', 'Duplex', 'Townhome']),
        description: faker.lorem.sentence(),
        bedrooms: faker.helpers.arrayElement([1, 2, 3]),
        bathrooms: faker.helpers.arrayElement([1, 1.5, 2]),
        minRent: faker.number.int({ min: 900, max: 1400 }),
        maxRent: faker.number.int({ min: 1450, max: 2400 }),
        tags: ['mock', 'seeded', 'demo'],
        yearBuilt: faker.number.int({ min: 1975, max: 2022 }),
      },
    });
    this.counts.properties += 1;

    await this.prisma.propertyMarketingProfile.create({
      data: {
        propertyId: property.id,
        minRent: property.minRent ?? 950,
        maxRent: property.maxRent ?? 1800,
        marketingHeadline: faker.company.catchPhrase(),
        marketingDescription: faker.lorem.paragraph(),
        availableOn: this.daysFromNow(14),
        isSyndicationEnabled: true,
        lastSyncedAt: this.daysAgo(1),
      },
    });

    await this.prisma.propertyPhoto.createMany({
      data: [0, 1, 2].map((displayOrder) => ({
        propertyId: property.id,
        url: `${this.assetBaseUrl}/properties/${property.id}/photo-${displayOrder + 1}.jpg`,
        caption: faker.lorem.words(4),
        isPrimary: displayOrder === 0,
        displayOrder,
      })),
    });

    const amenityKeys = ['central-air', 'dishwasher', 'laundry', 'parking', 'pet-friendly'];
    const chosenKeys = faker.helpers.arrayElements(amenityKeys, 4);
    
    await this.prisma.propertyAmenity.createMany({
      data: chosenKeys.map(key => ({
        propertyId: property.id,
        amenityId: this.amenityMap.get(key)!,
        isFeatured: faker.datatype.boolean(),
        value: faker.datatype.boolean() ? 'true' : undefined,
      }))
    });

    return property;
  }

  private async createUnit(
    propertyId: string,
    propertyIndex: number,
    unitIndex: number,
    occupied: boolean,
  ) {
    const unit = await this.prisma.unit.create({
      data: {
        propertyId,
        name: `Unit ${propertyIndex}-${unitIndex}`,
        unitNumber: `${propertyIndex}${String(unitIndex).padStart(2, '0')}`,
        status: occupied ? UnitStatus.OCCUPIED : UnitStatus.VACANT,
        bedrooms: faker.helpers.arrayElement([1, 2, 3]),
        bathrooms: faker.helpers.arrayElement([1, 1.5, 2]),
        squareFeet: faker.number.int({ min: 650, max: 1450 }),
        hasParking: faker.datatype.boolean(),
        hasLaundry: faker.datatype.boolean(),
        hasBalcony: faker.datatype.boolean(),
        hasAC: true,
        isFurnished: false,
        petsAllowed: faker.datatype.boolean(),
      },
    });
    this.counts.units += 1;
    return unit;
  }

  private async createLease(unitId: string, tenantId: string, unitIndex: number) {
    const rentAmount = faker.number.int({ min: 975, max: 2200 });
    const lease = await this.prisma.lease.create({
      data: {
        unitId,
        tenantId,
        startDate: this.daysAgo(120 + unitIndex * 5),
        endDate: this.daysFromNow(240 - unitIndex * 3),
        moveInAt: this.daysAgo(118 + unitIndex * 5),
        rentAmount,
        depositAmount: rentAmount,
        depositHeldAt: this.daysAgo(119 + unitIndex * 5),
        status: LeaseStatus.ACTIVE,
        noticePeriodDays: 30,
        autoRenew: faker.datatype.boolean(),
        autoRenewLeadDays: 90,
        billingAlignment: BillingAlignment.FULL_CYCLE,
        currentBalance: faker.number.int({ min: 0, max: 350 }),
      },
    });
    this.counts.leases += 1;
    return lease;
  }

  private async createNotificationPreference(userId: string) {
    await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        preferredChannel: 'EMAIL',
      },
      create: {
        userId,
        emailEnabled: true,
        smsEnabled: false,
        pushEnabled: true,
        preferredChannel: 'EMAIL',
      },
    });
  }

  private async createRentRecommendation(unitId: string, currentRent: number) {
    await this.prisma.rentRecommendation.create({
      data: {
        id: randomUUID(),
        unitId,
        currentRent,
        recommendedRent: currentRent + faker.number.int({ min: 25, max: 125 }),
        confidenceIntervalLow: currentRent - 50,
        confidenceIntervalHigh: currentRent + 175,
        factors: {
          demand: 'steady',
          seasonality: 'spring',
          delinquencyRisk: faker.number.float({ min: 0.02, max: 0.11, fractionDigits: 2 }),
        },
        marketComparables: [
          { beds: 2, baths: 1, rent: currentRent + 40 },
          { beds: 2, baths: 2, rent: currentRent + 105 },
        ],
        modelVersion: 'mock-xgb-v1',
        reasoning: 'Comparable rents and moderate demand support a modest increase.',
      },
    });
  }

  private async createBillingArtifacts(input: {
    organizationId: string;
    propertyId: string;
    unitId: string;
    leaseId: string;
    tenantId: string;
    createdById: string;
  }) {
    const paymentMethod = await this.prisma.paymentMethod.create({
      data: {
        userId: input.tenantId,
        type: PaymentMethodType.CARD,
        provider: PaymentProvider.STRIPE,
        providerCustomerId: `cus_${faker.string.alphanumeric(12)}`,
        providerPaymentMethodId: `pm_${faker.string.alphanumeric(14)}`,
        last4: faker.finance.creditCardNumber('####'),
        brand: faker.helpers.arrayElement(['Visa', 'Mastercard', 'AmEx']),
        expMonth: faker.number.int({ min: 1, max: 12 }),
        expYear: faker.number.int({ min: this.now.getUTCFullYear(), max: this.now.getUTCFullYear() + 4 }),
      },
    });

    const recurringSchedule = await this.prisma.recurringInvoiceSchedule.create({
      data: {
        leaseId: input.leaseId,
        amount: faker.number.int({ min: 975, max: 2200 }),
        description: 'Monthly Rent',
        frequency: BillingFrequency.MONTHLY,
        dayOfMonth: 1,
        nextRun: this.daysFromNow(14),
        lateFeeAmount: 75,
        lateFeeAfterDays: 5,
        active: true,
      },
    });

    const currentInvoice = await this.prisma.invoice.create({
      data: {
        leaseId: input.leaseId,
        amount: recurringSchedule.amount,
        description: 'Rent - Current Month',
        dueDate: this.daysFromNow(14),
        issuedAt: this.daysAgo(16),
        externalId: `inv_${this.runLabel}_${faker.string.alphanumeric(12)}`,
        scheduleId: recurringSchedule.id,
        status: 'UNPAID',
      },
    });
    this.counts.invoices += 1;

    const paidInvoice = await this.prisma.invoice.create({
      data: {
        leaseId: input.leaseId,
        amount: recurringSchedule.amount,
        description: 'Rent - Prior Month',
        dueDate: this.daysAgo(18),
        issuedAt: this.daysAgo(32),
        externalId: `inv_${this.runLabel}_${faker.string.alphanumeric(12)}`,
        scheduleId: recurringSchedule.id,
        status: 'PAID',
      },
    });
    this.counts.invoices += 1;

    await this.prisma.autopayEnrollment.create({
      data: {
        leaseId: input.leaseId,
        paymentMethodId: paymentMethod.id,
        active: true,
        maxAmount: recurringSchedule.amount + 150,
      },
    });

    const payment = await this.prisma.payment.create({
      data: {
        amount: paidInvoice.amount,
        paymentDate: this.daysAgo(14),
        status: PaymentStatus.COMPLETED,
        invoiceId: paidInvoice.id,
        userId: input.tenantId,
        leaseId: input.leaseId,
        externalId: `pay_${this.runLabel}_${faker.string.alphanumeric(12)}`,
        reconciledAt: this.daysAgo(13),
        paymentMethodId: paymentMethod.id,
      },
    });
    this.counts.payments += 1;

    const ledgerAccount = await this.prisma.ledgerAccount.create({
      data: {
        organizationId: input.organizationId,
        leaseId: input.leaseId,
        propertyId: input.propertyId,
        unitId: input.unitId,
        residentId: input.tenantId,
        currency: 'USD',
        status: 'ACTIVE',
      },
    });

    await this.prisma.ledgerTransaction.createMany({
      data: [
        {
          accountId: ledgerAccount.id,
          entryType: 'CHARGE',
          direction: 'DEBIT',
          amountCents: Math.round(paidInvoice.amount * 100),
          effectiveDate: paidInvoice.dueDate,
          sourceType: 'INVOICE',
          sourceId: String(paidInvoice.id),
          description: paidInvoice.description,
          status: 'POSTED',
          createdById: input.createdById,
        },
        {
          accountId: ledgerAccount.id,
          paymentId: payment.id,
          entryType: 'PAYMENT',
          direction: 'CREDIT',
          amountCents: Math.round(payment.amount * 100),
          effectiveDate: payment.paymentDate,
          sourceType: 'PAYMENT',
          sourceId: String(payment.id),
          description: 'Resident payment received',
          status: 'POSTED',
          createdById: input.createdById,
        },
        {
          accountId: ledgerAccount.id,
          entryType: 'CHARGE',
          direction: 'DEBIT',
          amountCents: Math.round(currentInvoice.amount * 100),
          effectiveDate: currentInvoice.dueDate,
          sourceType: 'INVOICE',
          sourceId: String(currentInvoice.id),
          description: currentInvoice.description,
          status: 'POSTED',
          createdById: input.createdById,
        },
      ],
    });

    await this.prisma.paymentLedgerEntry.create({
      data: {
        paymentId: payment.id,
        organizationId: input.organizationId,
        leaseId: input.leaseId,
        sourceEventId: `evt_${this.runLabel}_${faker.string.alphanumeric(12)}`,
        currency: 'usd',
        grossAmountMinor: Math.round(payment.amount * 100),
        platformFeeMinor: Math.round(payment.amount * 100 * 0.029),
        netAmountMinor: Math.round(payment.amount * 100 * 0.971),
        tierSnapshot: { plan: 'growth', doors: 12 },
      },
    });

    await this.prisma.manualCharge.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        unitId: input.unitId,
        tenantId: input.tenantId,
        leaseId: input.leaseId,
        chargeType: ManualChargeType.UTILITY,
        amountCents: 4500,
        currency: 'USD',
        description: 'Water reimbursement',
        chargeDate: this.daysAgo(7),
        dueDate: this.daysFromNow(7),
        status: ManualChargeStatus.POSTED,
        createdById: input.createdById,
      },
    });

    await this.prisma.manualPayment.create({
      data: {
        organizationId: input.organizationId,
        propertyId: input.propertyId,
        unitId: input.unitId,
        tenantId: input.tenantId,
        leaseId: input.leaseId,
        amountCents: 10000,
        currency: 'USD',
        method: ManualPaymentMethod.MONEY_ORDER,
        referenceNumber: `MO-${faker.number.int({ min: 100000, max: 999999 })}`,
        receivedAt: this.daysAgo(4),
        appliedTo: ManualPaymentAppliedTo.RENT,
        memo: 'Front desk accepted payment',
        status: ManualPaymentStatus.POSTED,
        createdById: input.createdById,
      },
    });

    await this.prisma.lateFee.create({
      data: {
        invoiceId: currentInvoice.id,
        amount: 75,
        assessedAt: this.daysFromNow(20),
        waived: false,
      },
    });

    return { nextInvoiceDueDate: currentInvoice.dueDate };
  }

  private async createMaintenanceRequest(input: {
    authorId: string;
    propertyId: string;
    unitId: string;
    leaseId: string;
    assigneeId: number;
    slaPolicyId: number;
  }) {
    const asset = await this.prisma.maintenanceAsset.create({
      data: {
        propertyId: input.propertyId,
        unitId: input.unitId,
        name: faker.helpers.arrayElement(['Water Heater', 'Dishwasher', 'HVAC Condenser']),
        category: faker.helpers.arrayElement([
          MaintenanceAssetCategory.PLUMBING,
          MaintenanceAssetCategory.APPLIANCE,
          MaintenanceAssetCategory.HVAC,
        ]),
        manufacturer: faker.company.name(),
        model: faker.string.alphanumeric(8).toUpperCase(),
        serialNumber: faker.string.alphanumeric(12).toUpperCase(),
        installDate: this.daysAgo(800),
        warrantyExpiresAt: this.daysFromNow(400),
        notes: 'Mock seeded asset for request linkage.',
      },
    });

    const request = await this.prisma.maintenanceRequest.create({
      data: {
        title: faker.helpers.arrayElement([
          'Leaking under kitchen sink',
          'HVAC not cooling consistently',
          'Dishwasher leaves standing water',
        ]),
        description: faker.lorem.sentences(2),
        status: Status.IN_PROGRESS,
        authorId: input.authorId,
        priority: faker.helpers.arrayElement([
          MaintenancePriority.MEDIUM,
          MaintenancePriority.HIGH,
          MaintenancePriority.EMERGENCY,
        ]),
        responseDueAt: this.daysFromNow(1),
        dueAt: this.daysFromNow(4),
        acknowledgedAt: this.daysAgo(1),
        propertyId: input.propertyId,
        unitId: input.unitId,
        assetId: asset.id,
        assigneeId: input.assigneeId,
        slaPolicyId: input.slaPolicyId,
        leaseId: input.leaseId,
      },
    });
    this.counts.maintenanceRequests += 1;

    await this.prisma.maintenanceRequestHistory.create({
      data: {
        requestId: request.id,
        changedById: input.authorId,
        fromStatus: Status.PENDING,
        toStatus: Status.IN_PROGRESS,
        toAssigneeId: input.assigneeId,
        note: 'Assigned during seeded maintenance triage.',
      },
    });

    await this.prisma.maintenanceNote.create({
      data: {
        requestId: request.id,
        authorId: input.authorId,
        body: faker.lorem.sentences(2),
      },
    });

    await this.prisma.maintenancePhoto.create({
      data: {
        requestId: request.id,
        uploadedById: input.authorId,
        url: `${this.assetBaseUrl}/maintenance/${request.id}/issue-1.jpg`,
        caption: 'Seeded tenant photo of the issue.',
      },
    });

    return request;
  }

  private async createInspection(input: {
    propertyId: string;
    unitId: string;
    leaseId: string;
    tenantId: string;
    inspectorId: string;
    createdById: string;
  }) {
    const inspection = await this.prisma.unitInspection.create({
      data: {
        propertyId: input.propertyId,
        unitId: input.unitId,
        leaseId: input.leaseId,
        type: faker.helpers.arrayElement([InspectionType.MOVE_IN, InspectionType.ROUTINE]),
        status: InspectionStatus.COMPLETED,
        scheduledDate: this.daysAgo(5),
        completedDate: this.daysAgo(4),
        inspectorId: input.inspectorId,
        tenantId: input.tenantId,
        createdById: input.createdById,
        notes: faker.lorem.sentences(2),
        generalNotes: faker.lorem.sentences(2),
        findings: {
          overallCondition: 'good',
          actionItems: faker.number.int({ min: 1, max: 4 }),
        },
        reportGenerated: true,
        reportPath: `/reports/inspection-${faker.string.alphanumeric(10)}.pdf`,
      },
    });
    this.counts.inspections += 1;

    await this.prisma.unitInspectionPhoto.createMany({
      data: [0, 1].map((idx) => ({
        inspectionId: inspection.id,
        url: `${this.assetBaseUrl}/inspections/${inspection.id}/photo-${idx + 1}.jpg`,
        caption: faker.lorem.words(4),
        uploadedById: idx === 0 ? input.inspectorId : input.tenantId,
      })),
    });

    const roomDefinitions: Array<{ name: string; roomType: RoomType }> = [
      { name: 'Kitchen', roomType: RoomType.KITCHEN },
      { name: 'Bathroom', roomType: RoomType.BATHROOM },
      { name: 'Living Room', roomType: RoomType.LIVING_ROOM },
    ];

    await Promise.all(roomDefinitions.map(async (roomDef) => {
      const room = await this.prisma.inspectionRoom.create({
        data: {
          inspectionId: inspection.id,
          name: roomDef.name,
          roomType: roomDef.roomType,
        },
      });

      await Promise.all(['Walls', 'Flooring', 'Fixtures'].map(async (itemName) => {
        const item = await this.prisma.inspectionChecklistItem.create({
          data: {
            roomId: room.id,
            category: roomDef.name,
            itemName,
            condition: faker.helpers.arrayElement([
              InspectionCondition.EXCELLENT,
              InspectionCondition.GOOD,
              InspectionCondition.FAIR,
            ]),
            notes: faker.lorem.words(8),
            estimatedAge: faker.number.int({ min: 1, max: 12 }),
            requiresAction: itemName === 'Fixtures' && roomDef.roomType !== RoomType.LIVING_ROOM,
          },
        });

        await Promise.all([
          this.prisma.inspectionChecklistSubItem.create({
            data: {
              parentItemId: item.id,
              name: `${itemName} detail`,
              condition: InspectionCondition.GOOD,
              estimatedAge: faker.number.int({ min: 1, max: 8 }),
            },
          }),
          this.prisma.inspectionChecklistPhoto.create({
            data: {
              checklistItemId: item.id,
              uploadedById: input.inspectorId,
              url: `${this.assetBaseUrl}/inspections/${inspection.id}/${room.id}-${item.id}.jpg`,
              caption: `${roomDef.name} ${itemName}`,
              aiAnalysis: faker.lorem.sentence(),
            },
          }),
        ]);
      }));
    }));

    await this.prisma.inspectionSignature.createMany({
      data: [
        {
          inspectionId: inspection.id,
          userId: input.inspectorId,
          role: 'INSPECTOR',
          signatureData: Buffer.from('mock-inspector-signature').toString('base64'),
        },
        {
          inspectionId: inspection.id,
          userId: input.tenantId,
          role: 'TENANT',
          signatureData: Buffer.from('mock-tenant-signature').toString('base64'),
        },
      ],
    });

    return inspection;
  }

  private async createRepairEstimate(input: {
    propertyId: string;
    unitId: string;
    inspectionId: number;
    maintenanceRequestId: string;
    generatedById: string;
    approvedById: string;
  }) {
    const estimate = await this.prisma.repairEstimate.create({
      data: {
        propertyId: input.propertyId,
        unitId: input.unitId,
        inspectionId: input.inspectionId,
        maintenanceRequestId: input.maintenanceRequestId,
        totalLaborCost: 420,
        totalMaterialCost: 315,
        totalProjectCost: 735,
        itemsToRepair: 2,
        itemsToReplace: 1,
        totalLaborHours: 6,
        stepByStepPlan: 'Diagnose, isolate issue, replace failed component, test system, document repair.',
        currency: 'USD',
        generatedAt: this.daysAgo(3),
        generatedById: input.generatedById,
        status: EstimateStatus.APPROVED,
        approvedAt: this.daysAgo(2),
        approvedById: input.approvedById,
      },
    });
    this.counts.repairEstimates += 1;

    await this.prisma.repairEstimateLineItem.createMany({
      data: [
        {
          estimateId: estimate.id,
          itemDescription: 'Replace supply line and compression fitting',
          location: 'Kitchen sink cabinet',
          category: 'plumbing',
          issueType: 'repair',
          laborHours: 2.5,
          laborRate: 85,
          laborCost: 212.5,
          materialCost: 48,
          totalCost: 260.5,
          originalCost: 125,
          depreciatedValue: 40,
          depreciationRate: 0.68,
          conditionAdjustment: 0.15,
          estimatedLifetime: 8,
          currentAge: 6,
          repairInstructions: 'Shut off valves, remove failed line, install new braided line.',
          notes: 'Mock seeded line item.',
        },
        {
          estimateId: estimate.id,
          itemDescription: 'Replace disposal mounting assembly',
          location: 'Kitchen sink',
          category: 'appliance',
          issueType: 'replace',
          laborHours: 3.5,
          laborRate: 90,
          laborCost: 315,
          materialCost: 267,
          totalCost: 582,
          originalCost: 320,
          depreciatedValue: 85,
          depreciationRate: 0.73,
          conditionAdjustment: 0.25,
          estimatedLifetime: 10,
          currentAge: 9,
          repairInstructions: 'Remove existing disposal and install new mount and wiring harness.',
          notes: 'Replacement recommended based on age and wear.',
        },
      ],
    });

    return estimate;
  }

  private async createLeaseDocumentsAndHistory(leaseId: string, uploadedById: string, propertyId: string) {
    const leaseDocument = await this.prisma.leaseDocument.create({
      data: {
        leaseId,
        type: 'LEASE_EXECUTED',
        url: `${this.assetBaseUrl}/leases/${leaseId}/executed-lease.pdf`,
        description: 'Mock executed lease PDF.',
        uploadedById,
      },
    });

    const generalDocument = await this.prisma.document.create({
      data: {
        fileName: 'welcome-package.pdf',
        filePath: `/mock/docs/${leaseId}/welcome-package.pdf`,
        category: DocumentCategory.LEASE,
        description: 'Seeded welcome package for tenant onboarding.',
        mimeType: 'application/pdf',
        size: 182334,
        uploadedById,
        leaseId,
        propertyId,
      },
    });

    await this.prisma.leaseHistory.createMany({
      data: [
        {
          leaseId,
          actorId: uploadedById,
          fromStatus: LeaseStatus.DRAFT,
          toStatus: LeaseStatus.PENDING_APPROVAL,
          note: 'Seeded draft to approval transition.',
        },
        {
          leaseId,
          actorId: uploadedById,
          fromStatus: LeaseStatus.PENDING_APPROVAL,
          toStatus: LeaseStatus.ACTIVE,
          note: 'Seeded activation after execution.',
        },
      ],
    });

    const auditDocument = await this.prisma.document.create({
      data: {
        fileName: 'audit-trail.pdf',
        filePath: `/mock/docs/${leaseId}/audit-trail.pdf`,
        category: DocumentCategory.LEASE,
        description: 'Seeded audit trail for signature process.',
        mimeType: 'application/pdf',
        size: 45000,
        uploadedById,
        leaseId,
        propertyId,
      },
    });

    await this.prisma.esignEnvelope.create({
      data: {
        leaseId,
        provider: 'DOCUSIGN',
        providerEnvelopeId: `env_${faker.string.alphanumeric(16)}`,
        status: 'COMPLETED',
        providerStatus: 'completed',
        providerMetadata: { source: 'mock-seed' },
        createdById: uploadedById,
        participants: {
          create: [
            {
              name: faker.person.fullName(),
              email: this.uniqueEmail('esign-tenant'),
              role: 'TENANT',
              status: 'SIGNED',
            },
            {
              name: faker.person.fullName(),
              email: this.uniqueEmail('esign-manager'),
              role: 'MANAGER',
              status: 'SIGNED',
            },
          ],
        },
        signedPdfDocumentId: generalDocument.id,
        auditTrailDocumentId: auditDocument.id,
      },
    });
  }

  private async createApplicationsForVacantUnit(input: {
    propertyId: string;
    unitId: string;
    applicantsPerVacantUnit: number;
    screenerId: string;
    orgIndex: number;
    propertyIndex: number;
    unitIndex: number;
  }) {
    const applicants = await Promise.all(
      Array.from({ length: input.applicantsPerVacantUnit }).map((_, i) =>
        this.createUser(
          Role.TENANT,
          `applicant-${input.orgIndex}-${input.propertyIndex}-${input.unitIndex}-${i + 1}`,
        ),
      ),
    );

    await Promise.all(
      applicants.map(async (applicant, index) => {
        const approved = index === 0;
        const application = await this.prisma.rentalApplication.create({
          data: {
            applicantId: applicant.id,
            propertyId: input.propertyId,
            unitId: input.unitId,
            status: approved ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED,
            applicationDate: this.daysAgo(5 - index),
            fullName: `${applicant.firstName} ${applicant.lastName}`,
            email: applicant.email,
            phoneNumber: faker.phone.number({ style: "human" }),
            income: faker.number.int({ min: 3600, max: 8200 }),
            employmentStatus: faker.helpers.arrayElement(['Full Time', 'Self-Employed', 'Part Time']),
            previousAddress: faker.location.streetAddress(true),
            creditScore: faker.number.int({ min: 580, max: 760 }),
            monthlyDebt: faker.number.int({ min: 200, max: 1600 }),
            bankruptcyFiledYear: faker.helpers.arrayElement([undefined, undefined, 2020]),
            rentalHistoryComments: faker.lorem.sentences(2),
            authorizeCreditCheck: true,
            authorizeBackgroundCheck: true,
            authorizeEmploymentVerification: true,
            ssCardUploaded: true,
            proofOfIncomeUploaded: true,
            dlIdUploaded: true,
            qualificationStatus: approved ? QualificationStatus.QUALIFIED : QualificationStatus.NOT_QUALIFIED,
            recommendation: approved ? Recommendation.RECOMMEND_RENT : Recommendation.DO_NOT_RECOMMEND_RENT,
            screeningDetails: faker.lorem.sentences(2),
            screeningScore: approved ? 82 : 47,
            screeningReasons: approved
              ? ['income_verified', 'stable_history']
              : ['credit_risk', 'policy_mismatch'],
            screenedAt: this.daysAgo(3),
            screenedById: input.screenerId,
            decisionReasonCode: approved
              ? ApplicationDecisionReasonCode.OTHER
              : ApplicationDecisionReasonCode.CREDIT_RISK,
            decisionNotes: approved
              ? 'Approved in seeded screening flow.'
              : 'Denied in seeded screening flow.',
            decisionedAt: this.daysAgo(2),
            termsAcceptedAt: this.daysAgo(5),
            termsVersion: 'v1.0.0',
            privacyAcceptedAt: this.daysAgo(5),
            privacyVersion: 'v1.0.0',
            ai_recommendation: approved ? 'APPROVE' : 'DENY',
            ai_summary: faker.lorem.sentences(2),
            ai_reviewed_at: this.daysAgo(3),
          },
        });
        this.counts.applications += 1;

        await Promise.all([
          this.prisma.rentalApplicationNote.create({
            data: {
              applicationId: application.id,
              authorId: input.screenerId,
              body: faker.lorem.sentences(2),
            },
          }),
          this.prisma.applicationLifecycleEvent.createMany({
            data: [
              {
                applicationId: application.id,
                eventType: 'APPLICATION_SUBMITTED',
                toStatus: ApplicationStatus.PENDING,
                performedById: applicant.id,
                metadata: { source: 'portal' },
              },
              {
                applicationId: application.id,
                eventType: 'SCREENING_COMPLETED',
                fromStatus: ApplicationStatus.PENDING,
                toStatus: approved ? ApplicationStatus.APPROVED : ApplicationStatus.REJECTED,
                performedById: input.screenerId,
                metadata: { source: 'mock-seed', screeningScore: approved ? 82 : 47 },
              },
            ],
          }),
        ]);
      }),
    );
  }

  private async createPropertyExpenses(propertyId: string, recordedById: string) {
    const expenses = [
      { description: 'Landscaping service', amount: 165, category: ExpenseCategory.MAINTENANCE },
      { description: 'Property insurance premium', amount: 540, category: ExpenseCategory.INSURANCE },
      { description: 'Water utility bill', amount: 290, category: ExpenseCategory.UTILITIES },
    ];

    await this.prisma.expense.createMany({
      data: expenses.map(expense => ({
        propertyId,
        description: expense.description,
        amount: expense.amount,
        date: this.daysAgo(faker.number.int({ min: 1, max: 26 })),
        category: expense.category,
        recordedById,
      }))
    });
  }

  private async createOwnerStatement(organizationId: string, ownerId: string, approvedById: string) {
    await this.prisma.ownerStatement.create({
      data: {
        organizationId,
        ownerId,
        month: this.toMonthKey(this.now),
        grossIncomeCents: 892500,
        totalExpensesCents: 215400,
        managementFeeCents: 89250,
        netDistributionCents: 587850,
        status: 'APPROVED',
        approvedById,
        approvedAt: this.daysAgo(1),
        propertyBreakdown: {
          occupiedUnits: 8,
          delinquentUnits: 1,
          maintenanceSpendCents: 84200,
        },
      },
    });
    this.counts.ownerStatements += 1;
  }

  private async createQuickBooksConnection(organizationId: string, userId: string) {
    await this.prisma.quickBooksConnection.create({
      data: {
        organizationId,
        userId,
        companyId: `qb-company-${this.runLabel}-${faker.string.alphanumeric(6)}`,
        accessToken: `mock_access_${faker.string.alphanumeric(24)}`,
        refreshToken: `mock_refresh_${faker.string.alphanumeric(24)}`,
        tokenExpiresAt: this.daysFromNow(50),
        refreshTokenExpiresAt: this.daysFromNow(180),
        isActive: true,
      },
    });
  }

  private async createNotifications(userId: string, nextInvoiceDueDate: Date, rentAmount: number) {
    const notifications = [
      {
        type: NotificationType.PAYMENT_DUE,
        title: 'Upcoming rent due',
        message: `Rent of $${rentAmount.toFixed(2)} is due soon.`,
        scheduledFor: this.daysFromNow(10),
      },
      {
        type: NotificationType.INSPECTION_COMPLETED,
        title: 'Inspection report available',
        message: 'A new inspection report was generated for the unit.',
        scheduledFor: this.daysAgo(3),
      },
      {
        type: NotificationType.RENT_REMINDER,
        title: 'Reminder scheduled',
        message: `Automated reminder queued for ${nextInvoiceDueDate.toISOString()}.`,
        scheduledFor: this.daysFromNow(12),
      },
    ];

    await this.prisma.notification.createMany({
      data: notifications.map(notification => ({
        userId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        read: false,
        scheduledFor: notification.scheduledFor,
        metadata: { source: 'mock-seed' },
      }))
    });
    this.counts.notifications += notifications.length;
  }

  private async createSlaPolicies(propertyId: string) {
    const policies = [
      { priority: MaintenancePriority.EMERGENCY, responseTimeMinutes: 30, resolutionTimeMinutes: 240 },
      { priority: MaintenancePriority.HIGH, responseTimeMinutes: 120, resolutionTimeMinutes: 1440 },
      { priority: MaintenancePriority.MEDIUM, responseTimeMinutes: 480, resolutionTimeMinutes: 2880 },
      { priority: MaintenancePriority.LOW, responseTimeMinutes: 1440, resolutionTimeMinutes: 10080 },
    ] as const;

    const created: Record<MaintenancePriority, number> = {
      [MaintenancePriority.EMERGENCY]: 0,
      [MaintenancePriority.HIGH]: 0,
      [MaintenancePriority.MEDIUM]: 0,
      [MaintenancePriority.LOW]: 0,
    };

    await this.prisma.maintenanceSlaPolicy.createMany({
      data: policies.map(policy => ({
        propertyId,
        name: `${policy.priority} SLA`,
        priority: policy.priority,
        responseTimeMinutes: policy.responseTimeMinutes,
        resolutionTimeMinutes: policy.resolutionTimeMinutes,
        active: true,
      }))
    });

    const createdPolicies = await this.prisma.maintenanceSlaPolicy.findMany({
      where: { propertyId },
      select: { id: true, priority: true }
    });

    for (const p of createdPolicies) {
      created[p.priority] = p.id;
    }

    return created;
  }

  private pickSlaPolicyId(slaByPriority: Record<MaintenancePriority, number>) {
    const priority = faker.helpers.arrayElement([
      MaintenancePriority.EMERGENCY,
      MaintenancePriority.HIGH,
      MaintenancePriority.MEDIUM,
    ]);
    return slaByPriority[priority];
  }

  private async createUser(role: Role, slug: string): Promise<CreatedUser> {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const username = this.uniqueUsername(slug);
    const email = this.uniqueEmail(slug);

    const user = await this.prisma.user.create({
      data: {
        username,
        password: this.passwordHash,
        firstName,
        lastName,
        role,
        phoneNumber: faker.phone.number({ style: "human" }),
        email,
        passwordUpdatedAt: this.daysAgo(30),
        lastLoginAt: this.daysAgo(1),
        mfaEnabled: role !== Role.TENANT,
        stripeCustomerId: role === Role.TENANT ? `cus_${faker.string.alphanumeric(12)}` : undefined,
      },
    });
    this.counts.users += 1;

    return {
      id: user.id,
      role,
      email,
      username,
      firstName,
      lastName,
    };
  }

  private uniqueUsername(slug: string) {
    return `${slug}-${this.runLabel}-${faker.string.alphanumeric(4).toLowerCase()}`;
  }

  private uniqueEmail(slug: string) {
    return `${slug}-${this.runLabel}-${faker.string.alphanumeric(4).toLowerCase()}@example.test`;
  }

  private daysAgo(days: number) {
    const date = new Date(this.now);
    date.setUTCDate(date.getUTCDate() - days);
    return date;
  }

  private daysFromNow(days: number) {
    const date = new Date(this.now);
    date.setUTCDate(date.getUTCDate() + days);
    return date;
  }

  private toMonthKey(date: Date) {
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  }
}
