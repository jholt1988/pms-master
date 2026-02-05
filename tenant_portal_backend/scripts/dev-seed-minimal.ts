import { PrismaClient, Role, LeaseStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminUsername = 'admin';
  const adminPassword = 'Admin123!@#';

  const tenantUsername = 'tenant';
  const tenantPassword = 'Tenant123!@#';

  console.log('🌱 Minimal dev seed starting...');

  const ORG_ID = '11111111-1111-4111-8111-111111111111';
  const PROPERTY_ID = '22222222-2222-4222-8222-222222222222';

  const organization = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { name: 'Default Organization' },
    create: { id: ORG_ID, name: 'Default Organization' },
  });

  const admin = await prisma.user.upsert({
    where: { username: adminUsername },
    update: { role: Role.PROPERTY_MANAGER },
    create: {
      username: adminUsername,
      password: await bcrypt.hash(adminPassword, 10),
      role: Role.PROPERTY_MANAGER,
      email: 'admin@example.com',
      firstName: 'Admin',
      lastName: 'User',
    },
  });

  await prisma.userOrganization.upsert({
    where: {
      userId_organizationId: {
        userId: admin.id,
        organizationId: organization.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      organizationId: organization.id,
      role: 'OWNER',
    },
  });

  const property = await prisma.property.upsert({
    where: { id: PROPERTY_ID },
    update: {
      name: 'Central Plaza',
      address: '500 Market Street, Springfield',
      organizationId: organization.id,
    },
    create: {
      id: PROPERTY_ID,
      organizationId: organization.id,
      name: 'Central Plaza',
      address: '500 Market Street, Springfield',
      city: 'Springfield',
      state: 'KS',
      zipCode: '00000',
    },
  });

  const unit = await prisma.unit.upsert({
    where: { id: 101 },
    update: { name: 'Suite 101', propertyId: property.id },
    create: {
      id: 101,
      name: 'Suite 101',
      propertyId: property.id,
      bedrooms: 1,
      bathrooms: 1,
    },
  });

  const tenant = await prisma.user.upsert({
    where: { username: tenantUsername },
    update: { role: Role.TENANT },
    create: {
      username: tenantUsername,
      password: await bcrypt.hash(tenantPassword, 10),
      role: Role.TENANT,
      email: 'tenant@example.com',
      firstName: 'Test',
      lastName: 'Tenant',
    },
  });

  const existingLease = await prisma.lease.findFirst({
    where: { tenantId: tenant.id },
  });

  if (existingLease) {
    await prisma.lease.update({
      where: { id: existingLease.id },
      data: {
        status: LeaseStatus.ACTIVE,
        unitId: unit.id,
        rentAmount: 1200,
      },
    });
  } else {
    await prisma.lease.create({
      data: {
        status: LeaseStatus.ACTIVE,
        unitId: unit.id,
        tenantId: tenant.id,
        startDate: new Date('2026-01-01'),
        endDate: new Date('2026-12-31'),
        rentAmount: 1200,
        noticePeriodDays: 30,
        depositAmount: 500,
        autoRenew: false,
      },
    });
  }

  console.log('✅ Minimal seed complete');
  console.log(`Admin login: ${adminUsername} / ${adminPassword}`);
  console.log(`Tenant login: ${tenantUsername} / ${tenantPassword}`);
  console.log(`Organization: ${organization.id}`);
  console.log(`Property: ${property.id}`);
  console.log(`Unit: ${unit.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
