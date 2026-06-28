import { BadRequestException } from '@nestjs/common';
import { AiGatewayService } from './ai-gateway.service';

describe('AiGatewayService', () => {
  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'AI_ENABLED') return 'false';
      return fallback;
    }),
  };
  const auditLog = { record: jest.fn().mockResolvedValue(undefined) };
  const decisions = {
    create: jest.fn().mockResolvedValue({ id: 'decision-record-1' }),
  };
  const aiProvider = {
    getProvider: jest.fn().mockReturnValue('mock'),
    getModel: jest.fn().mockReturnValue('mock-deterministic-v1'),
    isEnabled: jest.fn().mockReturnValue(false),
    complete: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    aiProvider.getProvider.mockReturnValue('mock');
    aiProvider.getModel.mockReturnValue('mock-deterministic-v1');
    aiProvider.isEnabled.mockReturnValue(false);
  });

  it('exposes a capability manifest for operator workflow wiring', () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = service.getCapabilityManifest();

    expect(result.mode).toBe('mock');
    expect(result.model).toBe('mock-deterministic-v1');
    expect(result.capabilities.map((capability) => capability.id)).toEqual(expect.arrayContaining([
      'maintenance-classification',
      'communication-draft',
      'application-summary',
      'lease-risk-summary',
      'repair-estimate-draft',
      'bookkeeping-categorization',
      'decision-recommendation',
    ]));
    expect(result.capabilities.find((capability) => capability.id === 'decision-recommendation')).toEqual(expect.objectContaining({
      persistsDecisionRecord: true,
      requiresApprovalForExternalAction: true,
    }));
    expect(result.capabilities.find((capability) => capability.id === 'communication-draft')?.blockedAutoActions).toEqual(expect.arrayContaining([
      'SEND_EXTERNAL_MESSAGE',
      'SEND_LEGAL_OR_ADVERSE_NOTICE',
    ]));
  });

  it('generates deterministic mock output and records audit', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.generate(
      'org-1',
      { userId: 'actor-1' },
      {
        task: 'MAINTENANCE_CLASSIFICATION',
        prompt: 'Water is leaking under the kitchen sink.',
        entity: { type: 'MaintenanceRequest', id: 'request-1' },
        evidenceRefs: [{ type: 'MaintenanceRequest', id: 'request-1', label: 'Tenant request' }],
      },
    );

    expect(result.provider).toBe('mock');
    expect(result.content).toContain('plumbing');
    expect(result.requiresApproval).toBe(false);
    expect(decisions.create).not.toHaveBeenCalled();
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
      orgId: 'org-1',
      action: 'AI_GATEWAY_GENERATED',
      entityType: 'MaintenanceRequest',
      entityId: 'request-1',
      result: 'SUCCESS',
    }));
  });

  it('persists decision records for decision recommendations', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.generate(
      'org-1',
      { userId: 'actor-1' },
      {
        task: 'DECISION_RECOMMENDATION',
        prompt: 'Approve a payment plan after tenant promise to pay.',
        context: { workflowId: 'PAYMENT_EXCEPTION' },
        entity: { type: 'Invoice', id: 'invoice-1' },
        evidenceRefs: [{ type: 'Invoice', id: 'invoice-1', label: 'Overdue invoice' }],
      },
    );

    expect(result.requiresApproval).toBe(true);
    expect(result.audit.decisionRecordId).toBe('decision-record-1');
    expect(decisions.create).toHaveBeenCalledWith(expect.objectContaining({
      organizationId: 'org-1',
      workflowId: 'PAYMENT_EXCEPTION',
      actorId: 'actor-1',
      entityType: 'Invoice',
      entityId: 'invoice-1',
      result: 'AI_RECOMMENDATION_APPROVAL_REQUIRED',
    }));
  });

  it('evaluates gateway output with deterministic checks', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.evaluate(
      'org-1',
      { userId: 'actor-1' },
      {
        task: 'COMMUNICATION_DRAFT',
        input: { task: 'COMMUNICATION_DRAFT', prompt: 'Draft a tenant update.', riskLevel: 'LOW' },
        output: { content: 'Tenant update draft.', structured: { summary: 'ok' }, confidence: 0.8 },
      },
    );

    expect(result.passed).toBe(true);
    expect(result.score).toBe(100);
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'AI_GATEWAY_EVALUATED',
      result: 'SUCCESS',
    }));
  });

  it('classifies emergency maintenance with habitability and approval flags', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.classifyMaintenance(
      'org-1',
      { userId: 'actor-1' },
      {
        title: 'Active water leak',
        description: 'Water is flooding under the sink and spreading into the hallway.',
        propertyId: 'property-1',
        unitId: 'unit-1',
        source: 'TENANT_PORTAL',
      },
    );

    expect(result.category).toBe('PLUMBING');
    expect(result.trade).toBe('plumber');
    expect(result.priority).toBe('HIGH');
    expect(result.habitabilityRisk).toBe(true);
    expect(result.emergency).toBe(true);
    expect(result.requiresApproval).toBe(true);
    expect(result.suggestedSlaHours).toBe(4);
    expect(result.gatewayResponseId).toBeDefined();
    expect(auditLog.record).toHaveBeenCalledWith(expect.objectContaining({
      action: 'AI_GATEWAY_GENERATED',
      entityType: 'Property',
      entityId: 'property-1',
    }));
  });

  it('drafts external maintenance acknowledgements while blocking auto-send', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.draftCommunication(
      'org-1',
      { userId: 'actor-1' },
      {
        audience: 'TENANT',
        channel: 'EMAIL',
        purpose: 'MAINTENANCE_ACK',
        facts: ['Request 123 was received for a leaking kitchen sink.', 'Vendor dispatch is pending operator review.'],
        entity: { type: 'MaintenanceRequest', id: 'request-123' },
      },
    );

    expect(result.subject).toBe('Maintenance request received');
    expect(result.body).toContain('Request 123 was received');
    expect(result.riskFlags).toEqual([]);
    expect(result.requiresApproval).toBe(false);
    expect(result.blockedAutoSend).toBe(true);
    expect(result.gatewayResponseId).toBeDefined();
  });

  it('flags adverse action and fair housing communications for approval', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.draftCommunication(
      'org-1',
      { userId: 'actor-1' },
      {
        audience: 'APPLICANT',
        channel: 'EMAIL',
        purpose: 'ADVERSE_ACTION',
        prompt: 'Draft denial because the background check and credit report did not satisfy screening criteria.',
        facts: ['Applicant requested a reasonable accommodation during review.'],
        entity: { type: 'RentalApplication', id: 'application-1' },
      },
    );

    expect(result.requiresApproval).toBe(true);
    expect(result.blockedAutoSend).toBe(true);
    expect(result.riskFlags).toEqual(expect.arrayContaining(['ADVERSE_ACTION', 'FAIR_HOUSING_SENSITIVE']));
    expect(result.complianceFlags).toEqual(expect.arrayContaining(['ADVERSE_ACTION_REVIEW', 'FAIR_HOUSING_REVIEW']));
    expect(result.recommendedApprovalReason).toContain('Review required');
  });

  it('summarizes application review facts with objective policy signals', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.summarizeApplicationReview(
      'org-1',
      { userId: 'actor-1' },
      {
        applicationId: 'application-1',
        applicantName: 'Jordan Lee',
        monthlyRent: 1200,
        monthlyIncome: 4200,
        creditScore: 690,
        screeningScore: 82,
        screeningPolicyVersion: 'ks-beta-v1',
        facts: ['Employment verified by uploaded pay stubs.', 'Application fee paid.'],
        evidenceRefs: [{ type: 'RentalApplication', id: 'application-1', label: 'Application record' }],
      },
    );

    expect(result.recommendation).toBe('APPROVE_REVIEW');
    expect(result.incomeToRentRatio).toBe(3.5);
    expect(result.blockedAutoDecision).toBe(true);
    expect(result.requiresApproval).toBe(true);
    expect(result.complianceFlags).toEqual(expect.arrayContaining(['FAIR_HOUSING_REVIEW', 'SCREENING_POLICY_REVIEW']));
    expect(result.gatewayResponseId).toBeDefined();
  });

  it('routes incomplete or adverse application summaries to guarded review', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.summarizeApplicationReview(
      'org-1',
      { userId: 'actor-1' },
      {
        applicationId: 'application-2',
        applicantName: 'Riley Chen',
        monthlyRent: 1000,
        monthlyIncome: 2200,
        creditScore: 560,
        adverseActionReasons: ['Credit report did not satisfy published criteria.'],
        accommodationRequested: true,
      },
    );

    expect(result.recommendation).toBe('NEEDS_MORE_INFO');
    expect(result.missingInformation).toEqual(expect.arrayContaining(['Screening policy version']));
    expect(result.riskFlags).toEqual(expect.arrayContaining(['ADVERSE_ACTION', 'FAIR_HOUSING_SENSITIVE', 'INCOMPLETE_APPLICATION_RECORD']));
    expect(result.complianceFlags).toEqual(expect.arrayContaining(['ADVERSE_ACTION_REVIEW', 'ACCOMMODATION_REVIEW']));
    expect(result.recommendedNextAction).toContain('missing application evidence');
  });

  it('summarizes Kansas lease terms while blocking auto decision', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.summarizeLeaseRisk(
      'org-1',
      { userId: 'actor-1' },
      {
        leaseId: 'lease-1',
        tenantName: 'Morgan Smith',
        jurisdiction: { state: 'KS', city: 'Wichita' },
        leaseTemplateVersion: 'ks-residential-v1',
        startDate: '2026-07-01',
        endDate: '2027-06-30',
        monthlyRent: 1200,
        securityDeposit: 1200,
        furnished: false,
        petsAllowed: false,
        clauses: [{ name: 'Late fees', text: 'Late fees follow the approved property fee schedule.' }],
      },
    );

    expect(result.riskFlags).toEqual([]);
    expect(result.missingInformation).toEqual([]);
    expect(result.complianceFlags).toEqual(expect.arrayContaining(['LEASE_TEMPLATE_REVIEW', 'KANSAS_LEASE_REVIEW']));
    expect(result.blockedAutoDecision).toBe(true);
    expect(result.requiresApproval).toBe(true);
    expect(result.gatewayResponseId).toBeDefined();
  });

  it('flags Kansas deposit cap and prohibited clause risk for lease review', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.summarizeLeaseRisk(
      'org-1',
      { userId: 'actor-1' },
      {
        leaseId: 'lease-2',
        tenantName: 'Casey Nguyen',
        jurisdiction: { state: 'Kansas' },
        startDate: '2026-08-01',
        endDate: '2027-07-31',
        monthlyRent: 1000,
        securityDeposit: 1800,
        petDeposit: 300,
        furnished: false,
        petsAllowed: false,
        clauses: [{ name: 'Default', text: 'Tenant waives habitability objections and landlord may use lockout after default.' }],
      },
    );

    expect(result.missingInformation).toEqual(expect.arrayContaining(['Lease template version']));
    expect(result.riskFlags).toEqual(expect.arrayContaining(['KANSAS_DEPOSIT_CAP_REVIEW', 'POTENTIALLY_PROHIBITED_CLAUSE', 'INCOMPLETE_LEASE_RECORD']));
    expect(result.complianceFlags).toEqual(expect.arrayContaining(['KSA_58_2550_DEPOSIT_CAP_REVIEW', 'COUNSEL_REVIEW_REQUIRED']));
    expect(result.recommendedNextAction).toContain('route flagged terms');
  });

  it('drafts a low-risk repair estimate with line item costs', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.draftRepairEstimate(
      'org-1',
      { userId: 'actor-1' },
      {
        source: 'INSPECTION',
        inspectionId: 'inspection-1',
        location: 'Bedroom',
        laborRate: 80,
        vendorThreshold: 500,
        items: [
          { location: 'Bedroom', category: 'Walls', description: 'Patch small drywall dent and touch up paint.', severity: 'LOW' },
        ],
      },
    );

    expect(result.lineItems).toHaveLength(1);
    expect(result.lineItems[0].trade).toBe('painter or drywall technician');
    expect(result.totalEstimatedCost).toBeGreaterThan(0);
    expect(result.riskFlags).toEqual([]);
    expect(result.approvalRequired).toBe(false);
    expect(result.blockedAutoActions).toEqual(expect.arrayContaining(['CREATE_WORK_ORDER', 'DISPATCH_VENDOR', 'APPLY_DEPOSIT_DEDUCTION']));
  });

  it('flags high-risk repair estimates for approval before execution', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.draftRepairEstimate(
      'org-1',
      { userId: 'actor-1' },
      {
        source: 'MAINTENANCE_REQUEST',
        maintenanceRequestId: 'request-9',
        propertyId: 'property-1',
        unitId: 'unit-1',
        location: 'Bathroom',
        vendorThreshold: 300,
        items: [
          { location: 'Bathroom', category: 'Plumbing', description: 'Active leak with mold around vanity and damaged drywall.', severity: 'HIGH' },
          { location: 'Hallway', category: 'Electrical', description: 'Replace outlet with exposed wire.', severity: 'HIGH' },
        ],
      },
    );

    expect(result.approvalRequired).toBe(true);
    expect(result.riskFlags).toEqual(expect.arrayContaining(['HIGH_SEVERITY_REPAIR', 'HABITABILITY_REVIEW', 'SAFETY_REVIEW', 'VENDOR_APPROVAL_THRESHOLD']));
    expect(result.recommendedNextAction).toContain('Route estimate to operator review');
    expect(result.gatewayResponseId).toBeDefined();
  });

  it('suggests maintenance expense categorization with accounting review controls', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.categorizeBookkeepingTransaction(
      'org-1',
      { userId: 'actor-1' },
      {
        transactionId: 'tx-1',
        description: 'ABC Plumbing repair invoice for unit sink leak',
        amount: -325.5,
        direction: 'OUTFLOW',
        propertyId: 'property-1',
        unitId: 'unit-1',
      },
    );

    expect(result.suggestedAccount.code).toBe('5000');
    expect(result.suggestedAccount.name).toBe('Repairs and Maintenance');
    expect(result.allocationSuggestion).toEqual([{ accountCode: '5000', percent: 100, amount: 325.5 }]);
    expect(result.reviewRequired).toBe(false);
    expect(result.blockedAutoActions).toEqual(expect.arrayContaining(['POST_JOURNAL_ENTRY', 'EXPORT_TO_QUICKBOOKS']));
    expect(result.gatewayResponseId).toBeDefined();
  });

  it('flags uncategorized or high-risk bookkeeping transactions before close/export', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.categorizeBookkeepingTransaction(
      'org-1',
      { userId: 'actor-1' },
      {
        transactionId: 'tx-2',
        description: 'Large refund reversal and chargeback from bank',
        amount: -4200,
        direction: 'OUTFLOW',
      },
    );

    expect(result.suggestedAccount.code).toBe('9000');
    expect(result.reviewRequired).toBe(true);
    expect(result.riskFlags).toEqual(expect.arrayContaining(['MISSING_PROPERTY_MAPPING', 'SUSPENSE_REVIEW', 'HIGH_DOLLAR_REVIEW', 'PAYMENT_EXCEPTION_REVIEW']));
    expect(result.recommendedNextAction).toContain('Route to accounting review');
    expect(result.quickBooksMappingRequired).toBe(true);
  });

  it('recommends decisions with blockers and persisted decision linkage', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    const result = await service.recommendDecision(
      'org-1',
      { userId: 'actor-1' },
      {
        workflowId: 'WF-COL-001',
        decisionType: 'DELINQUENCY_FOLLOW_UP',
        entity: { type: 'Invoice', id: 'invoice-9' },
        signal: {
          title: 'Tenant balance is 12 days overdue',
          summary: 'Ledger shows unpaid rent and no pending Stripe payment.',
          priority: 'HIGH',
          amount: 1250,
        },
        options: [
          { id: 'send-reminder', label: 'Draft payment reminder', riskLevel: 'MEDIUM' },
          { id: 'notice', label: 'Prepare Kansas notice packet', riskLevel: 'HIGH' },
        ],
        policyFlags: ['KANSAS_NOTICE_GATE'],
        evidenceRefs: [{ type: 'Invoice', id: 'invoice-9', label: 'Open invoice' }],
      },
    );

    expect(result.recommendedOptionId).toBe('send-reminder');
    expect(result.requiresApproval).toBe(true);
    expect(result.riskFlags).toEqual(expect.arrayContaining(['HIGH_PRIORITY_SIGNAL', 'FINANCIAL_DECISION', 'KANSAS_NOTICE_GATE']));
    expect(result.approvalBlockers).toEqual(expect.arrayContaining([expect.stringContaining('Payment plans')]));
    expect(result.blockedAutoActions).toEqual(expect.arrayContaining(['EXECUTE_WORKFLOW_ACTION', 'SEND_EXTERNAL_MESSAGE']));
    expect(result.decisionRecordId).toBe('decision-record-1');
  });

  it('rejects empty prompts', async () => {
    const service = new AiGatewayService(config as any, auditLog as any, decisions as any, aiProvider as any, { aiUsageMetric: { create: jest.fn().mockResolvedValue({}) } } as any);

    await expect(
      service.generate('org-1', { userId: 'actor-1' }, { task: 'LEASE_SUMMARY', prompt: '' }),
    ).rejects.toThrow(BadRequestException);
  });
});
