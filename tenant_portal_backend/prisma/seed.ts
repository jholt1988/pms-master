import { 
  LeaseStatus, 
  MaintenanceAssetCategory, 
  MaintenancePriority, 
  TechnicianRole, 
  PrismaClient,
  Role,
  Status,
  ApplicationStatus,
  ExpenseCategory
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function ensureGlobalSla(priority: MaintenancePriority, resolution: number, response?: number) {
  const existing = await prisma.maintenanceSlaPolicy.findFirst({
    where: {
      propertyId: null,
      priority,
    },
  });

  if (existing) {
    await prisma.maintenanceSlaPolicy.update({
      where: { id: existing.id },
      data: {
        resolutionTimeMinutes: resolution,
        responseTimeMinutes: response ?? null,
        active: true,
      },
    });
    return existing;
  }

  return prisma.maintenanceSlaPolicy.create({
    data: {
      name: `${priority.toLowerCase()} default`,
      priority,
      resolutionTimeMinutes: resolution,
      responseTimeMinutes: response ?? null,
    },
  });
}

async function ensureTechnician(name: string, role: TechnicianRole, contact: { phone?: string; email?: string }) {
  const existing = await prisma.technician.findFirst({ where: { name } });
  if (existing) {
    return existing;
  }
  return prisma.technician.create({
    data: {
      name,
      role,
      phone: contact.phone,
      email: contact.email,
    },
  });
}

async function ensurePropertyWithUnits() {
  let property = await prisma.property.findFirst({
    where: { name: 'Central Plaza' },
    include: { units: true },
  });

  if (!property) {
    property = await prisma.property.create({
      data: {
        name: 'Central Plaza',
        address: '500 Market Street, Springfield',
        units: {
          create: [{ name: 'Suite 101' }, { name: 'Suite 102' }, { name: 'Suite 201' }],
        },
      },
      include: { units: true },
    });
  } else {
    if (!property.address) {
      property = await prisma.property.update({
        where: { id: property.id },
        data: { address: '500 Market Street, Springfield' },
        include: { units: true },
      });
    }

    if (property.units.length === 0) {
      property = await prisma.property.update({
        where: { id: property.id },
        data: {
          units: {
            create: [{ name: 'Suite 101' }, { name: 'Suite 102' }],
          },
        },
        include: { units: true },
      });
    }
  }

  return property;
}

async function ensureAsset(propertyId: number, unitId: number | null, name: string, category: MaintenanceAssetCategory) {
  const existing = await prisma.maintenanceAsset.findFirst({
    where: {
      name,
      propertyId,
      unitId: unitId === null ? null : unitId ?? undefined,
    },
  });
  if (existing) {
    return existing;
  }
  return prisma.maintenanceAsset.create({
    data: {
      property: { connect: { id: propertyId } },
      unit: unitId ? { connect: { id: unitId } } : undefined,
      name,
      category,
    },
  });
}

async function main() {
  console.info('🌱 Seeding comprehensive test data...');

  // 0. Create initial Property Manager account
  console.info('👤 Creating initial property manager account...');
  const adminHashedPassword = await bcrypt.hash('Admin123!@#', 10);
  
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {
      password: adminHashedPassword,
      role: Role.PROPERTY_MANAGER,
      passwordUpdatedAt: new Date(),
    },
    create: {
      username: 'admin',
      password: adminHashedPassword,
      role: Role.PROPERTY_MANAGER,
      passwordUpdatedAt: new Date(),
    },
  });
  
  console.info(`✅ Property Manager created: ${adminUser.username} (ID: ${adminUser.id})`);
  console.info(`   Default password: Admin123!@# (Please change after first login)`);

  // 1. Create SLA Policies
  console.info('📋 Creating SLA policies...');
  await ensureGlobalSla(MaintenancePriority.EMERGENCY, 240, 60);
  await ensureGlobalSla(MaintenancePriority.HIGH, 720, 240);
  await ensureGlobalSla(MaintenancePriority.MEDIUM, 1440, 480);
  await ensureGlobalSla(MaintenancePriority.LOW, 4320);

  // 2. Create Properties and Units
  console.info('🏢 Creating properties and units...');
  const property = await ensurePropertyWithUnits();
  const units = property.units;

  // Add more units if needed
  if (units.length < 5) {
    await prisma.unit.createMany({
      data: [
        { name: 'Suite 202', propertyId: property.id },
        { name: 'Suite 203', propertyId: property.id },
        { name: 'Suite 301', propertyId: property.id },
      ],
      skipDuplicates: true,
    });
  }

  const allUnits = await prisma.unit.findMany({ where: { propertyId: property.id } });

  // 3. Create Technicians
  console.info('👷 Creating technicians...');
  const technicians = await Promise.all([
    ensureTechnician('Alex Rivera', TechnicianRole.IN_HOUSE, {
      phone: '+1-555-0100',
      email: 'alex.rivera@example.com',
    }),
    ensureTechnician('Skyline HVAC Services', TechnicianRole.VENDOR, {
      phone: '+1-555-0155',
      email: 'dispatch@skyline-hvac.example',
    }),
    ensureTechnician('PlumbPro Solutions', TechnicianRole.VENDOR, {
      phone: '+1-555-0200',
      email: 'service@plumbpro.example',
    }),
  ]);

  // 4. Create Assets
  console.info('🔧 Creating maintenance assets...');
  await ensureAsset(property.id, allUnits[0]?.id ?? null, 'Main Rooftop HVAC', MaintenanceAssetCategory.HVAC);
  await ensureAsset(property.id, null, 'Fire Pump Controller', MaintenanceAssetCategory.SAFETY);
  await ensureAsset(property.id, allUnits[0]?.id ?? null, 'Water Heater Unit 101', MaintenanceAssetCategory.PLUMBING);
  await ensureAsset(property.id, null, 'Building Elevator', MaintenanceAssetCategory.OTHER);

  // 5. Create Test Users
  console.info('👥 Creating test users...');
  const hashedPassword = await bcrypt.hash('password123', 10);

  // Tenant Users
  const tenant1 = await prisma.user.upsert({
    where: { username: 'john_tenant' },
    update: {},
    create: {
      username: 'john_tenant',
      password: hashedPassword,
      role: Role.TENANT,
    },
  });

  const tenant2 = await prisma.user.upsert({
    where: { username: 'sarah_tenant' },
    update: {},
    create: {
      username: 'sarah_tenant',
      password: hashedPassword,
      role: Role.TENANT,
    },
  });

  const tenant3 = await prisma.user.upsert({
    where: { username: 'mike_tenant' },
    update: {},
    create: {
      username: 'mike_tenant',
      password: hashedPassword,
      role: Role.TENANT,
    },
  });

  // Property Manager User
  const propertyManager = await prisma.user.upsert({
    where: { username: 'admin_pm' },
    update: {},
    create: {
      username: 'admin_pm',
      password: hashedPassword,
      role: Role.PROPERTY_MANAGER,
    },
  });

  console.info('   Created users:');
  console.info('   - TENANT: john_tenant / password123');
  console.info('   - TENANT: sarah_tenant / password123');
  console.info('   - TENANT: mike_tenant / password123');
  console.info('   - PROPERTY_MANAGER: admin_pm / password123');

  // 6. Create Leases
  console.info('📄 Creating leases...');
  if (allUnits.length >= 3) {
    const today = new Date();
    const oneYearFromNow = new Date(today);
    oneYearFromNow.setFullYear(oneYearFromNow.getFullYear() + 1);

    const sixMonthsAgo = new Date(today);
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    // Active lease for tenant1
    await prisma.lease.upsert({
      where: { tenantId: tenant1.id },
      update: {},
      create: {
        tenantId: tenant1.id,
        unitId: allUnits[0].id,
        startDate: sixMonthsAgo,
        endDate: oneYearFromNow,
        moveInAt: sixMonthsAgo,
        rentAmount: 1800,
        depositAmount: 1800,
        status: LeaseStatus.ACTIVE,
        noticePeriodDays: 30,
        autoRenew: true,
        autoRenewLeadDays: 60,
      },
    });

    // Active lease for tenant2
    await prisma.lease.upsert({
      where: { tenantId: tenant2.id },
      update: {},
      create: {
        tenantId: tenant2.id,
        unitId: allUnits[1].id,
        startDate: sixMonthsAgo,
        endDate: oneYearFromNow,
        moveInAt: sixMonthsAgo,
        rentAmount: 2100,
        depositAmount: 2100,
        status: LeaseStatus.ACTIVE,
        noticePeriodDays: 30,
        autoRenew: false,
        autoRenewLeadDays: 60,
      },
    });

    // Active lease for tenant3
    await prisma.lease.upsert({
      where: { tenantId: tenant3.id },
      update: {},
      create: {
        tenantId: tenant3.id,
        unitId: allUnits[2].id,
        startDate: sixMonthsAgo,
        endDate: oneYearFromNow,
        moveInAt: sixMonthsAgo,
        rentAmount: 1950,
        depositAmount: 1950,
        status: LeaseStatus.ACTIVE,
        noticePeriodDays: 30,
        autoRenew: true,
        autoRenewLeadDays: 60,
      },
    });
  }

  // 7. Create Maintenance Requests
  console.info('🔨 Creating maintenance requests...');
  const maintenanceRequests = [];

  // Open request for tenant1
  const lease1 = await prisma.lease.findUnique({ where: { tenantId: tenant1.id } });
  maintenanceRequests.push(
    await prisma.maintenanceRequest.create({
      data: {
        authorId: tenant1.id,
        unitId: allUnits[0]?.id,
        title: 'Leaking Faucet in Kitchen',
        description: 'The kitchen faucet has been dripping constantly for the past two days.',
        priority: MaintenancePriority.MEDIUM,
        status: Status.PENDING,
        leaseId: lease1?.id,
      },
    })
  );

  // In Progress request for tenant1
  maintenanceRequests.push(
    await prisma.maintenanceRequest.create({
      data: {
        authorId: tenant1.id,
        unitId: allUnits[0]?.id,
        title: 'HVAC Not Heating Properly',
        description: 'The heating system is not reaching the set temperature. Currently only getting to 65°F.',
        priority: MaintenancePriority.HIGH,
        status: Status.IN_PROGRESS,
        assigneeId: technicians[1].id,
        leaseId: lease1?.id,
      },
    })
  );

  // Completed request for tenant1
  maintenanceRequests.push(
    await prisma.maintenanceRequest.create({
      data: {
        authorId: tenant1.id,
        unitId: allUnits[0]?.id,
        title: 'Light Bulb Replacement',
        description: 'Light bulb in hallway needs replacement.',
        priority: MaintenancePriority.LOW,
        status: Status.COMPLETED,
        assigneeId: technicians[0].id,
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        leaseId: lease1?.id,
      },
    })
  );

  // Emergency request for tenant2
  const lease2 = await prisma.lease.findUnique({ where: { tenantId: tenant2.id } });
  maintenanceRequests.push(
    await prisma.maintenanceRequest.create({
      data: {
        authorId: tenant2.id,
        unitId: allUnits[1]?.id,
        title: 'Water Leak from Ceiling',
        description: 'Emergency! Water is leaking from the ceiling in the bathroom.',
        priority: MaintenancePriority.EMERGENCY,
        status: Status.IN_PROGRESS,
        assigneeId: technicians[2].id,
        leaseId: lease2?.id,
      },
    })
  );

  // Open request for tenant3
  const lease3 = await prisma.lease.findUnique({ where: { tenantId: tenant3.id } });
  maintenanceRequests.push(
    await prisma.maintenanceRequest.create({
      data: {
        authorId: tenant3.id,
        unitId: allUnits[2]?.id,
        title: 'Broken Window Lock',
        description: 'The lock on the bedroom window is broken and won\'t close properly.',
        priority: MaintenancePriority.MEDIUM,
        status: Status.PENDING,
        leaseId: lease3?.id,
      },
    })
  );

  // 8. Create Payments
  console.info('💰 Creating payment records...');
  const currentMonth = new Date();
  const lastMonth = new Date(currentMonth);
  lastMonth.setMonth(lastMonth.getMonth() - 1);
  const twoMonthsAgo = new Date(currentMonth);
  twoMonthsAgo.setMonth(twoMonthsAgo.getMonth() - 2);

  // Tenant 1 payments (no paymentMethod for now - can be added later)
  await prisma.payment.create({
    data: {
      userId: tenant1.id,
      amount: 1800,
      paymentDate: twoMonthsAgo,
      status: 'COMPLETED',
    },
  });

  await prisma.payment.create({
    data: {
      userId: tenant1.id,
      amount: 1800,
      paymentDate: lastMonth,
      status: 'COMPLETED',
    },
  });

  await prisma.payment.create({
    data: {
      userId: tenant1.id,
      amount: 1800,
      paymentDate: currentMonth,
      status: 'PENDING',
    },
  });

  // Tenant 2 payments
  await prisma.payment.create({
    data: {
      userId: tenant2.id,
      amount: 2100,
      paymentDate: twoMonthsAgo,
      status: 'COMPLETED',
    },
  });

  await prisma.payment.create({
    data: {
      userId: tenant2.id,
      amount: 2100,
      paymentDate: lastMonth,
      status: 'COMPLETED',
    },
  });

  await prisma.payment.create({
    data: {
      userId: tenant2.id,
      amount: 2100,
      paymentDate: currentMonth,
      status: 'PENDING',
    },
  });

  // 9. Create Rental Applications
  console.info('📝 Creating rental applications...');
  if (allUnits.length >= 5) {
    await prisma.rentalApplication.create({
      data: {
        fullName: 'Emily Johnson',
        email: 'emily.johnson@example.com',
        phoneNumber: '+1-555-0300',
        previousAddress: '123 Oak Street, Springfield',
        income: 5000,
        employmentStatus: 'Employed Full-Time',
        propertyId: property.id,
        unitId: allUnits[3].id,
        status: ApplicationStatus.PENDING,
      },
    });

    await prisma.rentalApplication.create({
      data: {
        fullName: 'David Chen',
        email: 'david.chen@example.com',
        phoneNumber: '+1-555-0600',
        previousAddress: '789 Pine Road, Springfield',
        income: 6500,
        employmentStatus: 'Employed Full-Time',
        propertyId: property.id,
        unitId: allUnits[4].id,
        status: ApplicationStatus.PENDING,
      },
    });

    await prisma.rentalApplication.create({
      data: {
        fullName: 'Lisa Martinez',
        email: 'lisa.martinez@example.com',
        phoneNumber: '+1-555-0900',
        previousAddress: '555 Cedar Lane, Springfield',
        income: 4500,
        employmentStatus: 'Employed Part-Time',
        propertyId: property.id,
        unitId: allUnits[0].id,
        status: ApplicationStatus.PENDING,
        screenedById: propertyManager.id,
      },
    });
  }

    // 10. Create Expenses (for Property Manager)
  console.info('📊 Creating expense records...');
  await prisma.expense.create({
    data: {
      description: 'HVAC System Maintenance',
      amount: 850,
      date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      category: ExpenseCategory.MAINTENANCE,
      propertyId: property.id,
      recordedById: propertyManager.id,
    },
  });

  await prisma.expense.create({
    data: {
      description: 'Landscaping Services',
      amount: 300,
      date: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
      category: ExpenseCategory.OTHER,
      propertyId: property.id,
      recordedById: propertyManager.id,
    },
  });

  await prisma.expense.create({
    data: {
      description: 'Property Insurance',
      amount: 1200,
      date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      category: ExpenseCategory.INSURANCE,
      propertyId: property.id,
      recordedById: propertyManager.id,
    },
  });

  console.info('\n✅ Comprehensive seed data created!');
  console.info('\n📊 Summary:');
  console.info(`   - Users: 4 (3 tenants, 1 property manager)`);
  console.info(`   - Properties: 1 with ${allUnits.length} units`);
  console.info(`   - Active Leases: 3`);
  console.info(`   - Maintenance Requests: ${maintenanceRequests.length}`);
  console.info(`   - Payments: 6 (3 completed, 3 pending)`);
  console.info(`   - Rental Applications: 3`);
  console.info(`   - Expenses: 3`);
  console.info(`   - Technicians: ${technicians.length}`);
  console.info('\n🔑 Login Credentials:');
  console.info('   TENANT LOGIN:');
  console.info('     username: john_tenant   | password: password123');
  console.info('     username: sarah_tenant  | password: password123');
  console.info('     username: mike_tenant   | password: password123');
  console.info('   PROPERTY MANAGER LOGIN:');
  console.info('     username: admin_pm      | password: password123');
}

main()
  .catch((error) => {
    console.error('Seeding failed', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });





