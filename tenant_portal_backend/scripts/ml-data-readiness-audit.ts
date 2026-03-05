import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

type ScalarRow = { count: number };

type CoverageMetric = {
  name: string;
  numerator: number;
  denominator: number;
  percent: number;
};

type TrackReport = {
  track: 'inspection_mil' | 'maintenance_survival' | 'payment_nba';
  title: string;
  population: number;
  metrics: CoverageMetric[];
  sampleHints: string[];
  score: number;
};

type AuditReport = {
  generatedAt: string;
  tracks: TrackReport[];
  overallScore: number;
};

function argValue(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag);
}

async function count(sql: string): Promise<number> {
  const rows = await prisma.$queryRawUnsafe<ScalarRow[]>(sql);
  return rows[0]?.count ?? 0;
}

function metric(name: string, numerator: number, denominator: number): CoverageMetric {
  return {
    name,
    numerator,
    denominator,
    percent: denominator > 0 ? numerator / denominator : 0,
  };
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

function renderMarkdown(report: AuditReport): string {
  const lines: string[] = [];
  lines.push('# Tenant Portal Backend ML Data-Readiness Audit');
  lines.push('');
  lines.push(`Generated at: **${report.generatedAt}**`);
  lines.push(`Overall readiness score: **${pct(report.overallScore)}**`);
  lines.push('');

  for (const track of report.tracks) {
    lines.push(`## ${track.title}`);
    lines.push('');
    lines.push(`Population size: **${track.population}**`);
    lines.push(`Track score: **${pct(track.score)}**`);
    lines.push('');
    lines.push('| Metric | Coverage | Raw |');
    lines.push('|---|---:|---:|');
    for (const m of track.metrics) {
      lines.push(`| ${m.name} | ${pct(m.percent)} | ${m.numerator}/${m.denominator} |`);
    }
    lines.push('');
    lines.push('Sample-size hints:');
    for (const hint of track.sampleHints) {
      lines.push(`- ${hint}`);
    }
    lines.push('');
  }

  lines.push('## Notes');
  lines.push('- This script is read-only and does not mutate database state.');
  lines.push('- Coverage is schema-driven and intended for data readiness checks before model training.');
  lines.push('');
  return lines.join('\n');
}

async function buildInspectionMilReport(): Promise<TrackReport> {
  const population = await count(`SELECT COUNT(*)::int AS count FROM "UnitInspection"`);
  const completed = await count(`SELECT COUNT(*)::int AS count FROM "UnitInspection" WHERE status = 'COMPLETED'`);

  const completedWithLease = await count(`
    SELECT COUNT(*)::int AS count
    FROM "UnitInspection"
    WHERE status = 'COMPLETED' AND "leaseId" IS NOT NULL
  `);

  const completedWithCompletedDate = await count(`
    SELECT COUNT(*)::int AS count
    FROM "UnitInspection"
    WHERE status = 'COMPLETED' AND "completedDate" IS NOT NULL
  `);

  const completedWithRooms = await count(`
    SELECT COUNT(*)::int AS count
    FROM "UnitInspection" ui
    WHERE ui.status = 'COMPLETED'
      AND EXISTS (
        SELECT 1 FROM "InspectionRoom" r
        WHERE r."inspectionId" = ui.id
      )
  `);

  const completedWithChecklistItems = await count(`
    SELECT COUNT(*)::int AS count
    FROM "UnitInspection" ui
    WHERE ui.status = 'COMPLETED'
      AND EXISTS (
        SELECT 1
        FROM "InspectionRoom" r
        JOIN "InspectionChecklistItem" i ON i."roomId" = r.id
        WHERE r."inspectionId" = ui.id
      )
  `);

  const checklistItemsTotal = await count(`SELECT COUNT(*)::int AS count FROM "InspectionChecklistItem"`);
  const checklistItemsWithCondition = await count(`
    SELECT COUNT(*)::int AS count
    FROM "InspectionChecklistItem"
    WHERE condition IS NOT NULL
  `);

  const checklistItemsWithPhotos = await count(`
    SELECT COUNT(DISTINCT i.id)::int AS count
    FROM "InspectionChecklistItem" i
    JOIN "InspectionChecklistPhoto" p ON p."checklistItemId" = i.id
  `);

  const completedWithSignatures = await count(`
    SELECT COUNT(*)::int AS count
    FROM "UnitInspection" ui
    WHERE ui.status = 'COMPLETED'
      AND EXISTS (
        SELECT 1 FROM "InspectionSignature" s
        WHERE s."inspectionId" = ui.id
      )
  `);

  const metrics = [
    metric('Completed inspections', completed, population),
    metric('Completed inspections linked to lease', completedWithLease, completed),
    metric('Completed inspections with completedDate', completedWithCompletedDate, completed),
    metric('Completed inspections with >=1 room', completedWithRooms, completed),
    metric('Completed inspections with >=1 checklist item', completedWithChecklistItems, completed),
    metric('Checklist items with condition label', checklistItemsWithCondition, checklistItemsTotal),
    metric('Checklist items with photo evidence', checklistItemsWithPhotos, checklistItemsTotal),
    metric('Completed inspections with signatures', completedWithSignatures, completed),
  ];

  return {
    track: 'inspection_mil',
    title: 'Inspection MIL coverage',
    population,
    metrics,
    sampleHints: [
      `Completed inspections: ${completed} (target 100+ for stable baseline models)`,
      `Checklist items: ${checklistItemsTotal} (target 2,000+ for condition calibration)`,
    ],
    score: average(metrics.map((m) => m.percent)),
  };
}

async function buildMaintenanceSurvivalReport(): Promise<TrackReport> {
  const population = await count(`SELECT COUNT(*)::int AS count FROM "MaintenanceRequest"`);

  const withPriority = await count(`
    SELECT COUNT(*)::int AS count
    FROM "MaintenanceRequest"
    WHERE priority IS NOT NULL
  `);

  const withCreatedAt = await count(`
    SELECT COUNT(*)::int AS count
    FROM "MaintenanceRequest"
    WHERE "createdAt" IS NOT NULL
  `);

  const closedWithCompletedAt = await count(`
    SELECT COUNT(*)::int AS count
    FROM "MaintenanceRequest"
    WHERE status = 'COMPLETED'
      AND "completedAt" IS NOT NULL
  `);

  const closedPopulation = await count(`
    SELECT COUNT(*)::int AS count
    FROM "MaintenanceRequest"
    WHERE status = 'COMPLETED'
  `);

  const withAsset = await count(`
    SELECT COUNT(*)::int AS count
    FROM "MaintenanceRequest"
    WHERE "assetId" IS NOT NULL
  `);

  const withSlaPolicy = await count(`
    SELECT COUNT(*)::int AS count
    FROM "MaintenanceRequest"
    WHERE "slaPolicyId" IS NOT NULL
  `);

  const withHistory = await count(`
    SELECT COUNT(DISTINCT mr.id)::int AS count
    FROM "MaintenanceRequest" mr
    JOIN "MaintenanceRequestHistory" h ON h."requestId" = mr.id
  `);

  const withPhoto = await count(`
    SELECT COUNT(DISTINCT mr.id)::int AS count
    FROM "MaintenanceRequest" mr
    JOIN "MaintenancePhoto" p ON p."requestId" = mr.id
  `);

  const assetsTotal = await count(`SELECT COUNT(*)::int AS count FROM "MaintenanceAsset"`);
  const assetsWithInstallDate = await count(`
    SELECT COUNT(*)::int AS count
    FROM "MaintenanceAsset"
    WHERE "installDate" IS NOT NULL
  `);

  const metrics = [
    metric('Requests with priority', withPriority, population),
    metric('Requests with createdAt timestamp', withCreatedAt, population),
    metric('Closed requests with completedAt timestamp', closedWithCompletedAt, closedPopulation),
    metric('Requests linked to asset', withAsset, population),
    metric('Requests with SLA policy', withSlaPolicy, population),
    metric('Requests with state-change history', withHistory, population),
    metric('Requests with photo evidence', withPhoto, population),
    metric('Assets with installDate', assetsWithInstallDate, assetsTotal),
  ];

  return {
    track: 'maintenance_survival',
    title: 'Maintenance survival coverage',
    population,
    metrics,
    sampleHints: [
      `Maintenance requests: ${population} (target 500+ for initial survival models)`,
      `Assets: ${assetsTotal} (target 200+ with installDate for asset-age features)`,
    ],
    score: average(metrics.map((m) => m.percent)),
  };
}

async function buildPaymentNbaReport(): Promise<TrackReport> {
  const invoicePopulation = await count(`SELECT COUNT(*)::int AS count FROM "Invoice"`);
  const paymentPopulation = await count(`SELECT COUNT(*)::int AS count FROM "Payment"`);
  const attemptPopulation = await count(`SELECT COUNT(*)::int AS count FROM "PaymentAttempt"`);

  const invoicesWithDueDate = await count(`SELECT COUNT(*)::int AS count FROM "Invoice" WHERE "dueDate" IS NOT NULL`);
  const invoicesWithLease = await count(`SELECT COUNT(*)::int AS count FROM "Invoice" WHERE "leaseId" IS NOT NULL`);
  const invoicesWithStatus = await count(`SELECT COUNT(*)::int AS count FROM "Invoice" WHERE status IS NOT NULL`);

  const paymentsWithStatus = await count(`SELECT COUNT(*)::int AS count FROM "Payment" WHERE status IS NOT NULL`);
  const paymentsWithMethod = await count(`SELECT COUNT(*)::int AS count FROM "Payment" WHERE "paymentMethodId" IS NOT NULL`);
  const paymentsLinkedToInvoice = await count(`SELECT COUNT(*)::int AS count FROM "Payment" WHERE "invoiceId" IS NOT NULL`);

  const attemptsWithOutcomeTime = await count(`
    SELECT COUNT(*)::int AS count
    FROM "PaymentAttempt"
    WHERE status IN ('SUCCEEDED', 'FAILED', 'NEEDS_AUTH')
      AND "attemptedAt" IS NOT NULL
  `);

  const overdueInvoices = await count(`
    SELECT COUNT(*)::int AS count
    FROM "Invoice"
    WHERE status = 'OVERDUE'
       OR (status = 'UNPAID' AND "dueDate" < NOW())
  `);

  const invoicesWithAttempts = await count(`
    SELECT COUNT(DISTINCT i.id)::int AS count
    FROM "Invoice" i
    JOIN "PaymentAttempt" pa ON pa."invoiceId" = i.id
  `);

  const metrics = [
    metric('Invoices with dueDate', invoicesWithDueDate, invoicePopulation),
    metric('Invoices linked to lease', invoicesWithLease, invoicePopulation),
    metric('Invoices with status', invoicesWithStatus, invoicePopulation),
    metric('Payments with status', paymentsWithStatus, paymentPopulation),
    metric('Payments linked to invoice', paymentsLinkedToInvoice, paymentPopulation),
    metric('Payments with payment method', paymentsWithMethod, paymentPopulation),
    metric('Invoices with payment attempt records', invoicesWithAttempts, invoicePopulation),
    metric('Attempts with terminal status timestamp', attemptsWithOutcomeTime, attemptPopulation),
  ];

  return {
    track: 'payment_nba',
    title: 'Payment NBA coverage',
    population: invoicePopulation,
    metrics,
    sampleHints: [
      `Invoices: ${invoicePopulation}, Payments: ${paymentPopulation}, Attempts: ${attemptPopulation}`,
      `Currently overdue invoices: ${overdueInvoices} (ensure enough positives for action-policy learning)`,
    ],
    score: average(metrics.map((m) => m.percent)),
  };
}

async function main() {
  if (hasFlag('--help') || hasFlag('-h')) {
    console.log(`Usage:\n  ts-node scripts/ml-data-readiness-audit.ts [--json] [--out <markdown-file>]\n\nExamples:\n  ts-node scripts/ml-data-readiness-audit.ts\n  ts-node scripts/ml-data-readiness-audit.ts --json\n  ts-node scripts/ml-data-readiness-audit.ts --out reports/ml-data-readiness-latest.md`);
    return;
  }

  const tracks = await Promise.all([
    buildInspectionMilReport(),
    buildMaintenanceSurvivalReport(),
    buildPaymentNbaReport(),
  ]);

  const report: AuditReport = {
    generatedAt: new Date().toISOString(),
    tracks,
    overallScore: average(tracks.map((t) => t.score)),
  };

  if (hasFlag('--json')) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(`\nML Data-Readiness Audit (${report.generatedAt})`);
    console.log(`Overall score: ${pct(report.overallScore)}\n`);
    for (const track of report.tracks) {
      console.log(`${track.title}: ${pct(track.score)} (population ${track.population})`);
      for (const m of track.metrics) {
        console.log(`  - ${m.name}: ${pct(m.percent)} (${m.numerator}/${m.denominator})`);
      }
      console.log('');
    }
  }

  const outPathArg = argValue('--out');
  if (outPathArg) {
    const outputPath = path.isAbsolute(outPathArg)
      ? outPathArg
      : path.resolve(process.cwd(), outPathArg);

    const outputDir = path.dirname(outputPath);
    fs.mkdirSync(outputDir, { recursive: true });
    fs.writeFileSync(outputPath, renderMarkdown(report), 'utf8');
    console.log(`Markdown report written to: ${outputPath}`);
  }
}

main()
  .catch((error) => {
    console.error('ML data-readiness audit failed:', error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
