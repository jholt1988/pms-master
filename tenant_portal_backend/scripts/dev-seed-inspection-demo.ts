import { PrismaClient, Role, LeaseStatus, InspectionType, InspectionStatus } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Demo seed focused on the Inspection → Estimate workflow.
 *
 * Creates:
 * - Org + PM user + Tenant user
 * - Wichita, KS property + 1 unit + active lease
 * - One inspection with 3 rooms and multiple action items across trades
 */
async function main() {
  const adminUsername = 'admin';
  const adminPassword = 'Admin123!@#';

  const tenantUsername = 'tenant';
  const tenantPassword = 'Tenant123!@#';

  console.log('🌱 Inspection demo seed starting...');

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
      name: 'Riverside Flats',
      // IMPORTANT: address parsing in EstimateService expects City, ST, Country at the end.
      address: '123 N Main St, Wichita, KS, USA',
      organizationId: organization.id,
      city: 'Wichita',
      state: 'KS',
      zipCode: '67202',
    },
    create: {
      id: PROPERTY_ID,
      organizationId: organization.id,
      name: 'Riverside Flats',
      address: '123 N Main St, Wichita, KS, USA',
      city: 'Wichita',
      state: 'KS',
      zipCode: '67202',
    },
  });

  const unit = await prisma.unit.upsert({
    where: { id: 101 },
    update: { name: 'Unit 101', propertyId: property.id, bedrooms: 2, bathrooms: 1 },
    create: {
      id: 101,
      name: 'Unit 101',
      propertyId: property.id,
      bedrooms: 2,
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

  const lease = await prisma.lease.upsert({
    where: { id: 1 },
    update: {
      status: LeaseStatus.ACTIVE,
      unitId: unit.id,
      tenantId: tenant.id,
      rentAmount: 1350,
    },
    create: {
      id: 1,
      status: LeaseStatus.ACTIVE,
      unitId: unit.id,
      tenantId: tenant.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      rentAmount: 1350,
      noticePeriodDays: 30,
      depositAmount: 600,
      autoRenew: false,
    },
  });

  // Remove old demo inspections for this unit to keep the UI clean
  await prisma.unitInspection.deleteMany({
    where: {
      unitId: unit.id,
      propertyId: property.id,
      createdById: admin.id,
    },
  });

  const inspection = await prisma.unitInspection.create({
    data: {
      unitId: unit.id,
      propertyId: property.id,
      leaseId: lease.id,
      type: InspectionType.ROUTINE,
      status: InspectionStatus.IN_PROGRESS,
      scheduledDate: new Date(),
      inspectorId: admin.id,
      tenantId: tenant.id,
      createdById: admin.id,
      notes: 'Demo inspection seeded for estimate generation',
      rooms: {
        create: [
          {
            name: 'Kitchen',
            roomType: 'KITCHEN',
            checklistItems: {
              create: [
                {
                  category: 'Plumbing',
                  itemName: 'Kitchen faucet',
                  condition: 'DAMAGED',
                  requiresAction: true,
                  issueType: 'REPAIR',
                  severity: 'MED',
                  measurementValue: 1,
                  measurementUnit: 'COUNT',
                  notes: 'Leak under the sink; tighten/replace supply line as needed.',
                  estimatedAge: 8,
                },
                {
                  category: 'Appliances',
                  itemName: 'Dishwasher',
                  condition: 'NON_FUNCTIONAL',
                  requiresAction: true,
                  issueType: 'REPLACE',
                  severity: 'HIGH',
                  measurementValue: 1,
                  measurementUnit: 'COUNT',
                  notes: 'Does not drain; likely pump failure. Replace if repair exceeds threshold.',
                  estimatedAge: 12,
                },
              ],
            },
          },
          {
            name: 'Bathroom',
            roomType: 'BATHROOM',
            checklistItems: {
              create: [
                {
                  category: 'Plumbing',
                  itemName: 'Toilet',
                  condition: 'FAIR',
                  requiresAction: true,
                  issueType: 'REPAIR',
                  severity: 'LOW',
                  measurementValue: 1,
                  measurementUnit: 'COUNT',
                  notes: 'Runs intermittently; likely flapper/valve replacement.',
                  estimatedAge: 10,
                },
                {
                  category: 'Electrical',
                  itemName: 'GFCI outlet',
                  condition: 'DAMAGED',
                  requiresAction: true,
                  issueType: 'REPLACE',
                  severity: 'MED',
                  measurementValue: 1,
                  measurementUnit: 'COUNT',
                  notes: 'Trips frequently; replace GFCI and verify circuit.',
                  estimatedAge: 6,
                },
              ],
            },
          },
          {
            name: 'Living Room',
            roomType: 'LIVING_ROOM',
            checklistItems: {
              create: [
                {
                  category: 'HVAC',
                  itemName: 'Return air filter',
                  condition: 'POOR',
                  requiresAction: true,
                  issueType: 'REPAIR',
                  severity: 'LOW',
                  measurementValue: 1,
                  measurementUnit: 'COUNT',
                  notes: 'Filter is clogged; replace and inspect for airflow issues.',
                  estimatedAge: 1,
                },
                {
                  category: 'Flooring',
                  itemName: 'Carpet seam',
                  condition: 'DAMAGED',
                  requiresAction: true,
                  issueType: 'REPAIR',
                  severity: 'MED',
                  measurementValue: 6,
                  measurementUnit: 'LINEAR_FT',
                  notes: 'Seam separating near entry; re-stretch and secure.',
                  estimatedAge: 7,
                },
              ],
            },
          },
        ],
      },
    },
    include: {
      rooms: { include: { checklistItems: true } },
    },
  });

  console.log('✅ Inspection demo seed complete');
  console.log(`Admin login: ${adminUsername} / ${adminPassword}`);
  console.log(`Tenant login: ${tenantUsername} / ${tenantPassword}`);
  console.log(`Property: ${property.name} (${property.address})`);
  console.log(`Unit: ${unit.name}`);
  console.log(`Inspection ID: ${inspection.id}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
