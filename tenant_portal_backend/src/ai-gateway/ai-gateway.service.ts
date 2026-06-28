import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AuditLogService } from '../shared/audit-log.service';
import { DecisionRecordService } from '../decisions/decision-record.service';
import { AIProviderService } from '../ai-provider';
import OpenAI from 'openai';
import {
  AiEvaluationRequest,
  AiEvaluationResponse,
  AiGatewayCapability,
  AiGatewayCapabilityManifestResponse,
  AiGatewayRequest,
  AiGatewayResponse,
  AiGatewayTask,
  ApplicationReviewSummaryRequest,
  ApplicationReviewSummaryResponse,
  CommunicationDraftRequest,
  CommunicationDraftResponse,
  LeaseRiskSummaryRequest,
  LeaseRiskSummaryResponse,
  MaintenanceClassificationRequest,
  MaintenanceClassificationResponse,
  BookkeepingCategorizationRequest,
  BookkeepingCategorizationResponse,
  DecisionRecommendationRequest,
  DecisionRecommendationResponse,
  RepairEstimateDraftRequest,
  RepairEstimateDraftResponse,
} from './ai-gateway.types';

type Actor = {
  userId: string;
};

@Injectable()
export class AiGatewayService {
  private readonly logger = new Logger(AiGatewayService.name);
  private readonly model: string;
  private readonly baseURL: string;

  constructor(
    private readonly config: ConfigService,
    private readonly auditLog: AuditLogService,
    private readonly decisions: DecisionRecordService,
    private readonly aiProvider: AIProviderService,
    private readonly prisma: PrismaService,
  ) {
    this.model = this.aiProvider.getModel();
    this.baseURL = this.config.get<string>('OPENAI_BASE_URL', 'https://api.openai.com/v1');
    if (this.aiProvider.isEnabled()) {
      this.logger.log(`AI Gateway initialized with ${this.aiProvider.getProvider()} (model: ${this.model})`);
    } else {
      this.logger.warn('AI Gateway initialized in deterministic mock mode.');
    }
  }

  /**
   * Phase 2B: Get the OpenAI client for a request — uses BYOK key if provided,
   * otherwise falls back to the server-level AI provider. BYOK keys are NEVER persisted.
   */
  private getClient(byokKey?: string): OpenAI | null {
    if (byokKey) {
      return new OpenAI({ ['api' + 'Key']: *** baseURL: this.baseURL });
    }
    // Return null to signal "use aiProvider" — BYOK path vs. server path
    return null;
  }

  getCapabilityManifest(): AiGatewayCapabilityManifestResponse {
    const capabilities: AiGatewayCapability[] = [
      {
        id: 'generic-generate',
        route: '/api/ai-gateway/generate',
        method: 'POST',
        task: 'DECISION_RECOMMENDATION',
        workflowIds: ['WF-CMD-001', 'WF-POL-001'],
        description: 'Generic auditable AI generation endpoint for internal fallback use.',
        riskLevel: 'HIGH',
        requiresApprovalForExternalAction: true,
        persistsDecisionRecord: true,
        blockedAutoActions: ['EXECUTE_WORKFLOW_ACTION', 'SEND_EXTERNAL_MESSAGE'],
        primaryGuardrails: ['Audit event required', 'Decision recommendations require approval', 'Use specialist routes where available'],
      },
      {
        id: 'maintenance-classification',
        route: '/api/ai-gateway/maintenance/classify',
        method: 'POST',
        task: 'MAINTENANCE_CLASSIFICATION',
        workflowIds: ['WF-MNT-001', 'WF-CMD-001'],
        description: 'Classifies maintenance category, trade, priority, habitability risk, and emergency posture.',
        riskLevel: 'MEDIUM',
        requiresApprovalForExternalAction: true,
        persistsDecisionRecord: false,
        blockedAutoActions: ['DISPATCH_VENDOR', 'APPROVE_ESTIMATE', 'BILL_TENANT'],
        primaryGuardrails: ['Habitability and safety risks require approval', 'Emergency outputs are review-gated'],
      },
      {
        id: 'communication-draft',
        route: '/api/ai-gateway/communications/draft',
        method: 'POST',
        task: 'COMMUNICATION_DRAFT',
        workflowIds: ['WF-MSG-001', 'WF-COL-001', 'WF-APP-001', 'WF-MNT-001'],
        description: 'Drafts tenant, applicant, owner, vendor, or internal communication with compliance flags.',
        riskLevel: 'HIGH',
        requiresApprovalForExternalAction: true,
        persistsDecisionRecord: false,
        blockedAutoActions: ['SEND_EXTERNAL_MESSAGE', 'SEND_LEGAL_OR_ADVERSE_NOTICE'],
        primaryGuardrails: ['External AI drafts block auto-send', 'Legal, adverse, and fair-housing language require review'],
      },
      {
        id: 'application-summary',
        route: '/api/ai-gateway/applications/summarize',
        method: 'POST',
        task: 'APPLICATION_SUMMARY',
        workflowIds: ['WF-APP-001', 'WF-LEASE-001'],
        description: 'Summarizes application review facts, objective signals, missing evidence, and compliance blockers.',
        riskLevel: 'HIGH',
        requiresApprovalForExternalAction: true,
        persistsDecisionRecord: false,
        blockedAutoActions: ['APPROVE_LEASE_OR_APPLICATION', 'SEND_LEGAL_OR_ADVERSE_NOTICE'],
        primaryGuardrails: ['Application disposition blocked', 'Fair housing and adverse action review required'],
      },
      {
        id: 'lease-risk-summary',
        route: '/api/ai-gateway/leases/summarize-risk',
        method: 'POST',
        task: 'LEASE_SUMMARY',
        workflowIds: ['WF-LEASE-001', 'WF-RENEW-001'],
        description: 'Summarizes lease terms, Kansas deposit cap risk, template risk, and legal-clause blockers.',
        riskLevel: 'HIGH',
        requiresApprovalForExternalAction: true,
        persistsDecisionRecord: false,
        blockedAutoActions: ['APPROVE_LEASE_OR_APPLICATION', 'SEND_LEGAL_OR_ADVERSE_NOTICE', 'APPROVE_DEPOSIT_DEDUCTION'],
        primaryGuardrails: ['Lease terms require approval', 'Kansas compliance flags require review'],
      },
      {
        id: 'repair-estimate-draft',
        route: '/api/ai-gateway/repair-estimates/draft',
        method: 'POST',
        task: 'REPAIR_ESTIMATE',
        workflowIds: ['WF-INSP-001', 'WF-MNT-001', 'WF-VEND-001'],
        description: 'Drafts repair estimate line items, cost ranges, assumptions, and execution blockers.',
        riskLevel: 'MEDIUM',
        requiresApprovalForExternalAction: true,
        persistsDecisionRecord: false,
        blockedAutoActions: ['APPROVE_ESTIMATE', 'CREATE_WORK_ORDER', 'DISPATCH_VENDOR', 'BILL_TENANT', 'APPLY_DEPOSIT_DEDUCTION'],
        primaryGuardrails: ['Safety and habitability review required', 'Vendor threshold review required'],
      },
      {
        id: 'bookkeeping-categorization',
        route: '/api/ai-gateway/bookkeeping/categorize',
        method: 'POST',
        task: 'BOOKKEEPING_CATEGORIZATION',
        workflowIds: ['WF-ACC-001', 'WF-BOOK-001', 'WF-OWNER-001'],
        description: 'Suggests bookkeeping account, allocation, reconciliation hints, and close/export blockers.',
        riskLevel: 'HIGH',
        requiresApprovalForExternalAction: true,
        persistsDecisionRecord: false,
        blockedAutoActions: ['CATEGORIZE_TRANSACTION', 'POST_JOURNAL_ENTRY', 'CONFIRM_RECONCILIATION', 'LOCK_MONTHLY_CLOSE', 'EXPORT_TO_QUICKBOOKS'],
        primaryGuardrails: ['Suspense and missing property mappings block close', 'QuickBooks export requires mapping review'],
      },
      {
        id: 'decision-recommendation',
        route: '/api/ai-gateway/decisions/recommend',
        method: 'POST',
        task: 'DECISION_RECOMMENDATION',
        workflowIds: ['WF-CMD-001', 'WF-POL-001'],
        description: 'Returns typed decision recommendation, rationale, approval blockers, and DecisionRecord linkage.',
        riskLevel: 'HIGH',
        requiresApprovalForExternalAction: true,
        persistsDecisionRecord: true,
        blockedAutoActions: ['EXECUTE_WORKFLOW_ACTION', 'SEND_EXTERNAL_MESSAGE', 'POST_ACCOUNTING_ENTRY', 'DISPATCH_VENDOR', 'APPROVE_LEASE_OR_APPLICATION', 'SEND_LEGAL_OR_ADVERSE_NOTICE'],
        primaryGuardrails: ['DecisionRecord persisted', 'High-risk actions block execution until approval'],
      },
    ];

    return {
      mode: this.aiProvider.isEnabled() ? this.aiProvider.getProvider() : 'mock',
      model: this.aiProvider.isEnabled() ? this.model : 'mock-deterministic-v1',
      capabilities,
    };
  }

  async generate(
    orgId: string,
    actor: Actor,
    input: AiGatewayRequest,
    byokKey?: string,
  ): Promise<AiGatewayResponse> {
    this.validateRequest(input);
    const isByok = Boolean(byokKey);
    const client = this.getClient(byokKey);
    const provider = isByok ? 'byok'
      : this.aiProvider.isEnabled() ? this.aiProvider.getProvider() : 'mock';
    const generated = isByok ? await this.generateWithOpenAi(input, client!)
      : this.aiProvider.isEnabled() ? await this.generateWithAI(input) : this.generateMock(input);
    const requiresApproval = this.requiresApproval(input.task, input.riskLevel, generated.confidence);

    // Phase 2B: record AI usage metrics
    const usage = (generated as any).usage;
    const promptTokens = usage?.prompt_tokens ?? 0;
    const completionTokens = usage?.completion_tokens ?? 0;
    const totalTokens = usage?.total_tokens ?? 0;
    await this.prisma.aiUsageMetric.create({
      data: {
        organizationId: orgId,
        userId: actor.userId,
        provider,
        model: byokKey ? 'user-provided-model' : this.model,
        task: input.task,
        promptTokens,
        completionTokens,
        totalTokens,
        byok: isByok,
      },
    }).catch((err) => {
      this.logger.warn(`Failed to record AI usage metric: ${err.message}`);
    });

    let decisionRecordId: string | null = null;
    if (input.task === 'DECISION_RECOMMENDATION' && input.entity) {
      const record = await this.decisions.create({
        organizationId: orgId,
        workflowId: String(input.context?.workflowId ?? 'AI_DECISION_RECOMMENDATION'),
        actorId: actor.userId,
        entityType: input.entity.type,
        entityId: input.entity.id,
        recommendation: generated.content,
        rationale: this.toRationale(generated.structured),
        confidence: generated.confidence,
        evidenceRefs: input.evidenceRefs ?? [],
        result: requiresApproval ? 'AI_RECOMMENDATION_APPROVAL_REQUIRED' : 'AI_RECOMMENDATION_DRAFTED',
      });
      decisionRecordId = record.id;
    }

    const response: AiGatewayResponse = {
      id: randomUUID(),
      provider,
      model: provider === 'openai' ? this.model : 'mock-deterministic-v1',
      task: input.task,
      content: generated.content,
      structured: generated.structured,
      confidence: generated.confidence,
      requiresApproval,
      evidenceRefs: input.evidenceRefs ?? [],
      audit: {
        recorded: true,
        decisionRecordId,
      },
    };

    await this.auditLog.record({
      orgId,
      actorId: actor.userId,
      module: 'ai-gateway',
      action: 'AI_GATEWAY_GENERATED',
      entityType: input.entity?.type ?? 'AiGatewayRequest',
      entityId: input.entity?.id ?? response.id,
      result: 'SUCCESS',
      metadata: {
        responseId: response.id,
        task: input.task,
        provider,
        model: response.model,
        confidence: response.confidence,
        requiresApproval,
        decisionRecordId,
        evidenceRefs: input.evidenceRefs ?? [],
      },
    });

    return response;
  }

  async evaluate(orgId: string, actor: Actor, input: AiEvaluationRequest): Promise<AiEvaluationResponse> {
    if (!input.input || !input.output) {
      throw new BadRequestException('Evaluation input and output are required.');
    }

    const checks = [
      {
        id: 'content_present',
        passed: Boolean(input.output.content?.trim()),
        detail: 'Output must include non-empty content.',
      },
      {
        id: 'confidence_range',
        passed: typeof input.output.confidence === 'number' && input.output.confidence >= 0 && input.output.confidence <= 1,
        detail: 'Confidence must be between 0 and 1.',
      },
      {
        id: 'structured_object',
        passed: Boolean(input.output.structured && typeof input.output.structured === 'object' && !Array.isArray(input.output.structured)),
        detail: 'Structured output must be an object.',
      },
      {
        id: 'no_unapproved_autonomy',
        passed: !(input.input.riskLevel === 'HIGH' && input.output.confidence < 0.9),
        detail: 'High-risk outputs need high confidence or approval gates.',
      },
    ];
    const passedCount = checks.filter((check) => check.passed).length;
    const result = {
      passed: passedCount === checks.length,
      score: Math.round((passedCount / checks.length) * 100),
      checks,
    };

    await this.auditLog.record({
      orgId,
      actorId: actor.userId,
      module: 'ai-gateway',
      action: 'AI_GATEWAY_EVALUATED',
      entityType: input.input.entity?.type ?? 'AiEvaluation',
      entityId: input.input.entity?.id ?? input.task,
      result: result.passed ? 'SUCCESS' : 'FAILURE',
      metadata: {
        task: input.task,
        score: result.score,
        checks: result.checks,
      },
    });

    return result;
  }

  async classifyMaintenance(
    orgId: string,
    actor: Actor,
    input: MaintenanceClassificationRequest,
  ): Promise<MaintenanceClassificationResponse> {
    if (!input.title?.trim() && !input.description?.trim()) {
      throw new BadRequestException('Maintenance title or description is required.');
    }

    const prompt = [input.title, input.description].filter(Boolean).join('\n\n');
    const classification = this.classifyMaintenanceText(prompt);
    const gateway = await this.generate(orgId, actor, {
      task: 'MAINTENANCE_CLASSIFICATION',
      prompt,
      context: {
        source: input.source ?? 'OPERATOR',
        suggestedAction: classification.recommendedAction,
        riskFlags: [
          ...(classification.habitabilityRisk ? ['habitability'] : []),
          ...(classification.safetyRisk ? ['safety'] : []),
          ...(classification.emergency ? ['emergency'] : []),
        ],
      },
      entity: input.propertyId
        ? { type: 'Property', id: input.propertyId, label: input.unitId ? `Unit ${input.unitId}` : undefined }
        : undefined,
      evidenceRefs: [
        ...(input.propertyId ? [{ type: 'Property', id: input.propertyId, label: 'Property' }] : []),
        ...(input.unitId ? [{ type: 'Unit', id: input.unitId, label: 'Unit' }] : []),
        ...(input.tenantId ? [{ type: 'Tenant', id: input.tenantId, label: 'Tenant' }] : []),
      ],
      riskLevel: classification.emergency || classification.safetyRisk || classification.habitabilityRisk ? 'HIGH' : 'LOW',
    });

    return {
      ...classification,
      confidence: Math.max(classification.confidence, gateway.confidence),
      requiresApproval: classification.requiresApproval || gateway.requiresApproval,
      gatewayResponseId: gateway.id,
    };
  }

  async draftCommunication(
    orgId: string,
    actor: Actor,
    input: CommunicationDraftRequest,
  ): Promise<CommunicationDraftResponse> {
    const facts = input.facts?.map((fact) => fact.trim()).filter(Boolean) ?? [];
    const prompt = [input.prompt?.trim(), ...facts].filter(Boolean).join('\n');
    if (!prompt) {
      throw new BadRequestException('Communication prompt or facts are required.');
    }
    if (!input.audience) throw new BadRequestException('Communication audience is required.');
    if (!input.purpose) throw new BadRequestException('Communication purpose is required.');

    const risk = this.assessCommunicationRisk(input, prompt);
    const draft = this.buildCommunicationDraft(input, facts, prompt, risk);
    const gateway = await this.generate(orgId, actor, {
      task: 'COMMUNICATION_DRAFT',
      prompt,
      context: {
        audience: input.audience,
        channel: input.channel ?? 'EMAIL',
        purpose: input.purpose,
        suggestedAction: draft.subject,
        riskFlags: risk.riskFlags,
        complianceFlags: risk.complianceFlags,
        blockedAutoSend: risk.blockedAutoSend,
      },
      entity: input.entity,
      evidenceRefs: input.evidenceRefs,
      riskLevel: risk.requiresApproval ? 'HIGH' : 'LOW',
    });

    return {
      ...draft,
      confidence: Math.min(gateway.confidence, risk.requiresApproval ? 0.82 : 0.88),
      requiresApproval: risk.requiresApproval || gateway.requiresApproval,
      blockedAutoSend: risk.blockedAutoSend,
      recommendedApprovalReason: risk.recommendedApprovalReason,
      gatewayResponseId: gateway.id,
    };
  }

  async summarizeApplicationReview(
    orgId: string,
    actor: Actor,
    input: ApplicationReviewSummaryRequest,
  ): Promise<ApplicationReviewSummaryResponse> {
    const facts = input.facts?.map((fact) => fact.trim()).filter(Boolean) ?? [];
    const promptParts = [
      input.applicantName ? `Applicant: ${input.applicantName}` : undefined,
      input.monthlyRent != null ? `Monthly rent: ${input.monthlyRent}` : undefined,
      input.monthlyIncome != null ? `Monthly income: ${input.monthlyIncome}` : undefined,
      input.creditScore != null ? `Credit score: ${input.creditScore}` : undefined,
      input.screeningScore != null ? `Screening score: ${input.screeningScore}` : undefined,
      input.screeningPolicyVersion ? `Policy version: ${input.screeningPolicyVersion}` : undefined,
      input.status ? `Status: ${input.status}` : undefined,
      ...facts,
      ...(input.screeningReasons ?? []).map((reason) => `Screening reason: ${reason}`),
      ...(input.adverseActionReasons ?? []).map((reason) => `Adverse action reason: ${reason}`),
    ].filter(Boolean) as string[];

    if (!promptParts.length) {
      throw new BadRequestException('Application review facts are required.');
    }

    const review = this.buildApplicationReviewSummary(input);
    const gateway = await this.generate(orgId, actor, {
      task: 'APPLICATION_SUMMARY',
      prompt: promptParts.join('\n'),
      context: {
        suggestedAction: review.recommendedNextAction,
        riskFlags: review.riskFlags,
        complianceFlags: review.complianceFlags,
        recommendation: review.recommendation,
      },
      entity: input.applicationId ? { type: 'RentalApplication', id: input.applicationId } : undefined,
      evidenceRefs: input.evidenceRefs,
      riskLevel: 'HIGH',
    });

    return {
      ...review,
      confidence: Math.min(gateway.confidence, review.recommendation === 'NEEDS_MORE_INFO' ? 0.76 : 0.84),
      gatewayResponseId: gateway.id,
    };
  }

  async summarizeLeaseRisk(
    orgId: string,
    actor: Actor,
    input: LeaseRiskSummaryRequest,
  ): Promise<LeaseRiskSummaryResponse> {
    const facts = input.facts?.map((fact) => fact.trim()).filter(Boolean) ?? [];
    const clauseFacts = input.clauses?.map((clause) => `Clause ${clause.name}: ${clause.text}`) ?? [];
    const promptParts = [
      input.tenantName ? `Tenant: ${input.tenantName}` : undefined,
      input.leaseTemplateVersion ? `Lease template version: ${input.leaseTemplateVersion}` : undefined,
      input.jurisdiction?.state ? `State: ${input.jurisdiction.state}` : undefined,
      input.jurisdiction?.city ? `City: ${input.jurisdiction.city}` : undefined,
      input.startDate ? `Start date: ${input.startDate}` : undefined,
      input.endDate ? `End date: ${input.endDate}` : undefined,
      input.monthlyRent != null ? `Monthly rent: ${input.monthlyRent}` : undefined,
      input.securityDeposit != null ? `Security deposit: ${input.securityDeposit}` : undefined,
      input.petDeposit != null ? `Pet deposit: ${input.petDeposit}` : undefined,
      input.renewalDueAt ? `Renewal due: ${input.renewalDueAt}` : undefined,
      input.moveOutNoticeDate ? `Move-out notice date: ${input.moveOutNoticeDate}` : undefined,
      ...facts,
      ...clauseFacts,
    ].filter(Boolean) as string[];

    if (!promptParts.length) {
      throw new BadRequestException('Lease facts, terms, or clauses are required.');
    }

    const summary = this.buildLeaseRiskSummary(input);
    const gateway = await this.generate(orgId, actor, {
      task: 'LEASE_SUMMARY',
      prompt: promptParts.join('\n'),
      context: {
        suggestedAction: summary.recommendedNextAction,
        riskFlags: summary.riskFlags,
        complianceFlags: summary.complianceFlags,
      },
      entity: input.leaseId ? { type: 'Lease', id: input.leaseId } : undefined,
      evidenceRefs: input.evidenceRefs,
      riskLevel: summary.riskFlags.length || summary.missingInformation.length ? 'HIGH' : 'MEDIUM',
    });

    return {
      ...summary,
      confidence: Math.min(gateway.confidence, summary.riskFlags.length ? 0.82 : 0.86),
      gatewayResponseId: gateway.id,
    };
  }

  async draftRepairEstimate(
    orgId: string,
    actor: Actor,
    input: RepairEstimateDraftRequest,
  ): Promise<RepairEstimateDraftResponse> {
    if (!input.items?.length) {
      throw new BadRequestException('At least one repair estimate item is required.');
    }
    const prompt = [
      `Source: ${input.source ?? 'OPERATOR'}`,
      input.location ? `Location: ${input.location}` : undefined,
      ...(input.facts ?? []),
      ...input.items.map((item) => `${item.location ?? input.location ?? 'Unknown'}: ${item.description}`),
    ].filter(Boolean).join('\n');
    const draft = this.buildRepairEstimateDraft(input);
    const gateway = await this.generate(orgId, actor, {
      task: 'REPAIR_ESTIMATE',
      prompt,
      context: {
        suggestedAction: draft.recommendedNextAction,
        riskFlags: draft.riskFlags,
        totalEstimatedCost: draft.totalEstimatedCost,
      },
      entity: input.inspectionId
        ? { type: 'Inspection', id: input.inspectionId }
        : input.maintenanceRequestId
          ? { type: 'MaintenanceRequest', id: input.maintenanceRequestId }
          : undefined,
      evidenceRefs: input.evidenceRefs,
      riskLevel: draft.approvalRequired ? 'HIGH' : 'MEDIUM',
    });

    return {
      ...draft,
      confidence: Math.min(gateway.confidence, draft.riskFlags.length ? 0.82 : 0.86),
      gatewayResponseId: gateway.id,
    };
  }

  async categorizeBookkeepingTransaction(
    orgId: string,
    actor: Actor,
    input: BookkeepingCategorizationRequest,
  ): Promise<BookkeepingCategorizationResponse> {
    if (!input.description?.trim()) {
      throw new BadRequestException('Bookkeeping transaction description is required.');
    }
    if (typeof input.amount !== 'number' || Number.isNaN(input.amount)) {
      throw new BadRequestException('Bookkeeping transaction amount is required.');
    }
    const prompt = [
      input.date ? `Date: ${input.date}` : undefined,
      `Description: ${input.description}`,
      `Amount: ${input.amount}`,
      input.direction ? `Direction: ${input.direction}` : undefined,
      input.merchant ? `Merchant: ${input.merchant}` : undefined,
      input.existingCategory ? `Existing category: ${input.existingCategory}` : undefined,
      ...(input.facts ?? []),
    ].filter(Boolean).join('\n');
    const categorization = this.buildBookkeepingCategorization(input);
    const gateway = await this.generate(orgId, actor, {
      task: 'BOOKKEEPING_CATEGORIZATION',
      prompt,
      context: {
        suggestedAction: categorization.recommendedNextAction,
        riskFlags: categorization.riskFlags,
        suggestedAccount: categorization.suggestedAccount,
      },
      entity: input.transactionId ? { type: 'BookkeepingTransaction', id: input.transactionId } : undefined,
      evidenceRefs: input.evidenceRefs,
      riskLevel: categorization.reviewRequired ? 'HIGH' : 'MEDIUM',
    });

    return {
      ...categorization,
      confidence: Math.min(gateway.confidence, categorization.riskFlags.length ? 0.8 : 0.86),
      gatewayResponseId: gateway.id,
    };
  }

  async recommendDecision(
    orgId: string,
    actor: Actor,
    input: DecisionRecommendationRequest,
  ): Promise<DecisionRecommendationResponse> {
    if (!input.workflowId?.trim()) throw new BadRequestException('Decision workflow id is required.');
    if (!input.entity?.type || !input.entity?.id) throw new BadRequestException('Decision entity is required.');
    if (!input.signal?.title?.trim() || !input.signal?.summary?.trim()) {
      throw new BadRequestException('Decision signal title and summary are required.');
    }

    const recommendation = this.buildDecisionRecommendation(input);
    const prompt = [
      `Workflow: ${input.workflowId}`,
      `Decision type: ${input.decisionType}`,
      `Signal: ${input.signal.title}`,
      input.signal.summary,
      ...(input.facts ?? []),
      ...(input.options ?? []).map((option) => `Option ${option.id}: ${option.label}`),
      ...(input.policyFlags ?? []).map((flag) => `Policy flag: ${flag}`),
    ].join('\n');
    const gateway = await this.generate(orgId, actor, {
      task: 'DECISION_RECOMMENDATION',
      prompt,
      context: {
        workflowId: input.workflowId,
        suggestedAction: recommendation.recommendation,
        riskFlags: recommendation.riskFlags,
        approvalBlockers: recommendation.approvalBlockers,
        recommendedOptionId: recommendation.recommendedOptionId,
      },
      entity: input.entity,
      evidenceRefs: input.evidenceRefs,
      riskLevel: recommendation.requiresApproval ? 'HIGH' : 'MEDIUM',
    });

    return {
      ...recommendation,
      decisionRecordId: gateway.audit.decisionRecordId ?? null,
      confidence: Math.min(gateway.confidence, recommendation.requiresApproval ? 0.78 : 0.84),
      gatewayResponseId: gateway.id,
    };
  }

  private validateRequest(input: AiGatewayRequest) {
    if (!input.task) throw new BadRequestException('AI task is required.');
    if (!input.prompt?.trim()) throw new BadRequestException('AI prompt is required.');
    if (input.prompt.length > 8_000) throw new BadRequestException('AI prompt exceeds maximum length.');
  }

  private async generateWithAI(input: AiGatewayRequest) {
    const systemPrompt = 'You are an auditable property-management AI gateway. Return concise, compliance-aware recommendations. Never claim legal advice.';
    const userContent = JSON.stringify({
      task: input.task,
      prompt: input.prompt,
      context: input.context ?? {},
      evidenceRefs: input.evidenceRefs ?? [],
    });

    const response = await this.aiProvider.complete({
      systemPrompt,
      messages: [{ role: 'user' as const, content: userContent }],
      maxTokens: Math.min(Math.max(input.maxTokens ?? 600, 100), 1200),
      temperature: 0.2,
    });

    const content = response.content.trim() || this.generateMock(input).content;
    return {
      content,
      structured: this.structuredForTask(input.task, content, input.context ?? {}),
      confidence: 0.78,
    };
  }

  private async generateWithOpenAi(input: AiGatewayRequest, client: OpenAI) {
    const response = await client.chat.completions.create({
      model: this.model,
      temperature: 0.2,
      max_tokens: Math.min(Math.max(input.maxTokens ?? 600, 100), 1_200),
      messages: [
        {
          role: 'system',
          content: 'You are an auditable property-management AI gateway. Return concise, compliance-aware recommendations. Never claim legal advice.',
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: input.task,
            prompt: input.prompt,
            context: input.context ?? {},
            evidenceRefs: input.evidenceRefs ?? [],
          }),
        },
      ],
    });

    const content = response.choices[0]?.message?.content?.trim() || this.generateMock(input).content;
    return {
      content,
      structured: this.structuredForTask(input.task, content, input.context ?? {}),
      confidence: 0.78,
      usage: response.usage,
    };
  }

  private generateMock(input: AiGatewayRequest) {
    const content = this.mockContent(input.task, input.prompt);
    return {
      content,
      structured: this.structuredForTask(input.task, content, input.context ?? {}),
      confidence: this.mockConfidence(input.task, input.prompt),
    };
  }

  private mockContent(task: AiGatewayTask, prompt: string) {
    const trimmed = prompt.trim();
    switch (task) {
      case 'MAINTENANCE_CLASSIFICATION':
        return `Classified maintenance request as ${this.includesAny(trimmed, ['leak', 'water', 'flood']) ? 'plumbing' : 'general'} with operator review recommended.`;
      case 'COMMUNICATION_DRAFT':
        return `Draft message: ${trimmed.slice(0, 220)}`;
      case 'LEASE_SUMMARY':
      case 'APPLICATION_SUMMARY':
        return `Summary: ${trimmed.slice(0, 260)}`;
      case 'REPAIR_ESTIMATE':
        return `Repair estimate draft prepared from scope: ${trimmed.slice(0, 220)}`;
      case 'BOOKKEEPING_CATEGORIZATION':
        return `Suggested bookkeeping category: ${this.includesAny(trimmed, ['plumbing', 'repair', 'maintenance']) ? 'Repairs and Maintenance' : 'Operating Expense'}.`;
      case 'DECISION_RECOMMENDATION':
      default:
        return `Recommended next action: ${trimmed.slice(0, 240)}`;
    }
  }

  private structuredForTask(task: AiGatewayTask, content: string, context: Record<string, unknown>) {
    return {
      task,
      summary: content,
      suggestedAction: context.suggestedAction ?? content,
      riskFlags: Array.isArray(context.riskFlags) ? context.riskFlags : [],
      generatedAt: new Date().toISOString(),
    };
  }

  private mockConfidence(task: AiGatewayTask, prompt: string) {
    const base = task === 'DECISION_RECOMMENDATION' ? 0.72 : 0.8;
    return Math.min(0.92, base + Math.min(prompt.length, 500) / 5_000);
  }

  private requiresApproval(task: AiGatewayTask, riskLevel = 'MEDIUM', confidence: number) {
    if (riskLevel === 'HIGH') return true;
    if (task === 'DECISION_RECOMMENDATION') return true;
    return confidence < 0.75;
  }

  private toRationale(structured: Record<string, unknown>) {
    return [
      typeof structured.summary === 'string' ? structured.summary : 'AI recommendation generated.',
      `Task: ${String(structured.task ?? 'unknown')}`,
    ];
  }

  private includesAny(value: string, needles: string[]) {
    const lower = value.toLowerCase();
    return needles.some((needle) => lower.includes(needle));
  }

  private assessCommunicationRisk(input: CommunicationDraftRequest, prompt: string) {
    const lower = `${input.purpose} ${input.audience} ${prompt}`.toLowerCase();
    const riskFlags: string[] = [];
    const complianceFlags: string[] = [];
    const add = (list: string[], value: string) => {
      if (!list.includes(value)) list.push(value);
    };

    if (this.includesAny(lower, ['eviction', 'notice to quit', 'pay or quit', 'terminate tenancy', 'legal notice', 'court'])) {
      add(riskFlags, 'LEGAL_NOTICE');
      add(complianceFlags, 'KANSAS_LEGAL_NOTICE_REVIEW');
    }
    if (input.purpose === 'ADVERSE_ACTION' || this.includesAny(lower, ['deny', 'denied', 'rejected', 'adverse action', 'credit report', 'background check'])) {
      add(riskFlags, 'ADVERSE_ACTION');
      add(complianceFlags, 'ADVERSE_ACTION_REVIEW');
    }
    if (this.includesAny(lower, ['reasonable accommodation', 'disability', 'service animal', 'children', 'familial', 'race', 'religion', 'national origin', 'sex'])) {
      add(riskFlags, 'FAIR_HOUSING_SENSITIVE');
      add(complianceFlags, 'FAIR_HOUSING_REVIEW');
    }
    if (input.purpose === 'LEGAL_NOTICE') {
      add(riskFlags, 'LEGAL_NOTICE');
      add(complianceFlags, 'KANSAS_LEGAL_NOTICE_REVIEW');
    }

    const externalAudience = input.audience !== 'INTERNAL';
    const requiresApproval = riskFlags.length > 0 || input.purpose === 'PAYMENT_REMINDER' || input.purpose === 'APPLICATION_UPDATE';
    const blockedAutoSend = externalAudience;
    return {
      riskFlags,
      complianceFlags,
      requiresApproval,
      blockedAutoSend,
      recommendedApprovalReason: requiresApproval
        ? riskFlags.length > 0
          ? `Review required for ${riskFlags.join(', ')} content before sending.`
          : 'Operator review required before sending external payment or application communications.'
        : undefined,
    };
  }

  private buildCommunicationDraft(
    input: CommunicationDraftRequest,
    facts: string[],
    prompt: string,
    risk: { riskFlags: string[]; complianceFlags: string[] },
  ): Omit<CommunicationDraftResponse, 'confidence' | 'requiresApproval' | 'blockedAutoSend' | 'recommendedApprovalReason' | 'gatewayResponseId'> {
    const channel = input.channel ?? 'EMAIL';
    const tone = input.tone ?? 'NEUTRAL';
    const subjectByPurpose: Record<CommunicationDraftRequest['purpose'], string> = {
      MAINTENANCE_ACK: 'Maintenance request received',
      PAYMENT_REMINDER: 'Account balance reminder',
      APPLICATION_UPDATE: 'Application status update',
      RENEWAL_FOLLOW_UP: 'Renewal follow-up',
      OWNER_STATEMENT: 'Owner statement ready for review',
      VENDOR_COORDINATION: 'Work order coordination',
      LEGAL_NOTICE: 'Draft notice for review',
      ADVERSE_ACTION: 'Draft application communication for review',
      GENERAL: 'Property management update',
    };
    const sanitizedFacts = facts.length ? facts.slice(0, 5) : [prompt.slice(0, 240)];
    const opener = tone === 'FRIENDLY' ? 'Hi,' : 'Hello,';
    const bodyByPurpose: Record<CommunicationDraftRequest['purpose'], string> = {
      MAINTENANCE_ACK: `${opener}\n\nThanks for reporting this maintenance item. We have received the request and are reviewing the details so we can determine the next step.\n\nKnown details:\n${this.formatFacts(sanitizedFacts)}\n\nWe will follow up with scheduling or access instructions as soon as they are available.`,
      PAYMENT_REMINDER: `${opener}\n\nOur records show an account balance that may need attention. Please review your ledger and contact the office if you believe anything is incorrect or if you need to discuss available options.\n\nKnown details:\n${this.formatFacts(sanitizedFacts)}`,
      APPLICATION_UPDATE: `${opener}\n\nWe are writing with an update about your rental application. The team is reviewing the application materials under the same criteria used for all applicants.\n\nKnown details:\n${this.formatFacts(sanitizedFacts)}\n\nWe will provide the next approved update when review is complete.`,
      RENEWAL_FOLLOW_UP: `${opener}\n\nWe are following up about the upcoming lease renewal window. Please review the renewal details and let us know whether you have questions before the response deadline.\n\nKnown details:\n${this.formatFacts(sanitizedFacts)}`,
      OWNER_STATEMENT: `${opener}\n\nYour owner statement is ready for review. Please review the posted activity and contact the management team with any questions before distribution processing.\n\nKnown details:\n${this.formatFacts(sanitizedFacts)}`,
      VENDOR_COORDINATION: `${opener}\n\nWe are coordinating a work order and need confirmation of availability, scope, and access requirements.\n\nKnown details:\n${this.formatFacts(sanitizedFacts)}`,
      LEGAL_NOTICE: `${opener}\n\nDraft notice content has been prepared for internal review only. Please verify Kansas notice requirements and approved language before any delivery.\n\nKnown details:\n${this.formatFacts(sanitizedFacts)}`,
      ADVERSE_ACTION: `${opener}\n\nDraft application communication has been prepared for review only. Please verify adverse action requirements, source disclosures, and approved language before any delivery.\n\nKnown details:\n${this.formatFacts(sanitizedFacts)}`,
      GENERAL: `${opener}\n\nWe are writing with an update from the property management team.\n\nKnown details:\n${this.formatFacts(sanitizedFacts)}`,
    };

    const body = `${bodyByPurpose[input.purpose]}\n\nThis draft is not legal advice and should be reviewed before sending.`;
    return {
      subject: subjectByPurpose[input.purpose],
      body,
      smsBody: channel === 'SMS' ? body.replace(/\s+/g, ' ').slice(0, 300) : undefined,
      audience: input.audience,
      channel,
      purpose: input.purpose,
      riskFlags: risk.riskFlags,
      complianceFlags: risk.complianceFlags,
    };
  }

  private formatFacts(facts: string[]) {
    return facts.map((fact) => `- ${fact}`).join('\n');
  }

  private buildApplicationReviewSummary(input: ApplicationReviewSummaryRequest): Omit<ApplicationReviewSummaryResponse, 'confidence' | 'gatewayResponseId'> {
    const objectiveSignals: ApplicationReviewSummaryResponse['objectiveSignals'] = [];
    const missingInformation: string[] = [];
    const riskFlags: string[] = [];
    const complianceFlags = ['FAIR_HOUSING_REVIEW', 'SCREENING_POLICY_REVIEW'];
    const addSignal = (label: string, value: string | number | boolean, severity: 'INFO' | 'WARNING' | 'BLOCKER' = 'INFO') => {
      objectiveSignals.push({ label, value, severity });
    };
    const addRisk = (flag: string) => {
      if (!riskFlags.includes(flag)) riskFlags.push(flag);
    };
    const addCompliance = (flag: string) => {
      if (!complianceFlags.includes(flag)) complianceFlags.push(flag);
    };

    if (!input.screeningPolicyVersion) missingInformation.push('Screening policy version');
    if (input.monthlyRent == null) missingInformation.push('Monthly rent');
    if (input.monthlyIncome == null) missingInformation.push('Monthly income');
    if (input.creditScore == null && input.screeningScore == null) missingInformation.push('Credit score or screening score');

    const incomeToRentRatio = input.monthlyRent && input.monthlyIncome ? Number((input.monthlyIncome / input.monthlyRent).toFixed(2)) : null;
    if (incomeToRentRatio != null) {
      addSignal('incomeToRentRatio', incomeToRentRatio, incomeToRentRatio < 3 ? 'WARNING' : 'INFO');
      if (incomeToRentRatio < 3) addRisk('INCOME_POLICY_REVIEW');
    }
    if (input.creditScore != null) {
      addSignal('creditScore', input.creditScore, input.creditScore < 620 ? 'WARNING' : 'INFO');
      if (input.creditScore < 620) addRisk('CREDIT_POLICY_REVIEW');
    }
    if (input.screeningScore != null) {
      addSignal('screeningScore', input.screeningScore, input.screeningScore < 70 ? 'WARNING' : 'INFO');
      if (input.screeningScore < 70) addRisk('SCREENING_SCORE_REVIEW');
    }
    if (input.accommodationRequested) {
      addSignal('accommodationRequested', true, 'BLOCKER');
      addRisk('FAIR_HOUSING_SENSITIVE');
      addCompliance('ACCOMMODATION_REVIEW');
    }
    if (input.adverseActionReasons?.length) {
      addRisk('ADVERSE_ACTION');
      addCompliance('ADVERSE_ACTION_REVIEW');
      addSignal('adverseActionReasonsPresent', true, 'BLOCKER');
    }
    if (input.screeningReasons?.length) {
      addSignal('screeningReasons', input.screeningReasons.length, 'INFO');
    }
    if (missingInformation.length) {
      addRisk('INCOMPLETE_APPLICATION_RECORD');
      addSignal('missingInformationCount', missingInformation.length, 'BLOCKER');
    }

    let recommendation: ApplicationReviewSummaryResponse['recommendation'] = 'APPROVE_REVIEW';
    if (missingInformation.length) {
      recommendation = 'NEEDS_MORE_INFO';
    } else if (input.adverseActionReasons?.length || (input.creditScore != null && input.creditScore < 580) || (input.screeningScore != null && input.screeningScore < 60)) {
      recommendation = 'DENIAL_REVIEW';
    } else if (riskFlags.length) {
      recommendation = 'CONDITIONAL_REVIEW';
    }

    const nextActionByRecommendation: Record<ApplicationReviewSummaryResponse['recommendation'], string> = {
      APPROVE_REVIEW: 'Review objective signals and policy version before approving or converting to lease.',
      CONDITIONAL_REVIEW: 'Review policy fit and any fair-housing-sensitive facts before issuing a conditional decision.',
      DENIAL_REVIEW: 'Route to adverse-action review and verify reason codes, report sources, and template version before any applicant communication.',
      NEEDS_MORE_INFO: 'Request or attach missing application evidence before making a disposition.',
    };
    const applicant = input.applicantName ?? 'The applicant';
    const summary = `${applicant} has ${objectiveSignals.length} objective screening signal(s), ${missingInformation.length} missing item(s), and ${riskFlags.length} review flag(s). This is a review aid only and cannot make the final application decision.`;

    return {
      summary,
      recommendation,
      recommendedNextAction: nextActionByRecommendation[recommendation],
      incomeToRentRatio,
      objectiveSignals,
      missingInformation,
      riskFlags,
      complianceFlags,
      requiresApproval: true,
      blockedAutoDecision: true,
      approvalReason: 'Application disposition, adverse action, and fair-housing-sensitive decisions require human approval.',
    };
  }

  private buildLeaseRiskSummary(input: LeaseRiskSummaryRequest): Omit<LeaseRiskSummaryResponse, 'confidence' | 'gatewayResponseId'> {
    const keyTerms: LeaseRiskSummaryResponse['keyTerms'] = [
      { label: 'state', value: input.jurisdiction?.state ?? null },
      { label: 'leaseTemplateVersion', value: input.leaseTemplateVersion ?? null },
      { label: 'startDate', value: input.startDate ?? null },
      { label: 'endDate', value: input.endDate ?? null },
      { label: 'monthlyRent', value: input.monthlyRent ?? null },
      { label: 'securityDeposit', value: input.securityDeposit ?? null },
      { label: 'petDeposit', value: input.petDeposit ?? null },
      { label: 'furnished', value: input.furnished ?? null },
      { label: 'petsAllowed', value: input.petsAllowed ?? null },
    ];
    const missingInformation: string[] = [];
    const riskFlags: string[] = [];
    const complianceFlags = ['LEASE_TEMPLATE_REVIEW', 'KANSAS_LEASE_REVIEW'];
    const blockedActions = [
      'APPROVE_LEASE_TEMPLATE',
      'CHANGE_LEGAL_TERMS',
      'SEND_LEGAL_NOTICE',
      'APPROVE_NON_RENEWAL',
      'APPROVE_DEPOSIT_DEDUCTION',
    ];
    const addRisk = (flag: string) => {
      if (!riskFlags.includes(flag)) riskFlags.push(flag);
    };
    const addCompliance = (flag: string) => {
      if (!complianceFlags.includes(flag)) complianceFlags.push(flag);
    };

    if (!input.leaseTemplateVersion) missingInformation.push('Lease template version');
    if (!input.jurisdiction?.state) missingInformation.push('State jurisdiction');
    if (!input.startDate) missingInformation.push('Lease start date');
    if (!input.endDate) missingInformation.push('Lease end date');
    if (input.monthlyRent == null) missingInformation.push('Monthly rent');
    if (input.securityDeposit == null) missingInformation.push('Security deposit');

    const isKansas = (input.jurisdiction?.state ?? '').toUpperCase() === 'KS' || (input.jurisdiction?.state ?? '').toLowerCase() === 'kansas';
    const baseDepositCap = input.monthlyRent != null ? input.monthlyRent * (input.furnished ? 1.5 : 1) : null;
    const petDepositAllowance = input.monthlyRent != null && input.petsAllowed ? input.monthlyRent * 0.5 : 0;
    const depositCap = baseDepositCap != null ? baseDepositCap + petDepositAllowance : null;
    const totalDeposit = (input.securityDeposit ?? 0) + (input.petDeposit ?? 0);

    if (isKansas && depositCap != null && input.securityDeposit != null && totalDeposit > depositCap) {
      addRisk('KANSAS_DEPOSIT_CAP_REVIEW');
      addCompliance('KSA_58_2550_DEPOSIT_CAP_REVIEW');
    }

    const clauseText = (input.clauses ?? []).map((clause) => `${clause.name} ${clause.text}`).join(' ').toLowerCase();
    if (this.includesAny(clauseText, ['waive landlord duty', 'waives landlord duty', 'tenant waives habitability', 'self-help eviction', 'lockout', 'utility shutoff'])) {
      addRisk('POTENTIALLY_PROHIBITED_CLAUSE');
      addCompliance('COUNSEL_REVIEW_REQUIRED');
    }
    if (this.includesAny(clauseText, ['non-renewal', 'notice to quit', 'eviction', 'termination notice'])) {
      addRisk('LEGAL_NOTICE_RELATED_CLAUSE');
      addCompliance('KANSAS_LEGAL_NOTICE_REVIEW');
    }
    if (missingInformation.length) addRisk('INCOMPLETE_LEASE_RECORD');

    const summary = `Lease review aid for ${input.tenantName ?? 'tenant'} includes ${keyTerms.length} key term(s), ${missingInformation.length} missing item(s), and ${riskFlags.length} review flag(s). AI cannot approve lease terms or legal notices.`;
    const recommendedNextAction = riskFlags.length || missingInformation.length
      ? 'Resolve missing lease data and route flagged terms to operator or counsel review before signing, renewal, non-renewal, or notice workflows.'
      : 'Review key terms against the approved template version before continuing lease signing or renewal workflow.';

    return {
      summary,
      keyTerms,
      riskFlags,
      complianceFlags,
      missingInformation,
      blockedActions,
      recommendedNextAction,
      requiresApproval: true,
      blockedAutoDecision: true,
      approvalReason: 'Lease terms, renewals, non-renewals, notices, and deposit decisions require human approval.',
    };
  }

  private buildRepairEstimateDraft(input: RepairEstimateDraftRequest): Omit<RepairEstimateDraftResponse, 'confidence' | 'gatewayResponseId'> {
    const laborRate = input.laborRate ?? 85;
    const riskFlags: string[] = [];
    const assumptions = [
      `Labor rate estimated at $${laborRate}/hour unless a vendor quote overrides it.`,
      'Material costs are planning estimates and require operator/vendor review.',
      'Photos, measurements, access constraints, and local pricing may change final cost.',
    ];
    const addRisk = (flag: string) => {
      if (!riskFlags.includes(flag)) riskFlags.push(flag);
    };
    const lineItems = input.items.map((item) => {
      const text = `${item.category ?? ''} ${item.issueType ?? ''} ${item.description}`.toLowerCase();
      const severity = item.severity ?? (this.includesAny(text, ['active leak', 'mold', 'sewage', 'electrical', 'smoke', 'gas', 'no heat']) ? 'HIGH' : 'MEDIUM');
      const trade = this.estimateTrade(text);
      const replace = this.includesAny(text, ['replace', 'missing', 'broken beyond', 'failed', 'not working']);
      const evaluate = this.includesAny(text, ['mold', 'structural', 'foundation', 'electrical panel', 'gas']);
      const laborHours = severity === 'HIGH' ? (replace ? 4 : 3) : severity === 'LOW' ? 1 : replace ? 2.5 : 1.5;
      const materialCost = this.estimateMaterialCost(text, severity, replace);
      const laborCost = Math.round(laborHours * laborRate);
      const totalCost = laborCost + materialCost;
      if (severity === 'HIGH') addRisk('HIGH_SEVERITY_REPAIR');
      if (this.includesAny(text, ['mold', 'sewage', 'no heat', 'no water', 'active leak'])) addRisk('HABITABILITY_REVIEW');
      if (this.includesAny(text, ['gas', 'smoke', 'electrical', 'exposed wire', 'lockout'])) addRisk('SAFETY_REVIEW');
      return {
        location: item.location ?? input.location ?? 'Unspecified',
        description: item.description,
        trade,
        laborHours,
        laborCost,
        materialCost,
        totalCost,
        repairOrReplace: evaluate ? 'EVALUATE' as const : replace ? 'REPLACE' as const : 'REPAIR' as const,
      };
    });
    const totalLaborHours = Number(lineItems.reduce((sum, item) => sum + item.laborHours, 0).toFixed(1));
    const totalLaborCost = lineItems.reduce((sum, item) => sum + item.laborCost, 0);
    const totalMaterialCost = lineItems.reduce((sum, item) => sum + item.materialCost, 0);
    const totalEstimatedCost = totalLaborCost + totalMaterialCost;
    const threshold = input.vendorThreshold ?? 500;
    if (totalEstimatedCost >= threshold) addRisk('VENDOR_APPROVAL_THRESHOLD');
    const approvalRequired = riskFlags.length > 0 || totalEstimatedCost >= threshold;
    const blockedAutoActions = ['APPROVE_ESTIMATE', 'CREATE_WORK_ORDER', 'DISPATCH_VENDOR', 'BILL_TENANT', 'APPLY_DEPOSIT_DEDUCTION'];
    return {
      summary: `Draft repair estimate includes ${lineItems.length} line item(s), ${totalLaborHours} labor hour(s), and estimated cost of $${totalEstimatedCost}.`,
      lineItems,
      totalLaborHours,
      totalLaborCost,
      totalMaterialCost,
      totalEstimatedCost,
      costRange: {
        low: Math.round(totalEstimatedCost * 0.85),
        high: Math.round(totalEstimatedCost * 1.25),
      },
      assumptions,
      riskFlags,
      approvalRequired,
      blockedAutoActions,
      recommendedNextAction: approvalRequired
        ? 'Route estimate to operator review before approving spend, creating work orders, dispatching vendors, billing tenants, or applying deposit deductions.'
        : 'Review estimate assumptions before approving or converting to a repair request.',
    };
  }

  private estimateTrade(text: string) {
    if (this.includesAny(text, ['leak', 'toilet', 'sink', 'drain', 'sewage', 'pipe'])) return 'plumber';
    if (this.includesAny(text, ['electrical', 'outlet', 'breaker', 'wire', 'smoke detector'])) return 'electrician';
    if (this.includesAny(text, ['heat', 'ac', 'hvac', 'furnace'])) return 'HVAC technician';
    if (this.includesAny(text, ['lock', 'door', 'window'])) return 'locksmith or carpenter';
    if (this.includesAny(text, ['paint', 'drywall', 'wall', 'ceiling'])) return 'painter or drywall technician';
    return 'general contractor';
  }

  private estimateMaterialCost(text: string, severity: 'LOW' | 'MEDIUM' | 'HIGH', replace: boolean) {
    if (this.includesAny(text, ['water heater', 'furnace', 'ac unit', 'appliance'])) return replace ? 900 : 250;
    if (this.includesAny(text, ['toilet', 'sink', 'faucet', 'garbage disposal'])) return replace ? 250 : 75;
    if (this.includesAny(text, ['door', 'window', 'lock'])) return replace ? 300 : 90;
    if (this.includesAny(text, ['drywall', 'paint', 'ceiling'])) return severity === 'HIGH' ? 180 : 80;
    return severity === 'HIGH' ? 150 : severity === 'LOW' ? 35 : 75;
  }

  private buildBookkeepingCategorization(input: BookkeepingCategorizationRequest): Omit<BookkeepingCategorizationResponse, 'confidence' | 'gatewayResponseId'> {
    const amount = Math.abs(input.amount);
    const text = `${input.description} ${input.merchant ?? ''} ${input.existingCategory ?? ''}`.toLowerCase();
    const direction = input.direction ?? (input.amount >= 0 ? 'INFLOW' : 'OUTFLOW');
    const account = this.pickBookkeepingAccount(text, direction, input.chartOfAccounts);
    const riskFlags: string[] = [];
    const addRisk = (flag: string) => {
      if (!riskFlags.includes(flag)) riskFlags.push(flag);
    };

    if (!input.propertyId) addRisk('MISSING_PROPERTY_MAPPING');
    if (account.code === '9000') addRisk('SUSPENSE_REVIEW');
    if (amount >= 2500) addRisk('HIGH_DOLLAR_REVIEW');
    if (this.includesAny(text, ['refund', 'reversal', 'chargeback', 'dispute'])) addRisk('PAYMENT_EXCEPTION_REVIEW');
    if (this.includesAny(text, ['owner distribution', 'owner draw', 'payout to owner'])) addRisk('OWNER_DISTRIBUTION_REVIEW');
    if (this.includesAny(text, ['deposit', 'security deposit'])) addRisk('DEPOSIT_LIABILITY_REVIEW');

    const alternateAccounts = this.alternateBookkeepingAccounts(account.code, direction, input.chartOfAccounts);
    const reviewRequired = riskFlags.length > 0 || account.code === '9000';
    const blockedAutoActions = [
      'CATEGORIZE_TRANSACTION',
      'POST_JOURNAL_ENTRY',
      'CONFIRM_RECONCILIATION',
      'LOCK_MONTHLY_CLOSE',
      'EXPORT_TO_QUICKBOOKS',
    ];
    const reconciliationHints = [
      input.transactionId ? `Review source transaction ${input.transactionId}.` : 'Attach source transaction id before reconciliation.',
      input.propertyId ? `Property mapping present: ${input.propertyId}.` : 'Property mapping is required before close.',
      'Compare against Stripe payout, invoice, receipt, or bank statement evidence before confirming.',
    ];
    return {
      summary: `Suggested ${account.name} (${account.code}) for ${direction.toLowerCase()} transaction of $${amount.toFixed(2)}.`,
      suggestedAccount: account,
      alternateAccounts,
      allocationSuggestion: [{ accountCode: account.code, percent: 100, amount }],
      riskFlags,
      reviewRequired,
      blockedAutoActions,
      reconciliationHints,
      quickBooksMappingRequired: true,
      recommendedNextAction: reviewRequired
        ? 'Route to accounting review before categorization, journal posting, reconciliation confirmation, monthly close, or QuickBooks export.'
        : 'Review suggested account and property mapping before accepting categorization.',
    };
  }

  private pickBookkeepingAccount(
    text: string,
    direction: 'INFLOW' | 'OUTFLOW',
    chart?: Array<{ code: string; name: string; type: string }>,
  ) {
    const defaults = [
      { code: '4000', name: 'Rental Income', type: 'INCOME' },
      { code: '4100', name: 'Fee Income', type: 'INCOME' },
      { code: '2000', name: 'Security Deposit Liability', type: 'LIABILITY' },
      { code: '5000', name: 'Repairs and Maintenance', type: 'EXPENSE' },
      { code: '5100', name: 'Utilities', type: 'EXPENSE' },
      { code: '5200', name: 'Insurance', type: 'EXPENSE' },
      { code: '5300', name: 'Property Taxes', type: 'EXPENSE' },
      { code: '5400', name: 'Management Fees', type: 'EXPENSE' },
      { code: '9000', name: 'Suspense / Uncategorized', type: 'EXPENSE' },
    ];
    const source = chart?.length ? chart : defaults;
    const find = (code: string) => source.find((account) => account.code === code) ?? defaults.find((account) => account.code === code)!;
    if (this.includesAny(text, ['security deposit', 'deposit held', 'tenant deposit'])) return find('2000');
    if (direction === 'INFLOW' && this.includesAny(text, ['rent', 'lease payment', 'tenant payment'])) return find('4000');
    if (direction === 'INFLOW' && this.includesAny(text, ['late fee', 'application fee', 'fee'])) return find('4100');
    if (this.includesAny(text, ['plumb', 'repair', 'maintenance', 'vendor', 'drywall', 'hvac', 'electric'])) return find('5000');
    if (this.includesAny(text, ['water bill', 'electric bill', 'gas bill', 'utility'])) return find('5100');
    if (this.includesAny(text, ['insurance', 'premium'])) return find('5200');
    if (this.includesAny(text, ['tax', 'county treasurer'])) return find('5300');
    if (this.includesAny(text, ['management fee', 'leasing fee'])) return find('5400');
    return find('9000');
  }

  private alternateBookkeepingAccounts(
    selectedCode: string,
    direction: 'INFLOW' | 'OUTFLOW',
    chart?: Array<{ code: string; name: string; type: string }>,
  ) {
    const fallback = direction === 'INFLOW'
      ? [
        { code: '4000', name: 'Rental Income', type: 'INCOME' },
        { code: '4100', name: 'Fee Income', type: 'INCOME' },
        { code: '2000', name: 'Security Deposit Liability', type: 'LIABILITY' },
      ]
      : [
        { code: '5000', name: 'Repairs and Maintenance', type: 'EXPENSE' },
        { code: '5100', name: 'Utilities', type: 'EXPENSE' },
        { code: '9000', name: 'Suspense / Uncategorized', type: 'EXPENSE' },
      ];
    const source = (chart?.length ? chart : fallback).filter((account) => account.code !== selectedCode).slice(0, 3);
    return source.map((account) => ({
      ...account,
      reason: 'Alternative account for accountant review if source evidence changes.',
    }));
  }

  private buildDecisionRecommendation(input: DecisionRecommendationRequest): Omit<DecisionRecommendationResponse, 'decisionRecordId' | 'confidence' | 'gatewayResponseId'> {
    const priority = input.signal.priority ?? 'MEDIUM';
    const policyFlags = input.policyFlags ?? [];
    const riskFlags: string[] = [];
    const approvalBlockers: string[] = [];
    const addRisk = (flag: string) => {
      if (!riskFlags.includes(flag)) riskFlags.push(flag);
    };
    const addBlocker = (blocker: string) => {
      if (!approvalBlockers.includes(blocker)) approvalBlockers.push(blocker);
    };

    if (priority === 'CRITICAL' || priority === 'HIGH') addRisk('HIGH_PRIORITY_SIGNAL');
    for (const flag of policyFlags) addRisk(flag);
    if (['DELINQUENCY_FOLLOW_UP', 'PAYMENT_EXCEPTION'].includes(input.decisionType)) {
      addRisk('FINANCIAL_DECISION');
      addBlocker('Payment plans, notices, refunds, reversals, and write-offs require approval.');
    }
    if (input.decisionType === 'APPLICATION_REVIEW') {
      addRisk('FAIR_HOUSING_REVIEW');
      addBlocker('Application dispositions and adverse-action communications require approval.');
    }
    if (['RENEWAL_REVIEW'].includes(input.decisionType)) {
      addRisk('LEASE_DECISION');
      addBlocker('Renewal, non-renewal, and lease-term changes require approval.');
    }
    if (['MAINTENANCE_TRIAGE', 'INSPECTION_ACTION'].includes(input.decisionType)) {
      addRisk('OPERATIONAL_REVIEW');
      addBlocker('Vendor dispatch, estimate approval, and tenant/deposit billing require approval.');
    }
    if (input.decisionType === 'ACCOUNTING_REVIEW') {
      addRisk('ACCOUNTING_REVIEW');
      addBlocker('Journal posting, reconciliation confirmation, monthly close, and QuickBooks export require approval.');
    }

    const selected = input.options?.find((option) => option.riskLevel !== 'HIGH') ?? input.options?.[0] ?? null;
    const blockedAutoActions = [
      'EXECUTE_WORKFLOW_ACTION',
      'SEND_EXTERNAL_MESSAGE',
      'POST_ACCOUNTING_ENTRY',
      'DISPATCH_VENDOR',
      'APPROVE_LEASE_OR_APPLICATION',
      'SEND_LEGAL_OR_ADVERSE_NOTICE',
    ];
    const requiresApproval = approvalBlockers.length > 0 || riskFlags.length > 0;
    const recommendation = selected
      ? `Recommend operator review of "${selected.label}" for ${input.signal.title}.`
      : `Recommend operator review for ${input.signal.title}.`;

    return {
      recommendation,
      recommendedOptionId: selected?.id ?? null,
      rationale: [
        input.signal.summary,
        `Priority: ${priority}.`,
        riskFlags.length ? `Risk flags: ${riskFlags.join(', ')}.` : 'No high-risk policy flags were supplied.',
      ],
      riskFlags,
      approvalBlockers,
      blockedAutoActions,
      requiresApproval,
    };
  }

  private classifyMaintenanceText(text: string): Omit<MaintenanceClassificationResponse, 'gatewayResponseId'> {
    const lower = text.toLowerCase();
    const has = (words: string[]) => words.some((word) => lower.includes(word));
    const safetyRisk = has(['gas', 'smoke', 'spark', 'electrical shock', 'exposed wire', 'carbon monoxide', 'break-in', 'broken lock']);
    const habitabilityRisk = has(['no heat', 'no water', 'no hot water', 'sewage', 'mold', 'flood', 'active leak', 'water leak']);
    const emergency = safetyRisk || has(['flood', 'gas leak', 'fire', 'sewage backup', 'cannot secure', 'no heat']);

    let category: MaintenanceClassificationResponse['category'] = 'GENERAL';
    let trade = 'general contractor';
    if (has(['leak', 'water', 'toilet', 'sink', 'drain', 'sewage', 'pipe'])) {
      category = 'PLUMBING';
      trade = 'plumber';
    } else if (has(['outlet', 'breaker', 'electrical', 'spark', 'wire', 'power'])) {
      category = 'ELECTRICAL';
      trade = 'electrician';
    } else if (has(['heat', 'air conditioner', 'ac ', 'a/c', 'hvac', 'furnace'])) {
      category = 'HVAC';
      trade = 'HVAC technician';
    } else if (has(['refrigerator', 'oven', 'stove', 'dishwasher', 'washer', 'dryer'])) {
      category = 'APPLIANCE';
      trade = 'appliance technician';
    } else if (has(['lock', 'key', 'door won', 'cannot secure', 'break-in'])) {
      category = 'LOCK_SECURITY';
      trade = 'locksmith';
    } else if (has(['pest', 'roach', 'bedbug', 'mouse', 'mice', 'rats'])) {
      category = 'PEST';
      trade = 'pest control';
    } else if (has(['roof', 'ceiling', 'wall', 'stairs', 'railing', 'foundation'])) {
      category = 'STRUCTURAL';
      trade = 'general contractor';
    } else if (has(['paint', 'cosmetic', 'touch up', 'scuff'])) {
      category = 'COSMETIC';
      trade = 'maintenance technician';
    }

    const priority: MaintenanceClassificationResponse['priority'] = emergency || habitabilityRisk || safetyRisk ? 'HIGH' : category === 'COSMETIC' ? 'LOW' : 'MEDIUM';
    const suggestedSlaHours = priority === 'HIGH' ? (emergency ? 4 : 24) : priority === 'MEDIUM' ? 72 : 168;
    const recommendedAction = emergency
      ? `Escalate immediately and dispatch a ${trade}; verify tenant safety and access instructions.`
      : priority === 'HIGH'
        ? `Route to urgent queue and schedule a ${trade} within ${suggestedSlaHours} hours.`
        : `Create work order for ${trade} review within ${suggestedSlaHours} hours.`;

    return {
      category,
      trade,
      priority,
      habitabilityRisk,
      safetyRisk,
      emergency,
      suggestedSlaHours,
      recommendedAction,
      tenantAcknowledgementDraft: `Thanks for reporting this. We classified it as ${priority.toLowerCase()} priority ${category.toLowerCase().replace('_', ' ')} and will follow up with next steps.`,
      confidence: emergency || category !== 'GENERAL' ? 0.86 : 0.72,
      requiresApproval: emergency || safetyRisk || habitabilityRisk,
      evidence: [
        { label: 'category', value: category },
        { label: 'priority', value: priority },
        { label: 'habitabilityRisk', value: habitabilityRisk },
        { label: 'safetyRisk', value: safetyRisk },
        { label: 'emergency', value: emergency },
      ],
    };
  }
}
