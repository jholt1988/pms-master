/**
 * Demo Seed Verification Script
 *
 * Verifies the baseline demo data for the Inspection → Estimate flow.
 *
 * Usage: npx ts-node scripts/verify-demo-seed.ts
 */

import { PrismaClient, Role, InspectionStatus, InspectionType } from '@prisma/client';

const prisma = new PrismaClient();

interface CheckResult {
  label: string;
  status: 'pass' | 'fail';
  details?: string;
}

async function runChecks(): Promise<CheckResult[]> {
  const results: CheckResult[] = [];

  const admin = await prisma.user.findFirst({ where: { username: 'admin' } });
  results.push({
    label: 'Admin user exists',
    status: admin ? 'pass' : 'fail',
    details: admin ? undefined : 'Expected username "admin"',
  });

  if (admin) {
    results.push({
      label: 'Admin role is PROPERTY_MANAGER',
      status: admin.role === Role.PROPERTY_MANAGER ? 'pass' : 'fail',
      details: `role=${admin.role}`,
    });
  }

  const tenant = await prisma.user.findFirst({ where: { username: 'tenant' } });
  results.push({
    label: 'Tenant user exists',
    status: tenant ? 'pass' : 'fail',
    details: tenant ? undefined : 'Expected username "tenant"',
  });

  if (tenant) {
    results.push({
      label: 'Tenant role is TENANT',
      status: tenant.role === Role.TENANT ? 'pass' : 'fail',
      details: `role=${tenant.role}`,
    });
  }

  const property = await prisma.property.findFirst({ where: { name: 'Riverside Flats' } });
  results.push({
    label: 'Property Riverside Flats exists',
    status: property ? 'pass' : 'fail',
  });

  const unit = property
    ? await prisma.unit.findFirst({ where: { name: 'Unit 101', propertyId: property.id } })
    : null;
  results.push({
    label: 'Unit 101 exists under Riverside Flats',
    status: unit ? 'pass' : 'fail',
  });

  const lease = unit
    ? await prisma.lease.findFirst({ where: { unitId: unit.id, status: 'ACTIVE' } })
    : null;
  results.push({
    label: 'Active lease exists for Unit 101',
    status: lease ? 'pass' : 'fail',
  });

  const inspection = unit
    ? await prisma.unitInspection.findFirst({
        where: {
          unitId: unit.id,
          status: InspectionStatus.IN_PROGRESS,
          type: InspectionType.ROUTINE,
        },
      })
    : null;

  results.push({
    label: 'Routine inspection (IN_PROGRESS) exists for Unit 101',
    status: inspection ? 'pass' : 'fail',
  });

  return results;
}

async function main() {
  console.log('🔍 Verifying demo seed baseline...\n');
  const results = await runChecks();

  let failures = 0;
  results.forEach((result) => {
    const icon = result.status === 'pass' ? '✅' : '❌';
    console.log(`${icon} ${result.label}${result.details ? ` — ${result.details}` : ''}`);
    if (result.status === 'fail') failures += 1;
  });

  console.log('\n' + '='.repeat(50));
  console.log(`Failures: ${failures}`);
  console.log('='.repeat(50));

  if (failures > 0) {
    console.log('\n❌ Demo seed verification failed.');
    process.exit(1);
  }

  console.log('\n✅ Demo seed verification passed.');
}

main()
  .catch((error) => {
    console.error('❌ Verification error:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
