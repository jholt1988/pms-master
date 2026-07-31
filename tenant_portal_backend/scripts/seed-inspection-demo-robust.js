/* eslint-disable no-console */
// Robust demo seed for Inspection → Estimate.
// Designed to tolerate schema drift by feature-detecting Prisma delegates and omitting unknown fields.

const { PrismaClient } = require('@prisma/client');
const {PrismaPg} = require('@prisma/adapter-pg');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const adapter = new PrismaPg({
  // connectionString: 'postgres://33bf66322d170080bed542f7b64934a810a78eadaf82a76edf474b0ccf6cde0f:sk_0hg08oPtjwj-NAiEg8qlJ@db.prisma.io:5432/postgres?sslmode=require'
     connectionString:  process.env.DATABASE_URL ||'postgresql://pms:pms@postgres:5432/pms?schema=public'
});

const prisma = new PrismaClient({adapter});

function uuid() {
  return crypto.randomUUID();
}

async function upsertUser({ username, password, role, email, firstName, lastName, phone }) {
  const hash = await bcrypt.hash(password, 10);
  const userData = { role, email, firstName, lastName };
  if (phone) userData.phoneNumber = phone;
  return prisma.user.upsert({
    where: { username },
    update: userData,
    create: { username, password: hash, ...userData },
  });
}

async function main() {
  console.log('🌱 Robust inspection demo seed starting...');

  const adminUsername = process.env.VERIFY_ADMIN_USER || 'admin';
  const adminPassword = process.env.VERIFY_ADMIN_PASS || 'Admin123!@#';
  const tenantUsername = process.env.VERIFY_TENANT_USER || 'tenant';
  const tenantPassword = process.env.VERIFY_TENANT_PASS || 'Tenant123!@#';

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
    phone: '555-123-4567',
  });

  if (organization && prisma.userOrganization) {
    await prisma.userOrganization.upsert({
      where: { userId_organizationId: { userId: admin.id, organizationId: organization.id } },
      update: { role: 'ADMIN' },
      create: { userId: admin.id, organizationId: organization.id, role: 'ADMIN' },
    });
    await prisma.userOrganization.upsert({
      where: { userId_organizationId: { userId: tenant.id, organizationId: organization.id } },
      update: { role: 'MEMBER' },
      create: { userId: tenant.id, organizationId: organization.id, role: 'MEMBER' },
    });
  }

  // Add after you create the tenant user
  async function ensureTenantRecordForUser(user) {
    if (!prisma.tenant) return null;

    // Try to find an existing tenant by userId or email
    let tenantRecord = null;
    try {
      tenantRecord = await prisma.user.findFirst({ where: { id: user.id } });
    } catch (_) {
      /* ignore - model might not have userId field or constraints differ */
    }
    if (!tenantRecord && user.email) {
      try {
        tenantRecord = await prisma.user.findFirst({ where: { email: user.email } });
      } catch (_) { }
    }

    if (!tenantRecord) {
      const createData = {};
      // If tenant.id type can safely be set to user.id, include it; otherwise omit and let DB assign
      if (typeof user.id === 'string') {
        // Many schemas use UUID for Tenant.id — attempt to reuse the user's id when safe
        createData.id = user.id;
      }
      // Many Tenant models reference the User via userId; include if present
      try { createData.id = user.id; } catch (_) { }

      createData.fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username;
      if (user.email) createData.email = user.email;
      createData.phone = user.phone || '555-123-4567';
      createData.createdAt = new Date();
      createData.updatedAt = new Date();

      try {
        tenantRecord = await prisma.user.create({ data: createData });
      } catch (err) {
        // Last-resort: try a minimal create (some schemas require fewer fields)
        try {
          tenantRecord = await prisma.user.create({ data: { fullName: createData.fullName } });
        } catch (err2) {
          console.error('Failed to create Tenant record for user:', err, err2);
          tenantRecord = null;
        }
      }
    }

    return tenantRecord;
  }
  const tenantRecord = await ensureTenantRecordForUser(tenant);

  // Use tenantId only when a Tenant row actually exists.
  const tenantIdForLease = tenantRecord ? tenantRecord.id : null;

  // If tenantId is not present, skip operations that target tenantId directly.
  if (tenantIdForLease) {
    try {
      await prisma.lease.deleteMany({ where: { tenantId: tenantIdForLease } });
    } catch (_) { }
  }

  const PROPERTY_ID = '22222222-2222-4222-8222-222222222222';
  const UNIT_ID = '33333333-3333-4333-8333-333333333333';
  const leaseId = '44444444-4444-4444-8444-444444444444';

  const propertyData = {
    name: 'Inspection Demo Property',
    address: '123 Demo St',
    city: 'Demo City',
    state: 'CA',
    zipCode: '90000',
    propertyType: 'MULTIFAMILY',
  };
  if (organization) propertyData.organizationId = organization.id;

  const property = await prisma.property.upsert({
    where: { id: PROPERTY_ID },
    update: propertyData,
    create: { id: PROPERTY_ID, ...propertyData },
  });

  const unit = await prisma.unit.upsert({
    where: { id: UNIT_ID },
    update: { name: 'Unit A', unitNumber: 'A', propertyId: property.id },
    create: { id: UNIT_ID, name: 'Unit A', unitNumber: 'A', propertyId: property.id },
  });

  // Try to find an existing lease by tenantId if available, otherwise by unitId
  let existingLease = null;
  try {
    if (tenantIdForLease) {
      existingLease = await prisma.lease.findFirst({ where: { tenantId: tenantIdForLease } });
    } else {
      existingLease = await prisma.lease.findFirst({ where: { unitId: unit.id } });
    }
  } catch (_) {
    existingLease = null;
  }

  let lease = null;
  if (existingLease) {
    lease = existingLease;
  }

  if (!lease) {
    // Build update/create data objects but only include tenantId when present.
    const leaseUpdate = {
      status: 'ACTIVE',
      unitId: unit.id,
      rentAmountCents: 135000,
      depositAmountCents: 60000,
    };
    if (tenantIdForLease) leaseUpdate.tenantId = tenantIdForLease;

    const leaseCreate = {
      id: leaseId,
      status: 'ACTIVE',
      unitId: unit.id,
      startDate: new Date('2026-01-01'),
      endDate: new Date('2026-12-31'),
      rentAmountCents: 135000,
      noticePeriodDays: 30,
      autoRenew: false,
    };
    if (tenantIdForLease) leaseCreate.tenantId = tenantIdForLease;

    try {
      lease = await prisma.lease.upsert({
        where: { id: leaseId },
        update: leaseUpdate,
        create: leaseCreate,
      });
    } catch (e) {
      // If the error is a foreign-key violation referencing Tenant (e.g., Postgres 23503),
      // retry without tenantId to avoid failing the entire seed.
      const msg = e?.message || String(e);
      console.error('Lease upsert failed:', msg);

      const isFkError = msg.includes('violates foreign key constraint') || msg.includes('23503');
      if (isFkError && tenantIdForLease) {
        console.warn('Detected FK error for tenantId; retrying lease upsert without tenantId.');
        // Remove tenantId and retry
        delete leaseUpdate.tenantId;
        delete leaseCreate.tenantId;
        lease = await prisma.lease.upsert({
          where: { id: leaseId },
          update: leaseUpdate,
          create: leaseCreate,
        });
      } else {
        // As before, attempt a minimal create as fallback
        lease = await prisma.lease.upsert({
          where: { id: leaseId },
      update: { rentAmountCents: 150000 },
      create: {
        id: leaseId,
        rentAmountCents: 150000,
        status: 'ACTIVE', unitId: unit.id, startDate: new Date('2026-01-01'), endDate: new Date('2026-12-31'), tenantId: tenant.id },
        });
      }
    }
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
