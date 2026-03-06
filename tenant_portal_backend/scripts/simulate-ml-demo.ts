#!/usr/bin/env ts-node

import { execSync } from 'node:child_process';

type Step = {
  name: string;
  command: string;
  optional?: boolean;
};

const args = new Set(process.argv.slice(2));
const dryRun = args.has('--dry-run');
const skipInspectionSeed = args.has('--skip-inspection-seed');
const skipReadiness = args.has('--skip-readiness');

const steps: Step[] = [
  {
    name: 'Seed robust inspection demo dataset (MIL-oriented examples)',
    command: 'npm run seed:inspection-demo:robust',
    optional: false,
  },
  {
    name: 'Run ML readiness audit (JSON)',
    command: 'npm run ml:readiness:json',
    optional: false,
  },
  {
    name: 'Write ML readiness markdown snapshot',
    command: 'npm run ml:readiness:md',
    optional: false,
  },
];

function logHeader() {
  console.log('\n=== PMS ML DEMO SIMULATION RUNNER ===');
  console.log('This script prepares demo-friendly seeded data and readiness outputs.');
  console.log('Use it to demonstrate:');
  console.log('- Inspection ML/MIL readiness patterns');
  console.log('- Maintenance survival-model readiness posture');
  console.log('- Payment NBA data readiness posture');
  console.log('======================================\n');
}

function printPersonas() {
  console.log('\nSuggested demo personas to narrate while reviewing output:');
  console.log('1) On-time tenant: mostly successful payments, low reminder pressure');
  console.log('2) Late-paying tenant: retry failures + overdue events, stronger reminder strategy need');
  console.log('3) Aging unit risk: more frequent maintenance + slower completion windows');
  console.log('4) High-variance inspections: mixed photo quality/conditions tied to cost outcomes\n');
}

function runStep(step: Step) {
  console.log(`\n▶ ${step.name}`);
  console.log(`$ ${step.command}`);

  if (dryRun) {
    console.log('  (dry-run: not executed)');
    return;
  }

  try {
    execSync(step.command, {
      stdio: 'inherit',
      env: process.env,
    });
    console.log(`✔ ${step.name} complete`);
  } catch (error) {
    console.error(`✖ ${step.name} failed`);
    if (!step.optional) {
      process.exit(1);
    }
  }
}

function main() {
  logHeader();

  const filtered = steps.filter((s) => {
    if (skipInspectionSeed && s.command.includes('seed:inspection-demo:robust')) return false;
    if (skipReadiness && s.command.includes('ml:readiness')) return false;
    return true;
  });

  if (filtered.length === 0) {
    console.log('No steps selected. Pass without skip flags or use --dry-run to preview.');
    process.exit(0);
  }

  for (const step of filtered) {
    runStep(step);
  }

  printPersonas();
  console.log('Done. Review outputs under tenant_portal_backend/reports/.\n');
  console.log('Key files:');
  console.log('- reports/ml-data-readiness-latest.md');
  console.log('- reports/P0_1_stripe_pay_now.md');
  console.log('- reports/P0_2_maintenance_instant_list.md');
  console.log('- reports/P0_3_maintenance_photo_upload.md\n');
}

main();
