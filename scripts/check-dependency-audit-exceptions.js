const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

const registryPath = resolve(__dirname, '../docs/security/dependency-audit-exceptions.json');
const registry = JSON.parse(readFileSync(registryPath, 'utf8'));

const today = new Date(`${process.env.DEPENDENCY_AUDIT_DATE || new Date().toISOString().slice(0, 10)}T00:00:00.000Z`);
const requiredTopLevel = ['updatedOn', 'exceptions'];
const requiredExceptionFields = [
  'id',
  'status',
  'severity',
  'packageName',
  'advisoryIds',
  'affectedWorkspaces',
  'dependencyType',
  'owner',
  'rationale',
  'mitigation',
  'expiresOn',
  'reviewedOn',
];
const statuses = new Set(['accepted', 'mitigating', 'remediated']);
const severities = new Set(['low', 'moderate', 'high', 'critical']);
const dependencyTypes = new Set(['runtime', 'dev', 'transitive']);
const errors = [];
const seenIds = new Set();

for (const field of requiredTopLevel) {
  if (!(field in registry)) {
    errors.push(`missing top-level field: ${field}`);
  }
}

if (!isIsoDate(registry.updatedOn)) {
  errors.push('updatedOn must be an ISO date');
}

if (!Array.isArray(registry.exceptions)) {
  errors.push('exceptions must be an array');
} else {
  registry.exceptions.forEach((entry, index) => validateException(entry, index));
}

if (errors.length > 0) {
  throw new Error(`Dependency audit exception check failed:\n${errors.map((error) => `- ${error}`).join('\n')}`);
}

console.log(`Dependency audit exception registry OK (${registry.exceptions.length} exceptions)`);

function validateException(entry, index) {
  const label = entry?.id || `exceptions[${index}]`;
  for (const field of requiredExceptionFields) {
    if (!(field in entry)) {
      errors.push(`${label}: missing ${field}`);
    }
  }

  if (typeof entry.id !== 'string' || !/^DEP-\d{4}-\d{3}$/.test(entry.id)) {
    errors.push(`${label}: id must match DEP-YYYY-NNN`);
  } else if (seenIds.has(entry.id)) {
    errors.push(`${label}: duplicate id`);
  } else {
    seenIds.add(entry.id);
  }

  if (!statuses.has(entry.status)) {
    errors.push(`${label}: invalid status`);
  }
  if (!severities.has(entry.severity)) {
    errors.push(`${label}: invalid severity`);
  }
  if (!dependencyTypes.has(entry.dependencyType)) {
    errors.push(`${label}: invalid dependencyType`);
  }

  for (const arrayField of ['advisoryIds', 'affectedWorkspaces']) {
    if (!Array.isArray(entry[arrayField]) || entry[arrayField].length === 0) {
      errors.push(`${label}: ${arrayField} must be a non-empty array`);
    }
  }

  for (const textField of ['packageName', 'owner']) {
    if (typeof entry[textField] !== 'string' || entry[textField].trim().length === 0) {
      errors.push(`${label}: ${textField} is required`);
    }
  }

  for (const textField of ['rationale', 'mitigation']) {
    if (typeof entry[textField] !== 'string' || entry[textField].trim().length < 12) {
      errors.push(`${label}: ${textField} must explain the accepted risk`);
    }
  }

  if (!isIsoDate(entry.expiresOn)) {
    errors.push(`${label}: expiresOn must be an ISO date`);
  }
  if (!isIsoDate(entry.reviewedOn)) {
    errors.push(`${label}: reviewedOn must be an ISO date`);
  }

  if (isIsoDate(entry.expiresOn) && entry.status !== 'remediated') {
    const expiresOn = new Date(`${entry.expiresOn}T00:00:00.000Z`);
    if (expiresOn < today) {
      errors.push(`${label}: exception expired on ${entry.expiresOn}`);
    }

    const maxDays = entry.severity === 'critical' ? 14 : entry.severity === 'high' ? 30 : null;
    if (maxDays !== null) {
      const reviewedOn = isIsoDate(entry.reviewedOn) ? new Date(`${entry.reviewedOn}T00:00:00.000Z`) : today;
      const daysOpen = Math.ceil((expiresOn.getTime() - reviewedOn.getTime()) / 86_400_000);
      if (daysOpen > maxDays) {
        errors.push(`${label}: ${entry.severity} exceptions must expire within ${maxDays} days of review`);
      }
    }
  }
}

function isIsoDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00.000Z`).getTime());
}
