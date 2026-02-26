/**
 * PMS Demo Seed Script
 * 
 * Creates demo data for the PMS MVP Demo Runbook:
 * - Property: Sunset Apartments
 * - Unit: 204 (2BR, 1BA)
 * - PM: Morgan
 * - Tenant: Alex
 * - Owner: Jordan
 * 
 * Usage: npx ts-node prisma/seed-demo.ts
 * Or: npm run db:seed:demo
 */

import { 
  PrismaClient,
  Role,
  LeaseStatus,
  ApplicationStatus,
  PropertyStatus,
  UnitStatus
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting PMS Demo Seed...\n');

  // Clean up existing demo data (optional - comment out if you want to keep existing)
  // await cleanupDemoData();

  // 1. Create Organization
  const org = await prisma.organization.upsert({
    where: { name: 'Sunset Property Management' },
    update: {},
    create: {
      name: 'Sunset Property Management',
      subdomain: 'sunset-pm',
      status: 'ACTIVE',
    },
  });
  console.log('✅ Organization created:', org.name);

  // 2. Create PM User (Morgan)
  const pmPassword = await bcrypt.hash('demo1234', 10);
  const pm = await prisma.user.upsert({
    where: { email: 'morgan@pms-demo.com' },
    update: {},
    create: {
      email: 'morgan@pms-demo.com',
      firstName: 'Morgan',
      lastName: 'PropertyManager',
      password: pmPassword,
      role: Role.PROPERTY_MANAGER,
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });
  console.log('✅ PM User created:', pm.email);

  // 3. Create Owner User (Jordan)
  const ownerPassword = await bcrypt.hash('demo1234', 10);
  const owner = await prisma.user.upsert({
    where: { email: 'jordan@owner.com' },
    update: {},
    create: {
      email: 'jordan@owner.com',
      firstName: 'Jordan',
      lastName: 'Owner',
      password: ownerPassword,
      role: Role.OWNER,
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });
  console.log('✅ Owner User created:', owner.email);

  // 4. Create Property
  const property = await prisma.property.upsert({
    where: { id: 'sunset-apartments' },
    update: {},
    create: {
      id: 'sunset-apartments',
      name: 'Sunset Apartments',
      address: '1234 Sunset Lane',
      city: 'Wichita',
      state: 'KS',
      zipCode: '67203',
      propertyType: 'MULTIFAMILY',
      totalUnits: 12,
      organizationId: org.id,
      status: PropertyStatus.ACTIVE,
    },
  });
  console.log('✅ Property created:', property.name);

  // 5. Create Unit 204
  const unit = await prisma.unit.upsert({
    where: { id: 'sunset-204' },
    update: {},
    create: {
      id: 'sunset-204',
      propertyId: property.id,
      unitNumber: '204',
      bedrooms: 2,
      bathrooms: 1,
      sqft: 850,
      rentAmount: 1200,
      status: UnitStatus.VACANT,
    },
  });
  console.log('✅ Unit created:', `${property.name} - Unit ${unit.unitNumber}`);

  // 6. Create Tenant Application → Lease for Alex
  // First create application
  const application = await prisma.application.upsert({
    where: { id: 'alex-application' },
    update: {},
    create: {
      id: 'alex-application',
      propertyId: property.id,
      unitId: unit.id,
      firstName: 'Alex',
      lastName: 'Smith',
      email: 'alex@email.com',
      phone: '(316) 555-0124',
      status: ApplicationStatus.APPROVED,
      applicationDate: new Date('2026-02-15'),
      moveInDate: new Date('2026-03-01'),
    },
  });
  console.log('✅ Application created:', `${application.firstName} ${application.lastName}`);

  // Create tenant user
  const tenantPassword = await bcrypt.hash('demo1234', 10);
  const tenant = await prisma.user.upsert({
    where: { email: 'alex@email.com' },
    update: {},
    create: {
      email: 'alex@email.com',
      firstName: 'Alex',
      lastName: 'Smith',
      password: tenantPassword,
      role: Role.TENANT,
      organizationId: org.id,
      status: 'ACTIVE',
    },
  });
  console.log('✅ Tenant User created:', tenant.email);

  // Create lease
  const lease = await prisma.lease.upsert({
    where: { id: 'alex-lease' },
    update: {},
    create: {
      id: 'alex-lease',
      unitId: unit.id,
      tenantId: tenant.id,
      startDate: new Date('2026-03-01'),
      endDate: new Date('2027-02-28'),
      monthlyRent: 1200,
      securityDeposit: 1200,
      status: LeaseStatus.ACTIVE,
    },
  });
  console.log('✅ Lease created:', `Unit ${unit.unitNumber} - ${lease.startDate.toISOString().split('T')[0]} to ${lease.endDate.toISOString().split('T')[0]}`);

  // Update unit status to occupied
  await prisma.unit.update({
    where: { id: unit.id },
    data: { status: UnitStatus.OCCUPIED },
  });
  console.log('✅ Unit status updated to OCCUPIED');

  // 7. Create OwnerProperty relationship (Jordan owns Sunset Apartments)
  await prisma.ownerProperty.upsert({
    where: { 
      ownerId_propertyId: {
        ownerId: owner.id,
        propertyId: property.id
      }
    },
    update: {},
    create: {
      ownerId: owner.id,
      propertyId: property.id,
      ownershipPercentage: 100,
    },
  });
  console.log('✅ Owner-Property relationship created');

  console.log('\n🎉 Demo seed complete!');
  console.log('\n📋 Login credentials:');
  console.log('   PM:   morgan@pms-demo.com / demo1234');
  console.log('   Tenant: alex@email.com / demo1234');
  console.log('   Owner: jordan@owner.com / demo1234');
  console.log('\n📍 Property: Sunset Apartments, 1234 Sunset Lane, Wichita, KS 67203');
  console.log('   Unit 204: 2BR, 1BA, 850 sq ft, $1,200/mo');
}

async function cleanupDemoData() {
  console.log('🧹 Cleaning up existing demo data...');
  await prisma.lease.deleteMany({ where: { id: { startsWith: 'alex-' } } }).catch(() => {});
  await prisma.application.deleteMany({ where: { id: { startsWith: 'alex-' } } }).catch(() => {});
  await prisma.unit.deleteMany({ where: { id: { startsWith: 'sunset-' } } }).catch(() => {});
  await prisma.property.deleteMany({ where: { id: 'sunset-apartments' } }).catch(() => {});
  await prisma.user.deleteMany({ 
    where: { 
      email: { in: ['morgan@pms-demo.com', 'alex@email.com', 'jordan@owner.com'] }
    } 
  }).catch(() => {});
  await prisma.organization.deleteMany({ where: { name: 'Sunset Property Management' } }).catch(() => {});
  console.log('✅ Cleanup complete\n');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
