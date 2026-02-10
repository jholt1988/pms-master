/* eslint-disable no-console */
// Robust demo seed for Inspection → Estimate.
// Designed to tolerate schema drift by feature-detecting Prisma delegates and omitting unknown fields.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');
const crypto = require('crypto');

const prisma = new PrismaClient();

function uuid() {
  return crypto.randomUUID();
}

async function upsertUser({ username, password, role, email, firstName, lastName }) {
  const hash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { username },
    update: { role, email, firstName, lastName },
    create: { username, password: hash, role, email, firstName, lastName },
  });
}

async function main() {
  console.log('🌱 Robust inspection demo seed starting...');

  const adminUsername = 'admin';
  const adminPassword = 'Admin123!@#';
  const tenantUsername = 'tenant';
  const tenantPassword = 'Tenant123!@#';

  // Some schemas have orgs, some don’t. Feature-detect.
  let organization = null;
  if (prisma.organization && prisma.userOrganization) {
    const ORG_ID = '11111111-1111-4111-8111-111111111111';
    organization = await prisma.organization.upsert({
      where: { id: ORG_ID },
      update: { name: 'Default Organization' },
      create: { id: ORG_ID, name: 'Default Organization' },
    });
  }

  // Users
  const admin = await upsertUser({
    username: adminUsername,
    password: adminPassword,
    role: 'PROPERTY_MANAGER',
    email: 'admin@example.com',
    firstName: 'Admin',
    lastName: 'User',
  });

  const tenant = await upsertUser({
    username: tenantUsername,
    password: tenantPassword,
    role: 'TENANT',
    email: 'tenant@example.com',
    firstName: 'Test',
    lastName: 'Tenant',
  });

  if (organization && prisma.userOrganization) {
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
  }

  // Property (try a flexible create)
  const propertyId = (prisma.property?.fields?.id?.type === 'Int') ? 1 : (organization ? '22222222-2222-4222-8222-222222222222' : uuid());

  const propertyWhere = { id: propertyId };
  const propertyUpdate = {
    name: 'Riverside Flats',
    address: '123 N Main St, Wichita, KS, USA',
    city: 'Wichita',
    state: 'KS',
    zipCode: '67202',
  };

  // Some schemas use organizationId; omit if not accepted.
  const propertyCreateBase = {
    id: propertyId,
    ...propertyUpdate,
  };

  if (organization) {
    propertyCreateBase.organizationId = organization.id;
    propertyUpdate.organizationId = organization.id;
  }

  let property;
  try {
    property = await prisma.property.upsert({ where: propertyWhere, update: propertyUpdate, create: propertyCreateBase });
  } catch (e) {
    // Retry without org fields and without optional address parts.
    const update2 = { name: propertyUpdate.name, address: propertyUpdate.address };
    const create2 = { id: propertyId, ...update2 };
    property = await prisma.property.upsert({ where: propertyWhere, update: update2, create: create2 });
  }

  // Unit (id type varies across schemas)
  const unitId = typeof property.id === 'string' ? uuid() : 101;
  let unit;
  try {
    unit = await prisma.unit.upsert({
      where: { id: unitId },
      update: { name: 'Unit 101', propertyId: property.id },
      create: { id: unitId, name: 'Unit 101', propertyId: property.id, bedrooms: 2, bathrooms: 1 },
    });
  } catch (e) {
    // Retry with minimal fields.
    unit = await prisma.unit.upsert({
      where: { id: unitId },
      update: { name: 'Unit 101', propertyId: property.id },
      create: { id: unitId, name: 'Unit 101', propertyId: property.id },
    });
  }

  // Lease (id type varies; many schemas have id as string/uuid)
  const leaseId = typeof unit.id === 'string' ? uuid() : 1;
  let lease;
  try {
    lease = await prisma.lease.upsert({
      where: { id: leaseId },
      update: { status: 'ACTIVE', unitId: unit.id, tenantId: tenant.id, rentAmount: 1350 },
      create: {
        id: leaseId,
        status: 'ACTIVE',
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
  } catch (e) {
    // Retry minimal lease
    lease = await prisma.lease.upsert({
      where: { id: leaseId },
      update: { status: 'ACTIVE', unitId: unit.id, tenantId: tenant.id },
      create: { id: leaseId, status: 'ACTIVE', unitId: unit.id, tenantId: tenant.id },
    });
  }

  // Inspection + rooms + checklist items (omit structured fields if schema doesn't support them)
  // Delete old seeded inspections to keep UI clean (if model exists)
  if (prisma.unitInspection?.deleteMany) {
    try {
      await prisma.unitInspection.deleteMany({ where: { unitId: unit.id, propertyId: property.id, createdById: admin.id } });
    } catch (_) {}
  }

  let inspection;
  try {
    inspection = await prisma.unitInspection.create({
      data: {
        unitId: unit.id,
        propertyId: property.id,
        leaseId: lease.id,
        type: 'ROUTINE',
        status: 'IN_PROGRESS',
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
                  { category: 'Plumbing', itemName: 'Kitchen faucet', condition: 'DAMAGED', requiresAction: true, notes: 'Leak under the sink.' },
                  { category: 'Appliances', itemName: 'Dishwasher', condition: 'NON_FUNCTIONAL', requiresAction: true, notes: 'Does not drain.' },
                ],
              },
            },
            {
              name: 'Bathroom',
              roomType: 'BATHROOM',
              checklistItems: {
                create: [
                  { category: 'Plumbing', itemName: 'Toilet', condition: 'FAIR', requiresAction: true, notes: 'Runs intermittently.' },
                  { category: 'Electrical', itemName: 'GFCI outlet', condition: 'DAMAGED', requiresAction: true, notes: 'Trips frequently.' },
                ],
              },
            },
            {
              name: 'Living Room',
              roomType: 'LIVING_ROOM',
              checklistItems: {
                create: [
                  { category: 'HVAC', itemName: 'Return air filter', condition: 'POOR', requiresAction: true, notes: 'Replace filter.' },
                  { category: 'Flooring', itemName: 'Carpet seam', condition: 'DAMAGED', requiresAction: true, notes: 'Seam separating near entry.' },
                ],
              },
            },
          ],
        },
      },
    });
  } catch (e) {
    console.error('Failed to create inspection with nested rooms/items. Retrying with minimal inspection only...');
    inspection = await prisma.unitInspection.create({
      data: {
        unitId: unit.id,
        propertyId: property.id,
        leaseId: lease.id,
        type: 'ROUTINE',
        status: 'IN_PROGRESS',
        scheduledDate: new Date(),
        createdById: admin.id,
        notes: 'Demo inspection seeded (minimal).',
      },
    });
  }

  console.log('✅ Robust inspection demo seed complete');
  console.log(`Admin login: ${adminUsername} / ${adminPassword}`);
  console.log(`Tenant login: ${tenantUsername} / ${tenantPassword}`);
  console.log(`Property: ${property.name} (${property.address || ''})`);
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
