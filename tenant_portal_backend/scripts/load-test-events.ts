import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Starting Event Blast Load Test...');

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

  const NUM_EVENTS = 500;
  console.log(`Blasting ${NUM_EVENTS} FeedItem decisions and AnomalyLogs into the system...`);

  // We will batch insert using Prisma createMany for anomalies
  const anomalyData = [];
  const feedItems = [];

  for (let i = 0; i < NUM_EVENTS; i++) {
    const isCritical = i % 10 === 0;
    const severity = isCritical ? 'CRITICAL' : i % 5 === 0 ? 'HIGH' : 'MEDIUM';
    
    // Add anomalies
    anomalyData.push({
      type: 'SYSTEM_STRESS',
      severity,
      description: `Simulated anomaly #${i} during load test.`,
      metrics: { index: i, cpu: 99 },
      recommendedActions: { actions: ['Acknowledge'] },
      status: 'DETECTED',
    });

    // Add feed items
    const priorityScore = isCritical ? 95 + Math.random() * 5 : 50 + Math.random() * 30;
    const urgency = priorityScore > 80 ? 'immediate' : 'today';
    
    feedItems.push({
      id: `load-test-feed-${Date.now()}-${i}`,
      domain: i % 2 === 0 ? 'payments' : 'maintenance',
      type: 'load_test_event',
      title: `Load Test Event #${i}`,
      summary: `This is a high-volume generated event for stress testing. Event ID: ${i}`,
      priorityScore,
      evidence: { urgency, score: priorityScore },
      roleAccess: ['PROPERTY_MANAGER', 'ADMIN'],
      isDismissed: false,
      actions: [
        {
          type: 'mutation',
          label: 'Acknowledge',
          intent: 'dismiss_manually',
          endpoint: `/feed/load-test-feed-${Date.now()}-${i}/dismiss`,
          method: 'PATCH',
          variant: 'secondary'
        }
      ]
    });
  }

  await prisma.anomalyLog.createMany({
    data: anomalyData,
  });
  console.log(`✅ Blasted ${NUM_EVENTS} AnomalyLogs.`);

  // FeedItem uses a JSON field for actions/evidence, createMany handles it fine
  // but Prisma might complain about untyped arrays if we aren't careful, let's chunk it.
  
  const chunkSize = 100;
  for (let i = 0; i < feedItems.length; i += chunkSize) {
    const chunk = feedItems.slice(i, i + chunkSize);
    await prisma.feedItem.createMany({
      data: chunk,
      skipDuplicates: true,
    });
  }

  console.log(`✅ Blasted ${NUM_EVENTS} FeedItems.`);

  console.log('🎉 Load Test Event Blasting Complete!');
}

main()
  .catch((e) => {
    console.error('Error blasting events:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
