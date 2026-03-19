import { PrismaClient, Role, LeaseStatus, InspectionType, InspectionStatus, OrgRole } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

/**
 * Demo seed focused on the Inspection → Estimate workflow.
 *
 * Creates:
 * - PM user + Tenant user
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
  const UNIT_ID = '33333333-3333-4333-8333-333333333333';
  const LEASE_ID = '44444444-4444-4444-8444-444444444444';

  const org = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { name: 'Demo Org - Wichita' },
    create: { id: ORG_ID, name: 'Demo Org - Wichita' },
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

  const property = await prisma.property.upsert({
    where: { id: PROPERTY_ID },
    update: {
      name: 'Riverside Flats',
      // IMPORTANT: address parsing in EstimateService expects City, ST, Country at the end.
      address: '123 N Main St, Wichita, KS, USA',
      city: 'Wichita',
      state: 'KS',
      zipCode: '67202',
      organizationId: org.id,
    },
    create: {
      id: PROPERTY_ID,
      name: 'Riverside Flats',
      address: '123 N Main St, Wichita, KS, USA',
      city: 'Wichita',
      state: 'KS',
      zipCode: '67202',
      organizationId: org.id,
    },
  });

  const unit = await prisma.unit.upsert({
    where: { id: UNIT_ID },
    update: { name: 'Unit 101', propertyId: property.id, bedrooms: 2, bathrooms: 1 },
    create: {
      id: UNIT_ID,
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

  await prisma.userOrganization.upsert({
    where: { userId_organizationId: { userId: admin.id, organizationId: org.id } },
    update: { role: OrgRole.ADMIN },
    create: { userId: admin.id, organizationId: org.id, role: OrgRole.ADMIN },
  });

  await prisma.userOrganization.upsert({
    where: { userId_organizationId: { userId: tenant.id, organizationId: org.id } },
    update: { role: OrgRole.MEMBER },
    create: { userId: tenant.id, organizationId: org.id, role: OrgRole.MEMBER },
  });

 // Find existing leases for this tenant                                                                                                       
   const existingLeases = await prisma.lease.findMany({                                                                                          
   where: { tenantId: tenant.id },                                                                                                               
   select: { id: true },                                                                                                                         
   });                                                                                                                                           
                                                                                                                                                 
   if (existingLeases.length > 0) {                                                                                                              
   const leaseIds = existingLeases.map((l) => l.id);                                                                                             
                                                                                                                                                 
   // Remove dependents that reference invoices/leases                                                                                           
   await prisma.paymentAttempt.deleteMany ({                                                                                                     
   where: { invoice: { leaseId: { in: leaseIds } } },                                                                                            
   });                                                                                                                                           
                                                                                                                                                 
   await prisma.payment.deleteMany({                                                                                                             
   where: { invoice: { leaseId: { in: leaseIds } } },                                                                                            
   });                                                                                                                                           
                                                                                                                                                 
   await prisma.lateFee.deleteMany({                                                                                                             
   where: { invoice: { leaseId: { in: leaseIds } } },                                                                                            
   });                                                                                                                                           
                                                                                                                                                 
   await prisma.invoice.deleteMany({                                                                                                             
   where: { leaseId: { in: leaseIds } },                                                                                                         
   });                                                                                                                                           
                                                                                                                                                 
   // Optional but safe if present in your flow:                                                                                                 
   await prisma.autopayEnrollment.deleteMany({                                                                                                  
   where: { leaseId: { in: leaseIds } },                                                                                                         
   });                                                                                                                                           
                                                                                                                                                 
   // Now lease delete is safe                                                                                                                   
   await prisma.lease.deleteMany({                                                                                                               
   where: { id: { in: leaseIds } },                                                                                                              
   });                                                                                                                                           
   }                                                                                                                                             
                            

  const lease = await prisma.lease.upsert({
    where: { id: LEASE_ID },
    update: {
      status: LeaseStatus.ACTIVE,
      unitId: unit.id,
      tenantId: tenant.id,
      rentAmount: 1350,
    },
    create: {
      id: LEASE_ID,
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
                  notes: 'Leak under the sink; tighten/replace supply line as needed.',
                  estimatedAge: 8,
                },
                {
                  category: 'Appliances',
                  itemName: 'Dishwasher',
                  condition: 'NON_FUNCTIONAL',
                  requiresAction: true,
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
                  notes: 'Runs intermittently; likely flapper/valve replacement.',
                  estimatedAge: 10,
                },
                {
                  category: 'Electrical',
                  itemName: 'GFCI outlet',
                  condition: 'DAMAGED',
                  requiresAction: true,
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
                  notes: 'Filter is clogged; replace and inspect for airflow issues.',
                  estimatedAge: 1,
                },
                {
                  category: 'Flooring',
                  itemName: 'Carpet seam',
                  condition: 'DAMAGED',
                  requiresAction: true,
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
