import { readFileSync } from 'fs';
import { resolve } from 'path';

type OpenApiDocument = {
  paths: Record<string, Record<string, unknown>>;
};

const openApiPath = resolve(__dirname, '..', '..', 'docs', 'api', 'openapi.json');

function loadOpenApi(): OpenApiDocument {
  return JSON.parse(readFileSync(openApiPath, 'utf8')) as OpenApiDocument;
}

describe('Operator P0 API contracts', () => {
  let openApi: OpenApiDocument;

  beforeAll(() => {
    openApi = loadOpenApi();
  });

  const expectRoute = (path: string, method: string) => {
    expect(openApi.paths[path]).toBeDefined();
    expect(openApi.paths[path][method.toLowerCase()]).toBeDefined();
  };

  const expectJsonResponse = (path: string, method: string, status = '200') => {
    const operation = openApi.paths[path]?.[method.toLowerCase()] as any;
    expect(operation).toBeDefined();
    expect(operation.responses?.[status]).toBeDefined();
    expect(operation.responses?.[status]?.content?.['application/json']).toBeDefined();
  };

  const expectNoRoute = (path: string) => {
    expect(openApi.paths[path]).toBeUndefined();
  };

  it('exposes canonical P0 payment and payment-method routes only', () => {
    expectRoute('/api/payments', 'get');
    expectRoute('/api/payments/history', 'get');
    expectRoute('/api/payments/invoices', 'get');
    expectRoute('/api/payments/payment-methods', 'get');
    expectRoute('/api/payments/payment-methods', 'post');
    expectRoute('/api/payments/payment-methods/setup-intent', 'post');

    expectNoRoute('/api/payment-methods');
    expectNoRoute('/payment-methods');
  });

  it('exposes canonical reporting routes and rejects the prior delinquency typo', () => {
    expectRoute('/api/reporting/delinquency-report', 'get');
    expectRoute('/api/reporting/rent-roll', 'get');
    expectRoute('/api/reporting/financial-summary', 'get');

    expectNoRoute('/api/reporting/ delinquency-report');
    expectNoRoute('/api/reports/ delinquency-report');
  });

  it('exposes canonical inspections and inspection request routes', () => {
    expectRoute('/api/inspections', 'get');
    expectRoute('/api/inspections', 'post');
    expectRoute('/api/inspections/{id}', 'get');
    expectRoute('/api/inspections/{id}', 'put');
    expectRoute('/api/inspections/{id}/approve', 'put');
    expectRoute('/api/inspections/requests', 'get');
  });

  it('keeps legacy document-management routes out of the operator OpenAPI surface', () => {
    expectRoute('/api/documents', 'get');
    expectRoute('/api/documents/upload', 'post');
    expectRoute('/api/documents/{id}/download', 'get');

    expectNoRoute('/api/documents-legacy');
    expectNoRoute('/api/documents-legacy/{id}');
  });

  it('keeps application review on rental-applications for operator workflows', () => {
    expectRoute('/api/rental-applications', 'get');
    expectRoute('/api/rental-applications/{id}', 'get');
    expectRoute('/api/rental-applications/{id}/review-action', 'post');
    expectRoute('/api/rental-applications/{id}/policy-evaluation', 'get');

    expectRoute('/api/applications/submit', 'post');
    expectNoRoute('/api/leasing/applications/submit');
  });

  it('exposes the canonical route families required before initial Next.js porting', () => {
    [
      '/api/auth/login',
      '/api/properties',
      '/api/leases',
      '/api/maintenance',
      '/api/bookkeeping/workspace',
      '/api/messaging/conversations',
      '/api/policy/approval-tasks/pending',
      '/api/schedule/summary',
    ].forEach((path) => {
      expect(openApi.paths[path]).toBeDefined();
    });
  });

  it('exposes Phase 1 foundation and decision-record contracts', () => {
    expectRoute('/api/foundation/event-envelope/example', 'get');
    expectRoute('/api/foundation/idempotency/reserve', 'post');
    expectRoute('/api/decisions', 'get');
    expectRoute('/api/decisions', 'post');
  });

  it('exposes Phase 4 AI gateway contracts', () => {
    expectRoute('/api/ai-gateway/capabilities', 'get');
    expectRoute('/api/ai-gateway/generate', 'post');
    expectRoute('/api/ai-gateway/evaluate', 'post');
    expectRoute('/api/ai-gateway/maintenance/classify', 'post');
    expectRoute('/api/ai-gateway/communications/draft', 'post');
    expectRoute('/api/ai-gateway/applications/summarize', 'post');
    expectRoute('/api/ai-gateway/leases/summarize-risk', 'post');
    expectRoute('/api/ai-gateway/repair-estimates/draft', 'post');
    expectRoute('/api/ai-gateway/bookkeeping/categorize', 'post');
    expectRoute('/api/ai-gateway/decisions/recommend', 'post');
    expectJsonResponse('/api/ai-gateway/capabilities', 'get');
    expectJsonResponse('/api/ai-gateway/generate', 'post', '201');
    expectJsonResponse('/api/ai-gateway/evaluate', 'post');
    expectJsonResponse('/api/ai-gateway/maintenance/classify', 'post');
    expectJsonResponse('/api/ai-gateway/communications/draft', 'post');
    expectJsonResponse('/api/ai-gateway/applications/summarize', 'post');
    expectJsonResponse('/api/ai-gateway/leases/summarize-risk', 'post');
    expectJsonResponse('/api/ai-gateway/repair-estimates/draft', 'post');
    expectJsonResponse('/api/ai-gateway/bookkeeping/categorize', 'post');
    expectJsonResponse('/api/ai-gateway/decisions/recommend', 'post');
  });

  it('exposes Phase 2 command-center contracts', () => {
    expectRoute('/api/command-center', 'get');
    expectRoute('/api/command-center/decisions', 'get');
    expectRoute('/api/command-center/decisions/{id}', 'get');
    expectRoute('/api/command-center/decisions/{id}/actions/{actionId}', 'post');
    expectRoute('/api/command-center/decisions/{id}/defer', 'post');
    expectRoute('/api/command-center/daily-briefing', 'get');
  });

  it('documents command-center response content for migrated envelopes', () => {
    expectJsonResponse('/api/command-center', 'get');
    expectJsonResponse('/api/command-center/decisions', 'get');
    expectJsonResponse('/api/command-center/decisions/{id}', 'get');
    expectJsonResponse('/api/command-center/decisions/{id}/actions/{actionId}', 'post', '201');
    expectJsonResponse('/api/command-center/decisions/{id}/defer', 'post', '201');
    expectJsonResponse('/api/command-center/daily-briefing', 'get');
    expectJsonResponse('/api/decisions', 'get');
  });

  it('exposes Phase 3 operator workflow read model', () => {
    expectRoute('/api/operator-workflows', 'get');
    expectRoute('/api/operator-payments', 'get');
    expectJsonResponse('/api/operator-payments', 'get');
    expectRoute('/api/operator-setup', 'get');
    expectRoute('/api/operator-setup/properties', 'post');
    expectRoute('/api/operator-setup/properties/{propertyId}', 'patch');
    expectRoute('/api/operator-setup/properties/{propertyId}/units', 'post');
    expectRoute('/api/operator-setup/properties/{propertyId}/units/{unitId}', 'patch');
    expectJsonResponse('/api/operator-setup', 'get');
    expectRoute('/api/operator-applications', 'get');
    expectRoute('/api/operator-applications/{id}', 'get');
    expectRoute('/api/operator-applications/{id}/screen', 'post');
    expectRoute('/api/operator-applications/{id}/review-action', 'post');
    expectRoute('/api/operator-applications/{id}/convert-to-lease', 'post');
    expectJsonResponse('/api/operator-applications', 'get');
    expectJsonResponse('/api/operator-applications/{id}', 'get');
    expectJsonResponse('/api/operator-applications/{id}/screen', 'post');
    expectJsonResponse('/api/operator-applications/{id}/review-action', 'post');
    expectJsonResponse('/api/operator-applications/{id}/convert-to-lease', 'post', '201');
    expectRoute('/api/operator-lease-signing', 'get');
    expectRoute('/api/operator-lease-signing/leases/{leaseId}/generate-packet', 'post');
    expectRoute('/api/operator-lease-signing/leases/{leaseId}/send-envelope', 'post');
    expectRoute('/api/operator-lease-signing/envelopes/{envelopeId}/refresh', 'post');
    expectRoute('/api/operator-lease-signing/envelopes/{envelopeId}/resend', 'post');
    expectJsonResponse('/api/operator-lease-signing', 'get');
    expectJsonResponse('/api/operator-lease-signing/leases/{leaseId}/generate-packet', 'post', '201');
    expectJsonResponse('/api/operator-lease-signing/leases/{leaseId}/send-envelope', 'post', '201');
    expectJsonResponse('/api/operator-lease-signing/envelopes/{envelopeId}/refresh', 'post');
    expectJsonResponse('/api/operator-lease-signing/envelopes/{envelopeId}/resend', 'post');
    expectRoute('/api/operator-maintenance-dispatch', 'get');
    expectRoute('/api/operator-maintenance-dispatch/requests/{requestId}/dispatch-vendor', 'post');
    expectRoute('/api/operator-maintenance-dispatch/requests/{requestId}/bids', 'post');
    expectRoute('/api/operator-maintenance-dispatch/bids/{bidId}/award', 'patch');
    expectRoute('/api/operator-maintenance-dispatch/bids/{bidId}/complete', 'patch');
    expectRoute('/api/operator-maintenance-dispatch/bids/{bidId}/reject', 'patch');
    expectJsonResponse('/api/operator-maintenance-dispatch', 'get');
    expectJsonResponse('/api/operator-maintenance-dispatch/requests/{requestId}/dispatch-vendor', 'post');
    expectJsonResponse('/api/operator-maintenance-dispatch/requests/{requestId}/bids', 'post', '201');
    expectJsonResponse('/api/operator-maintenance-dispatch/bids/{bidId}/award', 'patch');
    expectJsonResponse('/api/operator-maintenance-dispatch/bids/{bidId}/complete', 'patch');
    expectJsonResponse('/api/operator-maintenance-dispatch/bids/{bidId}/reject', 'patch');
    expectRoute('/api/operator-inspection-estimates', 'get');
    expectRoute('/api/operator-inspection-estimates/inspections/{inspectionId}/generate-estimate', 'post');
    expectRoute('/api/operator-inspection-estimates/estimates/{estimateId}/approve', 'patch');
    expectRoute('/api/operator-inspection-estimates/estimates/{estimateId}/reject', 'patch');
    expectRoute('/api/operator-inspection-estimates/estimates/{estimateId}/create-repair-request', 'post');
    expectJsonResponse('/api/operator-inspection-estimates', 'get');
    expectJsonResponse('/api/operator-inspection-estimates/inspections/{inspectionId}/generate-estimate', 'post', '201');
    expectJsonResponse('/api/operator-inspection-estimates/estimates/{estimateId}/approve', 'patch');
    expectJsonResponse('/api/operator-inspection-estimates/estimates/{estimateId}/reject', 'patch');
    expectJsonResponse('/api/operator-inspection-estimates/estimates/{estimateId}/create-repair-request', 'post', '201');
    expectRoute('/api/operator-renewals', 'get');
    expectRoute('/api/operator-renewals/leases/{leaseId}/offers', 'post');
    expectRoute('/api/operator-renewals/leases/{leaseId}/offers/{offerId}/response', 'post');
    expectRoute('/api/operator-renewals/leases/{leaseId}/signature', 'post');
    expectRoute('/api/operator-renewals/envelopes/{envelopeId}/refresh', 'patch');
    expectRoute('/api/operator-renewals/leases/{leaseId}/move-out', 'post');
    expectJsonResponse('/api/operator-renewals', 'get');
    expectJsonResponse('/api/operator-renewals/leases/{leaseId}/offers', 'post', '201');
    expectJsonResponse('/api/operator-renewals/leases/{leaseId}/offers/{offerId}/response', 'post');
    expectJsonResponse('/api/operator-renewals/leases/{leaseId}/signature', 'post', '201');
    expectJsonResponse('/api/operator-renewals/envelopes/{envelopeId}/refresh', 'patch');
    expectJsonResponse('/api/operator-renewals/leases/{leaseId}/move-out', 'post', '201');
    expectRoute('/api/operator-owner-statements', 'get');
    expectRoute('/api/operator-owner-statements/generate', 'post');
    expectRoute('/api/operator-owner-statements/{statementId}/approve', 'patch');
    expectRoute('/api/operator-owner-statements/{statementId}/send', 'patch');
    expectJsonResponse('/api/operator-owner-statements', 'get');
    expectJsonResponse('/api/operator-owner-statements/generate', 'post', '201');
    expectJsonResponse('/api/operator-owner-statements/{statementId}/approve', 'patch');
    expectJsonResponse('/api/operator-owner-statements/{statementId}/send', 'patch');
  });

  it('exposes canonical accounting routes and rejects deprecated transaction shortcuts', () => {
    [
      ['/api/bookkeeping/workspace', 'get'],
      ['/api/bookkeeping/chart-of-accounts', 'get'],
      ['/api/bookkeeping/chart-of-accounts', 'post'],
      ['/api/bookkeeping/chart-of-accounts/seed', 'post'],
      ['/api/bookkeeping/chart-of-accounts/mapping-status', 'get'],
      ['/api/bookkeeping/transactions/pending', 'get'],
      ['/api/bookkeeping/transactions/exceptions', 'get'],
      ['/api/bookkeeping/transactions/import', 'post'],
      ['/api/bookkeeping/transactions/{id}/categorize', 'patch'],
      ['/api/bookkeeping/transactions/{id}/exception', 'patch'],
      ['/api/bookkeeping/transactions/{id}/allocate', 'post'],
      ['/api/bookkeeping/reconciliation', 'get'],
      ['/api/bookkeeping/reconciliation/items/{id}/confirm', 'patch'],
      ['/api/bookkeeping/monthly-close', 'get'],
      ['/api/bookkeeping/monthly-close/{propertyId}/lock', 'post'],
      ['/api/bookkeeping/monthly-close/{propertyId}/reopen', 'post'],
      ['/api/bookkeeping/owner-statements', 'get'],
      ['/api/bookkeeping/owner-statements/generate', 'post'],
      ['/api/bookkeeping/owner-statements/{id}/approve', 'patch'],
      ['/api/bookkeeping/owner-statements/{id}/send', 'patch'],
      ['/api/bookkeeping/journal-entries', 'post'],
      ['/api/bookkeeping/journal-entries/draft-from-ledger', 'post'],
      ['/api/bookkeeping/journal-entries/{id}/post', 'post'],
      ['/api/bookkeeping/journal-entries/{id}/reverse', 'post'],
      ['/api/bookkeeping/payment-expansion-gates', 'get'],
      ['/api/bookkeeping/quickbooks/export-spec', 'get'],
    ].forEach(([path, method]) => expectRoute(path, method));

    expectNoRoute('/api/transactions');
    expectNoRoute('/api/transactions/reconcile');
    expectNoRoute('/transactions');
    expectNoRoute('/transactions/reconcile');
  });
});
