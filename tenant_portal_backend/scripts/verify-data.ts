/**
 * Data Verification Script
 * 
 * Verifies that all seeded data is present and relationships are correct
 * 
 * Usage: npx ts-node scripts/verify-data.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VerificationResult {
  entity: string;
  expected: number;
  actual: number;
  status: 'pass' | 'fail' | 'warning';
  details?: string;
}

async function verifyData() {
  console.log('🔍 Verifying database data...\n');

  const results: VerificationResult[] = [];

  // Verify Users
  const userCount = await prisma.user.count();
  const propertyManagerCount = await prisma.user.count({ where: { role: 'PROPERTY_MANAGER' } });
  const tenantCount = await prisma.user.count({ where: { role: 'TENANT' } });
  
  results.push({
    entity: 'Users (Total)',
    expected: 16,
    actual: userCount,
    status: userCount >= 16 ? 'pass' : 'fail',
  });
  
  results.push({
    entity: 'Property Managers',
    expected: 4,
    actual: propertyManagerCount,
    status: propertyManagerCount >= 4 ? 'pass' : 'warning',
  });
  
  results.push({
    entity: 'Tenants',
    expected: 13,
    actual: tenantCount,
    status: tenantCount >= 13 ? 'pass' : 'warning',
  });

  // Verify Properties
  const propertyCount = await prisma.property.count();
  results.push({
    entity: 'Properties',
    expected: 15,
    actual: propertyCount,
    status: propertyCount >= 15 ? 'pass' : 'fail',
  });

  // Verify Units
  const unitCount = await prisma.unit.count();
  results.push({
    entity: 'Units',
    expected: 26,
    actual: unitCount,
    status: unitCount >= 26 ? 'pass' : 'fail',
  });

  // Verify Leases
  const leaseCount = await prisma.lease.count();
  const activeLeaseCount = await prisma.lease.count({ where: { status: 'ACTIVE' } });
  
  results.push({
    entity: 'Leases (Total)',
    expected: 13,
    actual: leaseCount,
    status: leaseCount >= 13 ? 'pass' : 'warning',
  });
  
  results.push({
    entity: 'Active Leases',
    expected: 13,
    actual: activeLeaseCount,
    status: activeLeaseCount >= 13 ? 'pass' : 'warning',
  });

  // Verify Relationships
  const leasesWithTenants = await prisma.lease.count({
    where: { tenant: { isNot: null } },
  });
  
  const leasesWithUnits = await prisma.lease.count({
    where: { unit: { isNot: null } },
  });

  results.push({
    entity: 'Leases with Tenants',
    expected: leaseCount,
    actual: leasesWithTenants,
    status: leasesWithTenants === leaseCount ? 'pass' : 'fail',
    details: leasesWithTenants !== leaseCount ? 'Some leases missing tenant relationship' : undefined,
  });

  results.push({
    entity: 'Leases with Units',
    expected: leaseCount,
    actual: leasesWithUnits,
    status: leasesWithUnits === leaseCount ? 'pass' : 'fail',
    details: leasesWithUnits !== leaseCount ? 'Some leases missing unit relationship' : undefined,
  });

  // Verify Units are linked to Properties
  const unitsWithProperties = await prisma.unit.count({
    where: { property: { isNot: null } },
  });

  results.push({
    entity: 'Units with Properties',
    expected: unitCount,
    actual: unitsWithProperties,
    status: unitsWithProperties === unitCount ? 'pass' : 'fail',
    details: unitsWithProperties !== unitCount ? 'Some units missing property relationship' : undefined,
  });

  // Verify Maintenance Requests
  const maintenanceRequestCount = await prisma.maintenanceRequest.count();
  results.push({
    entity: 'Maintenance Requests',
    expected: 3,
    actual: maintenanceRequestCount,
    status: maintenanceRequestCount >= 3 ? 'pass' : 'warning',
  });

  // Verify Invoices
  const invoiceCount = await prisma.invoice.count();
  results.push({
    entity: 'Invoices',
    expected: 5,
    actual: invoiceCount,
    status: invoiceCount >= 5 ? 'pass' : 'warning',
  });

  // Verify Payments
  const paymentCount = await prisma.payment.count();
  results.push({
    entity: 'Payments',
    expected: 2,
    actual: paymentCount,
    status: paymentCount >= 2 ? 'pass' : 'warning',
  });

  // Verify Expenses
  const expenseCount = await prisma.expense.count();
  results.push({
    entity: 'Expenses',
    expected: 3,
    actual: expenseCount,
    status: expenseCount >= 3 ? 'pass' : 'warning',
  });

  // Verify Recurring Schedules
  const scheduleCount = await prisma.recurringInvoiceSchedule.count();
  results.push({
    entity: 'Recurring Invoice Schedules',
    expected: 13,
    actual: scheduleCount,
    status: scheduleCount >= 13 ? 'pass' : 'warning',
  });

  // Print Results
  console.log('📊 Verification Results:\n');
  
  let passCount = 0;
  let failCount = 0;
  let warningCount = 0;

  results.forEach((result) => {
    const icon = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⚠️';
    const color = result.status === 'pass' ? '\x1b[32m' : result.status === 'fail' ? '\x1b[31m' : '\x1b[33m';
    const reset = '\x1b[0m';
    
    console.log(`${icon} ${result.entity}: ${color}${result.actual}${reset} (expected: ${result.expected})`);
    if (result.details) {
      console.log(`   ${result.details}`);
    }

    if (result.status === 'pass') passCount++;
    else if (result.status === 'fail') failCount++;
    else warningCount++;
  });

  console.log('\n' + '='.repeat(50));
  console.log(`✅ Passed: ${passCount}`);
  console.log(`⚠️  Warnings: ${warningCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('='.repeat(50));

  if (failCount === 0) {
    console.log('\n✅ All critical verifications passed!');
    return 0;
  } else {
    console.log('\n❌ Some verifications failed. Please check the results above.');
    return 1;
  }
}

verifyData()
  .then((exitCode) => {
    process.exit(exitCode);
  })
  .catch((error) => {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

