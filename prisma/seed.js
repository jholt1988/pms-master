const { PrismaClient } = require('@prisma/client');
const crypto = require('crypto');

const prisma = new PrismaClient();

// Helper to generate a random hash
function generateHash() {
  return crypto.randomBytes(32).toString('hex');
}

// Helper to generate random number in range
function randomRange(min, max) {
  return Math.random() * (max - min) + min;
}

// Helper to pick random item from array
function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function main() {
  console.log('Starting to seed mock database data (JS format)...');

  // 1. Clean existing data
  console.log('Cleaning up existing database records...');
  await prisma.secondaryDamageOutcome.deleteMany({});
  await prisma.auditEvent.deleteMany({});
  await prisma.actionIntent.deleteMany({});
  await prisma.crossRiskTenantEdgeOverlay.deleteMany({});
  await prisma.packActivation.deleteMany({});
  await prisma.pack.deleteMany({});
  await prisma.tenant.deleteMany({});

  // 2. Create Tenants
  console.log('Creating Tenants...');
  const tenantData = [
    { name: 'Global Properties Group' },
    { name: 'Apex Residential' },
    { name: 'Beacon Property Trust' },
  ];

  const tenants = [];
  for (const data of tenantData) {
    const tenant = await prisma.tenant.create({ data });
    tenants.push(tenant);
    console.log(`Created Tenant: ${tenant.name} (${tenant.id})`);
  }

  // 3. Create Packs (Global and Tenant-Specific)
  console.log('Creating Packs...');
  const packs = [];

  // Create some global packs (no tenantId)
  const globalKinds = [
    'GLOBAL_COUPLING_CEILINGS',
    'CROSS_RISK_GLOBAL',
    'SECONDARY_DAMAGE_GLOBAL',
    'WORKFLOW_POLICY_GLOBAL',
  ];

  for (const kind of globalKinds) {
    const pack = await prisma.pack.create({
      data: {
        kind,
        version: '1.0.0',
        hash: generateHash(),
        status: 'ACTIVE',
        payloadJson: {
          description: `Global configuration for ${kind}`,
          parameters: {
            threshold: randomRange(0.1, 0.9),
            enabled: true,
            maxLimit: Math.floor(randomRange(100, 1000)),
          },
        },
      },
    });
    packs.push(pack);
    console.log(`Created Global Pack: ${pack.kind} (Hash: ${pack.hash.substring(0, 8)})`);
  }

  // Create tenant-specific packs
  for (const tenant of tenants) {
    const tenantKinds = [
      'CROSS_RISK_TENANT_EDGE_OVERLAY',
      'SHOCK_VENDOR_LEADTIME',
      'SECONDARY_DAMAGE_TENANT',
      'WORKFLOW_POLICY_TENANT',
    ];

    for (const kind of tenantKinds) {
      const pack = await prisma.pack.create({
        data: {
          tenantId: tenant.id,
          kind,
          version: '1.1.0',
          hash: generateHash(),
          status: 'ACTIVE',
          payloadJson: {
            description: `Tenant-specific configuration for ${kind}`,
            tenantName: tenant.name,
            customSettings: {
              multiplier: randomRange(1.0, 2.5),
              alertEmails: [`alerts@${tenant.name.toLowerCase().replace(/\s+/g, '')}.com`],
            },
          },
        },
      });
      packs.push(pack);
      console.log(`Created Tenant Pack for ${tenant.name}: ${pack.kind} (Hash: ${pack.hash.substring(0, 8)})`);
    }
  }

  // 4. Create Pack Activations
  console.log('Activating Packs...');
  for (const pack of packs) {
    await prisma.packActivation.create({
      data: {
        tenantId: pack.tenantId,
        packId: pack.id,
        boundaryTag: 'v1-release',
        reason: 'Initial system auto-activation on seed deployment',
      },
    });
  }
  console.log(`Created ${packs.length} Pack Activation records.`);

  // 5. Create Cross-Risk Tenant Edge Overlays
  console.log('Creating Cross-Risk Tenant Edge Overlays...');
  const edges = ['M_to_R', 'R_to_M', 'M_to_V', 'R_to_V'];

  for (const tenant of tenants) {
    const tenantPack = packs.find(p => p.tenantId === tenant.id && p.kind === 'CROSS_RISK_TENANT_EDGE_OVERLAY');
    const parentPackHash = tenantPack ? tenantPack.hash : generateHash();

    for (const edge of edges) {
      const overlay = await prisma.crossRiskTenantEdgeOverlay.create({
        data: {
          tenantId: tenant.id,
          edge,
          parentPackHash,
          version: '1.0.0',
          status: 'APPLIED',
          deltaBeta: randomRange(-0.05, 0.15),
          deltaAlpha: randomRange(-0.02, 0.08),
          windowDays: pickRandom([30, 60, 90, 180]),
          decayLambda: randomRange(0.01, 0.05),
          neff: randomRange(10.0, 150.0),
          metricsJson: {
            historicalCount: Math.floor(randomRange(50, 500)),
            rsquared: randomRange(0.65, 0.95),
            confidenceInterval: [randomRange(0.01, 0.05), randomRange(0.05, 0.1)],
          },
        },
      });
      console.log(`Created Edge Overlay for Tenant ${tenant.name}: ${overlay.edge}`);
    }
  }

  // 6. Create Action Intents
  console.log('Creating Action Intents...');
  const riskTypes = ['VANDALISM', 'WATER_DAMAGE', 'EQUIPMENT_FAILURE', 'TENANT_DEFAULT'];
  const recommendedActions = [
    'Install smart leak detection sensors',
    'Schedule preventive maintenance HVAC check',
    'Increase security patrol frequency',
    'Initiate tenant outreach and wellness check',
  ];
  const tiers = ['TIER_1', 'TIER_2', 'TIER_3'];
  const statuses = ['DETECTED', 'QUEUED', 'APPROVED', 'EXECUTED', 'COMPLETED', 'RESOLVED', 'SUPERSEDED'];

  for (const tenant of tenants) {
    const numIntents = Math.floor(randomRange(5, 12));
    for (let i = 0; i < numIntents; i++) {
      const riskType = pickRandom(riskTypes);
      const tier = pickRandom(tiers);
      const status = pickRandom(statuses);
      
      await prisma.actionIntent.create({
        data: {
          tenantId: tenant.id,
          propertyId: `prop_${Math.floor(randomRange(101, 105))}`,
          unitId: `unit_${Math.floor(randomRange(1001, 1050))}`,
          riskType,
          horizonDays: pickRandom([30, 60, 90]),
          percentile: Math.floor(randomRange(80, 99)),
          rawProbability: randomRange(0.05, 0.45),
          expectedLoss90d: randomRange(1500, 25000),
          amplified: Math.random() > 0.7,
          recommendedAction: pickRandom(recommendedActions),
          priorityScore: randomRange(10, 100),
          tier,
          status,
          bundleHash: status === 'EXECUTED' || status === 'COMPLETED' ? generateHash() : null,
          governanceJson: {
            approvedBy: status === 'APPROVED' || status === 'EXECUTED' ? 'admin_user@propertyos.com' : null,
            rationale: `Automated predictive detection triggered with high percentile risk.`,
          },
        },
      });
    }
    console.log(`Created Action Intents for ${tenant.name}`);
  }

  // 7. Create Audit Events
  console.log('Creating Audit Events...');
  const auditTypes = ['PACK_ACTIVATED', 'INTENT_APPROVED', 'OVERLAY_UPDATED', 'TENANT_CREATED'];

  for (const tenant of tenants) {
    const numEvents = Math.floor(randomRange(3, 8));
    for (let i = 0; i < numEvents; i++) {
      const type = pickRandom(auditTypes);
      await prisma.auditEvent.create({
        data: {
          tenantId: tenant.id,
          type,
          payload: {
            actor: 'system_process',
            ipAddress: '127.0.0.1',
            timestamp: new Date().toISOString(),
            details: `Automated log for audit type: ${type}`,
          },
        },
      });
    }
  }
  
  for (let i = 0; i < 3; i++) {
    await prisma.auditEvent.create({
      data: {
        type: 'SYSTEM_STARTUP',
        payload: {
          actor: 'kubernetes_pod_lifecycle',
          version: '1.2.4',
        },
      },
    });
  }
  console.log('Created Audit Events.');

  // 8. Create Secondary Damage Outcomes
  console.log('Creating Secondary Damage Outcomes...');
  const assetGroups = ['RESIDENTIAL_APARTMENT', 'COMMERCIAL_RETAIL', 'INDUSTRIAL_WAREHOUSE'];
  const eventTypes = ['APPLIANCE_LEAK', 'BURST_PIPE', 'ELECTRICAL_FIRE', 'HVAC_OVERFLOW'];
  const vintageBuckets = ['PRE_1970', 'YEAR_1970_1989', 'YEAR_1990_2009', 'YEAR_2010_PLUS', 'UNKNOWN'];
  const classBuckets = ['A', 'B', 'C', 'UNKNOWN'];

  for (const tenant of tenants) {
    const numOutcomes = Math.floor(randomRange(4, 10));
    for (let i = 0; i < numOutcomes; i++) {
      const occurredAt = new Date();
      occurredAt.setDate(occurredAt.getDate() - Math.floor(randomRange(1, 365)));

      await prisma.secondaryDamageOutcome.create({
        data: {
          tenantId: tenant.id,
          propertyId: `prop_${Math.floor(randomRange(101, 105))}`,
          unitId: `unit_${Math.floor(randomRange(1001, 1050))}`,
          assetGroup: pickRandom(assetGroups),
          eventType: pickRandom(eventTypes),
          occurredAt,
          directCostUsd: randomRange(500, 50000),
          downtimeDays: Math.random() > 0.3 ? Math.floor(randomRange(1, 14)) : null,
          vintageBucket: pickRandom(vintageBuckets),
          classBucket: pickRandom(classBuckets),
          bundleHash: generateHash(),
          taxonomyVersion: 'v2.1',
        },
      });
    }
    console.log(`Created Secondary Damage Outcomes for ${tenant.name}`);
  }

  console.log('Database mock data seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding mock data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
