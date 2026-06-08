const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const runbookPath = resolve(__dirname, '../docs/phase-5-backup-restore-drill.md');
const source = readFileSync(runbookPath, 'utf8');

const requiredMarkers = [
  '## Production Gate',
  '## Safety Rules',
  '## Required Inputs',
  '## Option A: Managed Production Snapshot Drill',
  '## Option B: Local Compose Logical Backup Drill',
  'pg_dump',
  'pg_restore',
  'DRILL_DATABASE_URL',
  '_prisma_migrations',
  'organizations from \\"Organization\\"',
  'users from \\"User\\"',
  'properties from \\"Property\\"',
  'units from \\"Unit\\"',
  'leases from \\"Lease\\"',
  'audit_logs from \\"AuditLog\\"',
  '## Backend Restore Smoke',
  '## RTO And RPO Calculation',
  '## Cleanup',
  '## Evidence Template',
];

const missing = requiredMarkers.filter((marker) => !source.includes(marker));

if (missing.length > 0) {
  throw new Error(`Backup/restore runbook check failed:\n${missing.map((marker) => `- ${marker}`).join('\n')}`);
}

console.log(`Backup/restore runbook OK (${requiredMarkers.length} markers)`);
