import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting to seed real-world event simulations...');

  // 1. Get a target user, property, and lease
  const user = await prisma.user.findFirst({
    where: { role: 'TENANT' },
  });

  const property = await prisma.property.findFirst();

  if (!user || !property) {
    console.warn('⚠️ Need at least one tenant user and one property to seed events. Run standard seeds first.');
    return;
  }

  const lease = await prisma.lease.findFirst({
    where: { tenantId: user.id },
  });

  // 2. Create Anomaly Logs (for Copilot ambient signals)
  console.log('Generating AnomalyLogs...');
  await prisma.anomalyLog.createMany({
    data: [
      {
        type: 'MAINTENANCE',
        severity: 'CRITICAL',
        description: 'Multiple identical HVAC failures reported across 3 units within 24 hours.',
        metrics: { failureCount: 3, timeWindowHours: 24 },
        recommendedActions: { actions: ['Dispatch emergency HVAC tech', 'Check property electrical supply'] },
        status: 'DETECTED',
      },
      {
        type: 'PAYMENT',
        severity: 'HIGH',
        description: 'Unusually high rate of ACH payment failures detected for the current billing cycle.',
        metrics: { failureRate: 0.15, baselineRate: 0.02 },
        recommendedActions: { actions: ['Review payment gateway logs', 'Send automated payment update reminder to affected tenants'] },
        status: 'INVESTIGATING',
      },
      {
        type: 'PERFORMANCE',
        severity: 'MEDIUM',
        description: 'Lease execution time has increased by 40% compared to previous month.',
        metrics: { currentAvgDays: 5.2, previousAvgDays: 3.7 },
        recommendedActions: { actions: ['Review new background check provider API latency', 'Audit recent application workflow changes'] },
        status: 'DETECTED',
      },
      {
        type: 'DATABASE',
        severity: 'LOW',
        description: 'Minor synchronization delay observed with external syndication channels.',
        metrics: { delayMinutes: 12 },
        recommendedActions: { actions: ['Monitor queue depth', 'Review rate limits'] },
        status: 'RESOLVED',
      }
    ],
  });

  // 3. Create high priority maintenance requests
  console.log('Generating Maintenance Requests...');
  if (property && lease) {
    await prisma.maintenanceRequest.create({
      data: {
        title: 'Major Water Leak in Master Bathroom',
        description: 'Pipe burst under the sink, water is rapidly spreading to the bedroom.',
        priority: 'EMERGENCY',
        status: 'PENDING',
        authorId: user.id,
        propertyId: property.id,
        unitId: lease.unitId,
        leaseId: lease.id,
      },
    });

    await prisma.maintenanceRequest.create({
      data: {
        title: 'AC Unit making loud grinding noise',
        description: 'The AC unit is very loud and smells like burning plastic.',
        priority: 'HIGH',
        status: 'IN_PROGRESS',
        authorId: user.id,
        propertyId: property.id,
        unitId: lease.unitId,
        leaseId: lease.id,
      },
    });
  }

  // 4. Create Schedule Events
  console.log('Generating Schedule Events...');
  await prisma.scheduleEvent.createMany({
    data: [
      {
        type: 'MAINTENANCE',
        priority: 'URGENT',
        title: 'Emergency Plumbing Repair',
        description: 'Vendor arriving to fix major leak',
        date: new Date(Date.now() + 1000 * 60 * 60 * 2), // 2 hours from now
        status: 'SCHEDULED',
        propertyId: property.id,
        tenantId: user.id,
      },
      {
        type: 'INSPECTION',
        priority: 'HIGH',
        title: 'Post-Storm Roof Inspection',
        description: 'Assessing potential hail damage from last night',
        date: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day from now
        status: 'SCHEDULED',
        propertyId: property.id,
      },
      {
        type: 'LEASE_RENEWAL',
        priority: 'MEDIUM',
        title: 'Lease Renewal Discussion',
        description: 'Meeting with tenant to discuss renewal terms',
        date: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3), // 3 days from now
        status: 'SCHEDULED',
        propertyId: property.id,
        tenantId: user.id,
      }
    ]
  });

  // 5. Create Overdue Invoice & Failed Payment Attempt
  console.log('Generating Failed Payments...');
  if (lease) {
    const invoice = await prisma.invoice.create({
      data: {
        description: 'Monthly Rent - Overdue',
        amount: 1500.00,
        dueDate: new Date(Date.now() - 1000 * 60 * 60 * 24 * 5), // 5 days ago
        status: 'OVERDUE',
        leaseId: lease.id,
      }
    });

    await prisma.payment.create({
      data: {
        amount: 1500.00,
        status: 'FAILED',
        invoiceId: invoice.id,
        userId: user.id,
        leaseId: lease.id,
      }
    });
  }

  console.log('✅ Real-world event simulations seeded successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding event simulations:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
