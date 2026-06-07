import { readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const shellPath = resolve(here, '../src/app/read-only-shell.tsx');
const source = await readFile(shellPath, 'utf8');

const requiredMarkers = [
  { label: 'operator navigation landmark', pattern: 'aria-label="Operator navigation"' },
  { label: 'backend token label', pattern: 'htmlFor="operator-token"' },
  { label: 'refresh screen-reader label', pattern: '<span className="sr-only">Refresh</span>' },
  { label: 'workflow section heading link', pattern: 'aria-labelledby="workflow-title"' },
  { label: 'decision queue section heading link', pattern: 'aria-labelledby="decision-queue-title"' },
  { label: 'applications section heading link', pattern: 'aria-labelledby="applications-title"' },
  { label: 'lease signing section heading link', pattern: 'aria-labelledby="lease-signing-title"' },
  { label: 'maintenance section heading link', pattern: 'aria-labelledby="maintenance-dispatch-title"' },
  { label: 'inspection section heading link', pattern: 'aria-labelledby="inspection-estimates-title"' },
  { label: 'renewals section heading link', pattern: 'aria-labelledby="renewals-title"' },
  { label: 'owner statements section heading link', pattern: 'aria-labelledby="owner-statements-title"' },
  { label: 'portfolio section heading link', pattern: 'aria-labelledby="portfolio-title"' },
  { label: 'workflow focus state text', pattern: 'Focused workflow item' },
  { label: 'approval rejection reason label', pattern: 'aria-label="Approval rejection reason"' },
  { label: 'decision action note label', pattern: 'aria-label="Decision action note"' },
  { label: 'application review action label', pattern: 'aria-label="Application review action"' },
  { label: 'denial reason code label', pattern: 'aria-label="Denial reason code"' },
  { label: 'application review note label', pattern: 'aria-label="Review note or denial reason"' },
  { label: 'lease start label', pattern: 'aria-label="Lease start"' },
  { label: 'lease end label', pattern: 'aria-label="Lease end"' },
  { label: 'lease rent label', pattern: 'aria-label="Lease rent amount"' },
  { label: 'lease deposit label', pattern: 'aria-label="Lease deposit amount"' },
  { label: 'maintenance vendor label', pattern: 'aria-label="Maintenance vendor"' },
  { label: 'maintenance note label', pattern: 'aria-label="Maintenance dispatch note"' },
  { label: 'inspection note label', pattern: 'aria-label="Inspection estimate review note"' },
  { label: 'renewal rent label', pattern: 'aria-label="Renewal rent amount"' },
  { label: 'move-out date label', pattern: 'aria-label="Move-out date"' },
  { label: 'renewal note label', pattern: 'aria-label="Renewal note"' },
  { label: 'statement month label', pattern: 'aria-label="Statement month"' },
];

const missing = requiredMarkers.filter(({ pattern }) => !source.includes(pattern));

if (missing.length > 0) {
  throw new Error(
    `Accessibility smoke check failed:\n${missing
      .map(({ label, pattern }) => `- ${label}: ${pattern}`)
      .join('\n')}`,
  );
}

console.log(`Accessibility smoke OK (${requiredMarkers.length} markers)`);
