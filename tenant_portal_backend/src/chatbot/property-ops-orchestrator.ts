/**
 * Deterministic router for property ops requests.
 * Follows docs/agents/specs/Agent Spec 1 — Property Ops Orchestrator (Router).md.
 */

export type PropertyOpsRoute =
  | 'RepairEstimator'
  | 'MaintenanceTriage'
  | 'TenantComms'
  | 'LeaseUp'
  | 'Bookkeeping'
  | 'HumanEscalation';

export interface PropertyOpsOrchestratorInput {
  userMessage: string;
  propertyId?: string | null;
  tenantId?: string | null;
  workOrderId?: string | null;
  channel?: 'ui' | 'sms' | 'email' | 'internal';
}

export interface PropertyOpsOrchestratorResult {
  route_to: PropertyOpsRoute;
  reason: string;
  missing_inputs: string[];
  priority: 'low' | 'normal' | 'high' | 'urgent';
  recommended_next_action: string;
  handoff_payload: Record<string, any>;
}

const maintenanceKeywords = [
  'leak',
  'water',
  'flood',
  'sewage',
  'no heat',
  'no ac',
  'hvac',
  'electrical',
  'spark',
  'smell gas',
  'gas leak',
  'smoke',
  'alarm',
  'breaker',
  'toilet overflow',
  'overflow',
  'roof leak',
  'mold',
  'pest',
  'lock broken',
  'window broken',
  'broken window',
  'door will not lock',
];

const emergencySignals = [
  'smell gas',
  'gas leak',
  'gas odor',
  'smoke',
  'fire',
  'burning smell',
  'spark',
  'sparking',
  'active flooding',
  'water pouring',
  'water gushing',
  'co alarm',
  'carbon monoxide',
  'exposed wire',
  'electrical shock',
  'sewage',
  'sewage backup',
  'someone is hurt',
  'violence',
  'threat',
];

const estimateKeywords = ['estimate', 'cost', 'replace', 'materials', 'bid', 'price', 'scope'];
const tenantCommsKeywords = [
  'text tenant',
  'email tenant',
  'write notice',
  'respond to tenant',
  'late rent',
  'access notice',
  'policy reminder',
  'lease violation',
  'message tenant',
];
const leaseUpKeywords = ['vacancy', 'listing', 'lead response', 'showing', 'pre-screen', 'application', 'move-in'];
const bookkeepingKeywords = [
  'categorize expenses',
  'reconcile',
  'transactions',
  'p&l',
  'income report',
  'expense report',
  'receipt',
  'bookkeeping',
];
const legalHighRiskKeywords = ['eviction', 'court', 'legal', 'discrimination', 'harassment', 'restraining order'];

function includesAny(haystack: string, needles: string[]): boolean {
  return needles.some((needle) => haystack.includes(needle));
}

function collectDetectedSignals(haystack: string): string[] {
  const signals: string[] = [];
  if (includesAny(haystack, emergencySignals)) signals.push('emergency_indicator');
  if (includesAny(haystack, maintenanceKeywords)) signals.push('maintenance');
  if (includesAny(haystack, estimateKeywords)) signals.push('estimate');
  if (includesAny(haystack, tenantCommsKeywords)) signals.push('tenant_comms');
  if (includesAny(haystack, leaseUpKeywords)) signals.push('lease_up');
  if (includesAny(haystack, bookkeepingKeywords)) signals.push('bookkeeping');
  if (includesAny(haystack, legalHighRiskKeywords)) signals.push('legal_risk');
  return signals;
}

function missingInputsForRoute(route: PropertyOpsRoute): string[] {
  switch (route) {
    case 'MaintenanceTriage':
      return ['property_id_or_address_and_unit', 'when_it_started', 'can_water_or_power_be_shut_off_safely', 'photo_or_video', 'is_anyone_in_danger'];
    case 'RepairEstimator':
      return [
        'property_id_or_unit_context',
        'location_zip_or_city',
        'scope_details_dimensions_or_quantity',
        'model_numbers_if_applicable',
        'access_constraints',
        'photos_or_inspection_notes',
      ];
    case 'TenantComms':
      return ['tenant_id', 'desired_outcome', 'deadlines_or_dates', 'lease_clause_keys_if_relevant'];
    case 'LeaseUp':
      return ['unit_id', 'availability_date', 'rent_target', 'pet_policy', 'screening_criteria', 'showing_windows'];
    case 'Bookkeeping':
      return ['transactions_list_or_date_range', 'property_mapping_rules', 'chart_of_accounts'];
    default:
      return [];
  }
}

function recommendedNextAction(route: PropertyOpsRoute, priority: PropertyOpsOrchestratorResult['priority']): string {
  if (route === 'MaintenanceTriage' && priority === 'urgent') {
    return 'Escalate immediately; provide safety instructions and dispatch maintenance triage.';
  }
  switch (route) {
    case 'MaintenanceTriage':
      return 'Gather missing maintenance details and run MaintenanceTriage for severity and instructions.';
    case 'RepairEstimator':
      return 'Collect scope specifics and location, then run RepairEstimator for ranges with sources.';
    case 'TenantComms':
      return 'Gather tenant context and desired outcome, then draft in TenantComms (draft-only by default).';
    case 'LeaseUp':
      return 'Collect unit availability and criteria, then run LeaseUp to draft listing and showing options.';
    case 'Bookkeeping':
      return 'Fetch transactions and rules, then run Bookkeeping for categorization and summary.';
    case 'HumanEscalation':
      return 'Escalate to a human operator for review before proceeding.';
    default:
      return 'Proceed with the selected agent after gathering required inputs.';
  }
}

function determinePriority(message: string, route: PropertyOpsRoute, safetyFlags: string[]): PropertyOpsOrchestratorResult['priority'] {
  if (safetyFlags.length > 0) return 'urgent';
  if (route !== 'MaintenanceTriage') return 'normal';

  const highSignals = ['no heat', 'no power', 'no electricity', 'exterior door cannot lock', 'fridge down', 'refrigerator down', 'active leak'];
  if (includesAny(message, highSignals)) {
    return 'high';
  }
  return 'normal';
}

export function routePropertyOpsOrchestrator(input: PropertyOpsOrchestratorInput): PropertyOpsOrchestratorResult {
  const lowerMessage = input.userMessage.toLowerCase();
  const detectedSignals = collectDetectedSignals(lowerMessage);
  const safetyFlags = includesAny(lowerMessage, emergencySignals) ? ['emergency_indicator'] : [];

  let route: PropertyOpsRoute = 'HumanEscalation';

  if (safetyFlags.length > 0) {
    route = 'MaintenanceTriage';
  } else if (includesAny(lowerMessage, maintenanceKeywords)) {
    route = 'MaintenanceTriage';
  } else if (includesAny(lowerMessage, estimateKeywords)) {
    route = 'RepairEstimator';
  } else if (includesAny(lowerMessage, tenantCommsKeywords)) {
    route = 'TenantComms';
  } else if (includesAny(lowerMessage, leaseUpKeywords)) {
    route = 'LeaseUp';
  } else if (includesAny(lowerMessage, bookkeepingKeywords)) {
    route = 'Bookkeeping';
  }

  if (route !== 'HumanEscalation' && includesAny(lowerMessage, legalHighRiskKeywords)) {
    route = 'HumanEscalation';
  }

  const priority = determinePriority(lowerMessage, route, safetyFlags);
  const missing_inputs = missingInputsForRoute(route);
  const recommended_next_action = recommendedNextAction(route, priority);

  const handoff_payload: Record<string, any> = {
    user_message: input.userMessage,
    property_id: input.propertyId || undefined,
    tenant_id: input.tenantId || undefined,
    work_order_id: input.workOrderId || undefined,
    detected_signals: detectedSignals,
    safety_flags: safetyFlags,
  };

  if (route === 'TenantComms') {
    handoff_payload.mode = 'draft_only';
  }
  if (route === 'MaintenanceTriage' && safetyFlags.length > 0) {
    handoff_payload.human_escalation = true;
  }

  const reasonMap: Record<PropertyOpsRoute, string> = {
    MaintenanceTriage: 'Maintenance-related request needs triage, severity, and next-step guidance.',
    RepairEstimator: 'User is asking for cost or scope guidance for a defined repair.',
    TenantComms: 'User wants a tenant-facing message drafted.',
    LeaseUp: 'Request relates to listing/showings/lease-up workflows.',
    Bookkeeping: 'Request relates to expenses, reconciliation, or financial categorization.',
    HumanEscalation: 'Request is unclear or high risk and needs human review.',
  };

  return {
    route_to: route,
    reason: reasonMap[route],
    missing_inputs,
    priority,
    recommended_next_action,
    handoff_payload,
  };
}
