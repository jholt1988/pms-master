const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const openApiPath = path.join(repoRoot, 'docs', 'api', 'openapi.json');
const routeOwnershipPath = path.join(repoRoot, 'docs', 'api-route-ownership.md');

const httpMethods = new Set(['get', 'post', 'put', 'patch', 'delete', 'options', 'head']);
const migratedEnvelopePrefixes = [
  '/api/command-center',
  '/api/decisions',
  '/api/foundation',
  '/api/ai-gateway',
  '/api/operator-',
];
// Routes intentionally NOT under the global /api prefix.
// - /webhooks, /metrics: external services / scrapers.
// - /leasing, /esignature: deliberate unprefixed dual-mounts for external
//   integrations (they are in the backend's GLOBAL_PREFIX_EXCLUDE list; see
//   tenant_portal_backend/src/config/global-prefix.ts and ADR-005).
const externalPrefixes = ['/webhooks/', '/metrics', '/leasing', '/esignature'];
// The root controller serves the bare prefix (`/api`) for its landing/health
// routes; allow the exact `/api` path in addition to everything under `/api/`.
const allowedBarePaths = new Set(['/api']);
const protectedPrefixes = migratedEnvelopePrefixes;
const forbiddenPaths = [
  '/api/payment-methods',
  '/payment-methods',
  '/api/transactions',
  '/api/transactions/reconcile',
  '/transactions',
  '/transactions/reconcile',
  '/api/reporting/ delinquency-report',
  '/api/reports/ delinquency-report',
  '/api/documents-legacy',
  '/api/maintenance-requests',
];

function fail(message) {
  failures.push(message);
}

function isOperationKey(key) {
  return httpMethods.has(key.toLowerCase());
}

function isMigratedEnvelopePath(routePath) {
  return migratedEnvelopePrefixes.some((prefix) => routePath.startsWith(prefix));
}

function isProtectedPath(routePath) {
  return protectedPrefixes.some((prefix) => routePath.startsWith(prefix));
}

function isExternalPath(routePath) {
  return externalPrefixes.some((prefix) => routePath.startsWith(prefix));
}

function schemaHasEnvelope(schema) {
  if (!schema || typeof schema !== 'object') return false;
  const required = Array.isArray(schema.required) ? schema.required : [];
  const props = schema.properties || {};
  return (
    required.includes('data') &&
    required.includes('meta') &&
    required.includes('errors') &&
    props.data &&
    props.meta &&
    props.errors
  );
}

function getJsonSchema(operation) {
  const responses = operation.responses || {};
  const successStatus = Object.keys(responses).find((status) => /^2\d\d$/.test(status));
  const response = successStatus ? responses[successStatus] : undefined;
  return response?.content?.['application/json']?.schema;
}

function getPathParams(routePath) {
  return [...routePath.matchAll(/{([^}]+)}/g)].map((match) => match[1]);
}

function getDeclaredPathParams(operation) {
  const params = Array.isArray(operation.parameters) ? operation.parameters : [];
  return params.filter((param) => param.in === 'path').map((param) => param.name);
}

function hasBearerSecurity(operation) {
  return Array.isArray(operation.security) && operation.security.some((entry) => Object.hasOwn(entry, 'JWT-auth'));
}

const failures = [];
const openApi = JSON.parse(fs.readFileSync(openApiPath, 'utf8'));
const routeOwnership = fs.readFileSync(routeOwnershipPath, 'utf8');

if (openApi.openapi !== '3.0.0') {
  fail(`Expected OpenAPI 3.0.0, found ${openApi.openapi || 'missing'}.`);
}

if (!openApi.components?.securitySchemes?.['JWT-auth']) {
  fail('Missing JWT-auth security scheme in OpenAPI components.');
}

const operationIds = new Map();

for (const [routePath, pathItem] of Object.entries(openApi.paths || {})) {
  if (/\s/.test(routePath)) {
    fail(`Route path contains whitespace: ${routePath}`);
  }

  if (!routePath.startsWith('/api/') && !allowedBarePaths.has(routePath) && !isExternalPath(routePath)) {
    fail(`Browser route is not under /api and is not an external exception: ${routePath}`);
  }

  for (const [method, operation] of Object.entries(pathItem)) {
    if (!isOperationKey(method)) continue;

    const label = `${method.toUpperCase()} ${routePath}`;
    if (!operation.operationId) {
      fail(`${label} is missing operationId.`);
    } else if (operationIds.has(operation.operationId)) {
      fail(`${label} duplicates operationId ${operation.operationId} from ${operationIds.get(operation.operationId)}.`);
    } else {
      operationIds.set(operation.operationId, label);
    }

    for (const param of getPathParams(routePath)) {
      if (!getDeclaredPathParams(operation).includes(param)) {
        fail(`${label} has path param {${param}} but no matching OpenAPI path parameter.`);
      }
    }

    const schema = getJsonSchema(operation);
    if (isMigratedEnvelopePath(routePath)) {
      if (!schema) {
        fail(`${label} is missing a 2xx application/json response schema.`);
      } else if (!schemaHasEnvelope(schema)) {
        fail(`${label} must document the migrated { data, meta, errors } success envelope.`);
      }
    }

    if (isProtectedPath(routePath) && !hasBearerSecurity(operation)) {
      fail(`${label} must document JWT-auth bearer security.`);
    }
  }
}

for (const routePath of forbiddenPaths) {
  if (openApi.paths?.[routePath]) {
    fail(`Forbidden deprecated route is present in OpenAPI: ${routePath}`);
  }
}

for (const routeFamily of [
  '/api/command-center',
  '/api/decisions',
  '/api/foundation',
  '/api/ai-gateway',
  '/api/operator-workflows',
  '/api/operator-payments',
  '/api/operator-setup',
  '/api/operator-applications',
  '/api/operator-lease-signing',
  '/api/operator-maintenance-dispatch',
  '/api/operator-inspection-estimates',
  '/api/operator-renewals',
  '/api/operator-owner-statements',
]) {
  if (!routeOwnership.includes(routeFamily)) {
    fail(`Route ownership doc is missing migrated route family ${routeFamily}.`);
  }
}

if (failures.length > 0) {
  console.error('OpenAPI contract hardening failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`OpenAPI contract hardening passed (${operationIds.size} operations checked).`);
