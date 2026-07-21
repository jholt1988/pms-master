/**
 * PMS Demo Seed Script (schema-aligned)
 *
 * Creates a compact demo dataset compatible with the current Prisma schema:
 * - Organization + memberships
 * - PM, Tenant, Owner users
 * - Property + Unit
 * - Active Lease
 * - Optional Rental Application
 *
 * Usage:
 *   npm run db:seed:demo
 */

import {
  PrismaClient,
  Role,
  OrgRole,
  LeaseStatus,
  ApplicationStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';

const adapter = new PrismaPg({
  connectionString: 'postgres://33bf66322d170080bed542f7b64934a810a78eadaf82a76edf474b0ccf6cde0f:sk_0hg08oPtjwj-NAiEg8qlJ@db.prisma.io:5432/postgres?sslmode=require'
});

const prisma = new PrismaClient({ adapter });

const IDS = {
  ORG: 'aaaaaaa1-1111-4111-8111-111111111111',
  PROPERTY: 'aaaaaaa2-2222-4222-8222-222222222222',
  UNIT: 'aaaaaaa3-3333-4333-8333-333333333333',
  LEASE: 'aaaaaaa4-4444-4444-8444-444444444444',
};

async function upsertUser(params: {
  username: string;
  password: string;
  role: Role;
  email: string;
  firstName: string;
  lastName: string;
}) {
  const passwordHash = await bcrypt.hash(params.password, 10);
  return prisma.user.upsert({
    where: { username: params.username },
    update: {
      role: params.role,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
      password: passwordHash,
    },
    create: {
      username: params.username,
      password: passwordHash,
      role: params.role,
      email: params.email,
      firstName: params.firstName,
      lastName: params.lastName,
    },
  });
}

async function ensureMembership(userId: string, organizationId: string, role: OrgRole) {
  await prisma.userOrganization.upsert({
    where: { userId_organizationId: { userId, organizationId } },
    update: { role },
    create: { userId, organizationId, role },
  });
}

async function main() {
  console.log('🌱 Starting PMS demo seed (schema-aligned)...');

  const org = await prisma.organization.upsert({
    where: { id: IDS.ORG },
    update: { name: 'Sunset Property Management' },
    create: {
      id: IDS.ORG,
      name: 'Sunset Property Management',
    },
  });

  const pm = await upsertUser({
    username: 'morgan_pm',
    password: '',
    role: Role.PROPERTY_MANAGER,
    email: 'morgan@pms-demo.com',
    firstName: 'Morgan',
    lastName: 'PropertyManager',
  });

  const owner = await upsertUser({
    username: 'jordan_owner',
    password: 'demo1234',
    // Use ADMIN at user-role level for compatibility with environments
    // where OWNER may not yet exist in the live enum; ownership is expressed
    // via OrgRole.OWNER membership below.
    role: Role.ADMIN,
    email: 'jordan@owner.com',
    firstName: 'Jordan',
    lastName: 'Owner',
  });

  const tenant = await upsertUser({
    username: 'alex_tenant',
    password: 'demo1234',
    role: Role.TENANT,
    email: 'alex@email.com',
    firstName: 'Alex',
    lastName: 'Smith',
  });

  await ensureMembership(pm.id, org.id, OrgRole.ADMIN);
  await ensureMembership(owner.id, org.id, OrgRole.OWNER);
  await ensureMembership(tenant.id, org.id, OrgRole.MEMBER);

  const property = await prisma.property.upsert({
    where: { id: IDS.PROPERTY },
    update: {
      name: 'Sunset Apartments',
      address: '1234 Sunset Lane, Wichita, KS, USA',
      city: 'Wichita',
      state: 'KS',
      zipCode: '67203',
      organizationId: org.id,
    },
    create: {
      id: IDS.PROPERTY,
      organizationId: org.id,
      name: 'Sunset Apartments',
      address: '1234 Sunset Lane, Wichita, KS, USA',
      city: 'Wichita',
      state: 'KS',
      zipCode: '67203',
      propertyType: 'MULTIFAMILY',
    },
  });

  const unit = await prisma.unit.upsert({
    where: { id: IDS.UNIT },
    update: {
      name: 'Unit 204',
      propertyId: property.id,
      unitNumber: '204',
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 850,
    },
    create: {
      id: IDS.UNIT,
      name: 'Unit 204',
      propertyId: property.id,
      unitNumber: '204',
      bedrooms: 2,
      bathrooms: 1,
      squareFeet: 850,
    },
  });

  // Ensure one active lease for this tenant and unit
  const existingTenantLeases = await prisma.lease.findMany({ where: { tenantId: tenant.id }, select: { id: true } });
  const keepLease = existingTenantLeases.find((l) => l.id === IDS.LEASE);
  const toRemove = existingTenantLeases.filter((l) => l.id !== IDS.LEASE).map((l) => l.id);

  if (toRemove.length) {
    await prisma.ledgerAccount.deleteMany({ where: { leaseId: { in: toRemove } } });
    await prisma.inspectionRequest.deleteMany({ where: { leaseId: { in: toRemove } } });
    await prisma.unitInspection.deleteMany({ where: { leaseId: { in: toRemove } } });
    await prisma.leaseDocument.deleteMany({ where: { leaseId: { in: toRemove } } });
    await prisma.leaseHistory.deleteMany({ where: { leaseId: { in: toRemove } } });
    await prisma.leaseNotice.deleteMany({ where: { leaseId: { in: toRemove } } });
    await prisma.leaseRenewalOffer.deleteMany({ where: { leaseId: { in: toRemove } } });
    await prisma.recurringInvoiceSchedule.deleteMany({ where: { leaseId: { in: toRemove } } });
    await prisma.autopayEnrollment.deleteMany({ where: { leaseId: { in: toRemove } } });
    await prisma.maintenanceRequest.updateMany({ where: { leaseId: { in: toRemove } }, data: { leaseId: null } });
    await prisma.manualPayment.deleteMany({ where: { leaseId: { in: toRemove } } });
    await prisma.manualCharge.deleteMany({ where: { leaseId: { in: toRemove } } });
    await prisma.invoice.deleteMany({ where: { leaseId: { in: toRemove } } });
    await prisma.lease.deleteMany({ where: { id: { in: toRemove } } });
  }

  const lease = await prisma.lease.upsert({
    where: { id: IDS.LEASE },
    update: {
      tenantId: tenant.id,
      unitId: unit.id,
      status: LeaseStatus.ACTIVE,
      rentAmountCents: 120000,
      depositAmount: 1200,
      depositAmountCents: 120000,
    },
    create: {
      id: IDS.LEASE,
      tenantId: tenant.id,
      unitId: unit.id,
      status: LeaseStatus.ACTIVE,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2027-02-28'),
      rentAmountCents: 120000,
      depositAmount: 1200,
      depositAmountCents: 120000,
      noticePeriodDays: 30,
      autoRenew: false,
    },
  });

  await prisma.rentalApplication.upsert({
    where: { id: 204001 },
    update: {
      fullName: 'Alex Smith',
      email: 'alex@email.com',
      phoneNumber: '(316) 555-0124',
      propertyId: property.id,
      unitId: unit.id,
      status: ApplicationStatus.APPROVED,
      convertedLeaseId: lease.id,
    },
    create: {
      id: 204001,
      fullName: 'Alex Smith',
      email: 'alex@email.com',
      phoneNumber: '(316) 555-0124',
      income: 4800,
      employmentStatus: 'Employed Full-Time',
      previousAddress: '101 Prior St, Wichita, KS',
      propertyId: property.id,
      unitId: unit.id,
      status: ApplicationStatus.APPROVED,
      convertedLeaseId: lease.id,
      applicantId: tenant.id,
    },
  });

  console.log('✅ Demo seed complete');
  console.log('PM login: morgan_pm / demo1234');
  console.log('Tenant login: alex_tenant / demo1234');
  console.log('Owner login: jordan_owner / demo1234');
  console.log('Property: Sunset Apartments');
  console.log('Unit: 204');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
