/* eslint-disable no-console */
// Realistic, scenario-rich demo dataset for a hands-on trial of the
// property-management OS. Idempotent: safe to re-run.
//
//   Operator (PM):  manager / Manager123!@#
//   Owner:          owner   / Owner123!@#
//   Tenant portal:  jamie   / Tenant123!@#   (all tenants use Tenant123!@#)
//
// Scale: 3 properties, ~11 units, 8 tenant leases (active / renewal-due /
// notice-given), payment histories incl. a delinquent tenant, maintenance
// across every priority+status, and rental applications across the pipeline.

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

const ORG_ID = '11111111-1111-4111-8111-111111111111';

const money = (n) => Math.round(n);
const monthsAgo = (n) => { const d = new Date(); d.setMonth(d.getMonth() - n); d.setDate(1); return d; };
const daysFromNow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d; };

async function upsertUser({ username, password, role, email, firstName, lastName, phoneNumber }) {
  const hash = await bcrypt.hash(password, 10);
  return prisma.user.upsert({
    where: { username },
    update: { role, email, firstName, lastName, phoneNumber },
    create: { username, password: hash, role, email, firstName, lastName, phoneNumber },
  });
}

// Insert a legacy "Tenant" row with the SAME id as the User so Lease's real DB
// FK (Lease_tenantId_fkey → "Tenant", a drift documented in issue #51) is
// satisfied while schema.prisma models it as User. Idempotent.
async function ensureTenantRow(user, fullName, email, phone) {
  await prisma.$executeRawUnsafe(
    `INSERT INTO "Tenant" (id, "fullName", email, phone, "createdAt", "updatedAt")
     VALUES ($1::uuid, $2, $3, $4, now(), now())
     ON CONFLICT (id) DO UPDATE SET "fullName" = EXCLUDED."fullName", email = EXCLUDED.email, phone = EXCLUDED.phone`,
    user.id, fullName, email, phone,
  );
}

async function main() {
  console.log('🌱 Seeding scenario-rich demo dataset...');

  const org = await prisma.organization.upsert({
    where: { id: ORG_ID },
    update: { name: 'Riverside Property Group' },
    create: { id: ORG_ID, name: 'Riverside Property Group' },
  });

  // ---- Operator + owner ----
  const manager = await upsertUser({
    username: 'manager', password: 'Manager123!@#', role: 'PROPERTY_MANAGER',
    email: 'manager@riverside.test', firstName: 'Morgan', lastName: 'Reyes', phoneNumber: '+13165550101',
  });
  const owner = await upsertUser({
    username: 'owner', password: 'Owner123!@#', role: 'OWNER',
    email: 'owner@riverside.test', firstName: 'Olivia', lastName: 'Bennett', phoneNumber: '+13165550102',
  });
  for (const u of [manager, owner]) {
    await prisma.userOrganization.upsert({
      where: { userId_organizationId: { userId: u.id, organizationId: org.id } },
      update: {},
      create: { userId: u.id, organizationId: org.id, role: u.role === 'OWNER' ? 'OWNER' : 'ADMIN' },
    });
  }

  // ---- Properties ----
  const propertyDefs = [
    {
      id: '22222222-2222-4222-8222-222222222222',
      name: 'Riverside Flats', address: '123 N Main St', city: 'Wichita', state: 'KS', zip: '67202',
      type: 'MULTI_FAMILY', yearBuilt: 1998,
      units: [
        { n: 'Apt 101', num: '101', bd: 1, ba: 1, sf: 620, rent: 1050 },
        { n: 'Apt 102', num: '102', bd: 2, ba: 1, sf: 850, rent: 1350 },
        { n: 'Apt 201', num: '201', bd: 2, ba: 2, sf: 980, rent: 1550 },
        { n: 'Apt 202', num: '202', bd: 3, ba: 2, sf: 1180, rent: 1850 },
        { n: 'Apt 203', num: '203', bd: 1, ba: 1, sf: 600, rent: 1000 },
      ],
    },
    {
      id: '22222222-2222-4222-8222-222222222223',
      name: 'Maple Court Duplexes', address: '840 Maple Ave', city: 'Wichita', state: 'KS', zip: '67208',
      type: 'DUPLEX', yearBuilt: 2010,
      units: [
        { n: 'Unit A', num: 'A', bd: 3, ba: 2, sf: 1320, rent: 1975 },
        { n: 'Unit B', num: 'B', bd: 3, ba: 2, sf: 1320, rent: 1975 },
      ],
    },
    {
      id: '22222222-2222-4222-8222-222222222224',
      name: 'Delano Lofts', address: '55 W Douglas Ave', city: 'Wichita', state: 'KS', zip: '67213',
      type: 'MULTI_FAMILY', yearBuilt: 2019,
      units: [
        { n: 'Loft 1A', num: '1A', bd: 1, ba: 1, sf: 720, rent: 1250 },
        { n: 'Loft 1B', num: '1B', bd: 2, ba: 2, sf: 1050, rent: 1725 },
        { n: 'Loft 2A', num: '2A', bd: 2, ba: 2, sf: 1050, rent: 1750 },
        { n: 'Loft 2B', num: '2B', bd: 1, ba: 1, sf: 700, rent: 1225 },
      ],
    },
  ];

  const allUnits = []; // { unit, rent, propertyId }
  const properties = [];
  let unitSeq = 0;
  for (const p of propertyDefs) {
    const property = await prisma.property.upsert({
      where: { id: p.id },
      update: { name: p.name, organizationId: org.id },
      create: {
        id: p.id, organizationId: org.id, name: p.name, address: p.address,
        city: p.city, state: p.state, zipCode: p.zip, country: 'USA',
        propertyType: p.type, yearBuilt: p.yearBuilt,
      },
    });
    properties.push(property);
    for (const u of p.units) {
      unitSeq++;
      const id = `33333333-0000-4000-8000-${String(unitSeq).padStart(12, '0')}`;
      const unit = await prisma.unit.upsert({
        where: { id },
        update: { name: u.n, propertyId: property.id },
        create: {
          id, name: u.n, unitNumber: u.num, propertyId: property.id, status: 'VACANT',
          bedrooms: u.bd, bathrooms: u.ba, squareFeet: u.sf,
          hasParking: true, hasLaundry: unitSeq % 2 === 0, hasAC: true, petsAllowed: unitSeq % 3 === 0,
        },
      });
      allUnits.push({ unit, rent: u.rent, propertyId: property.id });
    }
  }

  // ---- Tenants + leases (8 occupied; scenarios vary by index) ----
  // scenario: 'current' | 'delinquent' | 'renewal' | 'notice'
  const tenantDefs = [
    { u: 'jamie', f: 'Jamie', l: 'Carter', ph: '+13165550201', scn: 'current' },
    { u: 'sofia', f: 'Sofia', l: 'Nguyen', ph: '+13165550202', scn: 'current' },
    { u: 'liam', f: 'Liam', l: "O'Brien", ph: '+13165550203', scn: 'delinquent' },
    { u: 'noah', f: 'Noah', l: 'Patel', ph: '+13165550204', scn: 'current' },
    { u: 'ava', f: 'Ava', l: 'Martinez', ph: '+13165550205', scn: 'renewal' },
    { u: 'ethan', f: 'Ethan', l: 'Kim', ph: '+13165550206', scn: 'notice' },
    { u: 'mia', f: 'Mia', l: 'Johnson', ph: '+13165550207', scn: 'current' },
    { u: 'lucas', f: 'Lucas', l: 'Brown', ph: '+13165550208', scn: 'delinquent' },
  ];

  const leases = [];
  let paidCount = 0;
  for (const [i, t] of tenantDefs.entries()) {
    const tenant = await upsertUser({
      username: t.u, password: 'Tenant123!@#', role: 'TENANT',
      email: `${t.u}@tenant.test`, firstName: t.f, lastName: t.l, phoneNumber: t.ph,
    });
    const { unit, rent } = allUnits[i];
    await ensureTenantRow(tenant, `${t.f} ${t.l}`, `${t.u}@tenant.test`, t.ph);

    // Clear dependents before the lease (FK order: payments → invoices → lease).
    const priorLeases = await prisma.lease.findMany({
      where: { OR: [{ tenantId: tenant.id }, { unitId: unit.id }] }, select: { id: true },
    });
    const priorIds = priorLeases.map((l) => l.id);
    if (priorIds.length) {
      await prisma.payment.deleteMany({ where: { leaseId: { in: priorIds } } });
      await prisma.invoice.deleteMany({ where: { leaseId: { in: priorIds } } });
      await prisma.maintenanceRequest.deleteMany({ where: { leaseId: { in: priorIds } } });
      await prisma.lease.deleteMany({ where: { id: { in: priorIds } } });
    }

    const start = monthsAgo(4 + i);
    const end = new Date(start.getFullYear() + 1, start.getMonth(), 0);
    // renewal scenario: lease ends soon (offer due); notice: move-out scheduled.
    const leaseData = {
      status: t.scn === 'notice' ? 'NOTICE_GIVEN' : 'ACTIVE',
      unitId: unit.id, tenantId: tenant.id,
      startDate: start, endDate: t.scn === 'renewal' ? daysFromNow(35) : end,
      rentAmount: rent, depositAmount: money(rent * 1.5), noticePeriodDays: 30,
      autoRenew: t.scn === 'current' && i % 2 === 0, moveInAt: start,
      renewalDueAt: t.scn === 'renewal' ? daysFromNow(20) : null,
      moveOutAt: t.scn === 'notice' ? daysFromNow(25) : null,
      terminationRequestedBy: t.scn === 'notice' ? 'TENANT' : null,
    };
    const lease = await prisma.lease.create({ data: leaseData });
    await prisma.unit.update({ where: { id: unit.id }, data: { status: 'OCCUPIED' } });
    leases.push({ lease, tenant, unit, rent, scn: t.scn });

    // ---- Invoices + payments ----
    await prisma.payment.deleteMany({ where: { leaseId: lease.id } });
    await prisma.invoice.deleteMany({ where: { leaseId: lease.id } });
    // 3 prior months + current.
    for (let m = 3; m >= 0; m--) {
      const due = monthsAgo(m);
      const isCurrent = m === 0;
      let status;
      if (t.scn === 'delinquent') {
        // Missed the last 2 months.
        status = m <= 1 ? 'OVERDUE' : 'PAID';
      } else {
        status = isCurrent ? 'UNPAID' : 'PAID';
      }
      const invoice = await prisma.invoice.create({
        data: {
          description: `Rent — ${due.toLocaleString('en-US', { month: 'long', year: 'numeric' })}`,
          amount: rent, dueDate: due, status, leaseId: lease.id,
        },
      });
      if (status === 'PAID') {
        await prisma.payment.create({
          data: {
            amount: rent, status: 'COMPLETED', userId: tenant.id, leaseId: lease.id,
            invoiceId: invoice.id, paymentDate: new Date(due.getFullYear(), due.getMonth(), 3),
          },
        });
        paidCount++;
      }
    }
  }

  // Mark delinquent units for the operator's at-a-glance view.
  for (const { unit, scn } of leases) {
    if (scn === 'delinquent') await prisma.unit.update({ where: { id: unit.id }, data: { status: 'DELINQUENT' } });
  }

  // ---- Vacant / listed units get rental applications ----
  const vacant = allUnits.filter((au) => !leases.some((l) => l.unit.id === au.unit.id));
  for (const [i, au] of vacant.entries()) {
    await prisma.unit.update({ where: { id: au.unit.id }, data: { status: i === 0 ? 'LISTED' : 'VACANT' } });
  }

  await prisma.rentalApplication.deleteMany({ where: { propertyId: { in: properties.map((p) => p.id) } } });
  const appStages = ['PENDING', 'SCREENING', 'APPROVED', 'REJECTED'];
  const applicants = [
    { f: 'Priya', l: 'Shah', income: 78000, credit: 742, emp: 'Employed' },
    { f: 'Marcus', l: 'Lee', income: 61000, credit: 688, emp: 'Employed' },
    { f: 'Elena', l: 'Ruiz', income: 95000, credit: 780, emp: 'Self-employed' },
    { f: 'Tyler', l: 'Fox', income: 42000, credit: 610, emp: 'Part-time' },
  ];
  let appCount = 0;
  for (let i = 0; i < applicants.length; i++) {
    const target = vacant[i % Math.max(vacant.length, 1)];
    if (!target) break;
    const a = applicants[i];
    await prisma.rentalApplication.create({
      data: {
        propertyId: target.propertyId, unitId: target.unit.id,
        status: appStages[i % appStages.length],
        fullName: `${a.f} ${a.l}`, email: `${a.f.toLowerCase()}.${a.l.toLowerCase()}@applicant.test`,
        phoneNumber: `+1316555030${i + 1}`, income: a.income, employmentStatus: a.emp,
        previousAddress: `${100 + i} Prior St, Wichita, KS`, creditScore: a.credit,
        authorizeCreditCheck: true, authorizeBackgroundCheck: true,
        proofOfIncomeUploaded: true, dlIdUploaded: true,
      },
    });
    appCount++;
  }

  // ---- Maintenance requests: every priority + status, across properties ----
  await prisma.maintenanceRequest.deleteMany({ where: { propertyId: { in: properties.map((p) => p.id) } } });
  const mSpecs = [
    { t: 'Kitchen faucet leaking', d: 'Steady drip under the sink cabinet.', s: 'PENDING', p: 'HIGH' },
    { t: 'Dishwasher won’t drain', d: 'Standing water after every cycle.', s: 'IN_PROGRESS', p: 'MEDIUM' },
    { t: 'No heat in bedroom', d: 'Radiator cold; rest of unit fine.', s: 'PENDING', p: 'EMERGENCY' },
    { t: 'Bathroom GFCI outlet trips', d: 'Resets but trips within a day.', s: 'IN_PROGRESS', p: 'HIGH' },
    { t: 'Replace HVAC filter', d: 'Routine quarterly filter swap.', s: 'COMPLETED', p: 'LOW' },
    { t: 'Garage door won’t close', d: 'Sensor misaligned; stays open.', s: 'PENDING', p: 'MEDIUM' },
    { t: 'Water heater making noise', d: 'Loud knocking during heating.', s: 'IN_PROGRESS', p: 'LOW' },
    { t: 'Broken window latch', d: 'Living room window won’t lock.', s: 'COMPLETED', p: 'MEDIUM' },
  ];
  for (const [i, m] of mSpecs.entries()) {
    const { lease, tenant, unit } = leases[i % leases.length];
    await prisma.maintenanceRequest.create({
      data: {
        title: m.t, description: m.d, status: m.s, priority: m.p,
        authorId: tenant.id, propertyId: unit.propertyId, unitId: unit.id, leaseId: lease.id,
        completedAt: m.s === 'COMPLETED' ? new Date() : null,
      },
    });
  }

  console.log('✅ Scenario-rich demo dataset seeded.');
  console.log(`   Org:          ${org.name}`);
  console.log(`   Properties:   ${properties.length} (${allUnits.length} units total)`);
  console.log(`   Leases:       ${leases.length} active — incl. delinquent, renewal-due, notice-given`);
  console.log(`   Payments:     ${paidCount} completed + current/overdue invoices`);
  console.log(`   Applications: ${appCount} across pipeline (pending/screening/approved/rejected)`);
  console.log(`   Maintenance:  ${mSpecs.length} across every priority + status`);
  console.log('');
  console.log('   Operator:  manager / Manager123!@#     Owner: owner / Owner123!@#');
  console.log('   Tenants:   jamie (current), liam (delinquent), ava (renewal-due),');
  console.log('              ethan (notice-given), + sofia/noah/mia/lucas — all pw Tenant123!@#');
}

main()
  .catch((e) => { console.error('Seed failed:', e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
