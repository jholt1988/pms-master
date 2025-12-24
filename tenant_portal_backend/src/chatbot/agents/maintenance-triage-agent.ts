/**
 * Deterministic Maintenance Triage Agent per Agent Spec 5.
 * No external calls; intended as a safe stub until wired to real tools.
 */

export type MaintenanceCategory =
  | 'plumbing'
  | 'electrical'
  | 'hvac'
  | 'appliance'
  | 'pest'
  | 'structural'
  | 'other';

export type MaintenanceSeverity = 'low' | 'medium' | 'high' | 'emergency';

export interface MaintenanceTriageInput {
  propertyId?: string;
  tenantId?: string;
  requestText: string;
  photos?: string[];
  timeReported?: string;
  zip?: string;
}

export interface MaintenanceTriageResult {
  category: MaintenanceCategory;
  severity: MaintenanceSeverity;
  risk_reasoning: string[];
  immediate_instructions_for_tenant: string[];
  questions_to_ask: string[];
  recommended_trade: string;
  suggested_response_time_hours: number;
  create_work_order: {
    should_create: boolean;
    title: string;
    scope_notes: string[];
    priority: 'low' | 'normal' | 'high' | 'urgent';
  };
}

const keywordCategories: Array<{ keywords: string[]; category: MaintenanceCategory; trade: string }> = [
  { keywords: ['leak', 'water', 'flood', 'toilet', 'sink', 'drain', 'sewage'], category: 'plumbing', trade: 'plumber' },
  { keywords: ['electrical', 'breaker', 'outlet', 'spark', 'sparking', 'shock'], category: 'electrical', trade: 'electrician' },
  { keywords: ['ac', 'a/c', 'air', 'heat', 'heater', 'furnace', 'hvac'], category: 'hvac', trade: 'hvac technician' },
  { keywords: ['fridge', 'dishwasher', 'washer', 'dryer', 'appliance', 'oven', 'stove'], category: 'appliance', trade: 'appliance technician' },
  { keywords: ['roach', 'rat', 'mouse', 'pest', 'bugs', 'mice', 'infestation'], category: 'pest', trade: 'pest control' },
  { keywords: ['roof', 'ceiling', 'wall', 'door', 'window', 'lock', 'floor', 'stairs', 'railing'], category: 'structural', trade: 'general contractor' },
];

const emergencyTriggers = ['smell gas', 'gas leak', 'sparking', 'spark', 'fire', 'smoke', 'co alarm', 'carbon monoxide', 'water pouring', 'active flood', 'sewage', 'sewage backup', 'no heat'];

function detectCategory(text: string): { category: MaintenanceCategory; trade: string } {
  for (const entry of keywordCategories) {
    if (entry.keywords.some((kw) => text.includes(kw))) {
      return { category: entry.category, trade: entry.trade };
    }
  }
  return { category: 'other', trade: 'general contractor' };
}

function detectSeverity(text: string): { severity: MaintenanceSeverity; reasoning: string[] } {
  const reasoning: string[] = [];
  if (emergencyTriggers.some((kw) => text.includes(kw))) {
    reasoning.push('Emergency keyword detected');
    return { severity: 'emergency', reasoning };
  }
  if (text.includes('no heat') || text.includes('no ac') || text.includes('no a/c')) {
    reasoning.push('Habitability issue detected');
    return { severity: 'high', reasoning };
  }
  if (text.includes('leak') || text.includes('water') || text.includes('roof')) {
    reasoning.push('Active or recent leak mentioned');
    return { severity: 'high', reasoning };
  }
  if (text.includes('pest') || text.includes('bugs') || text.includes('roach')) {
    reasoning.push('Pest issue');
    return { severity: 'medium', reasoning };
  }
  reasoning.push('No emergency indicators detected');
  return { severity: 'medium', reasoning };
}

function instructions(severity: MaintenanceSeverity, category: MaintenanceCategory): string[] {
  const base: string[] = [];
  if (severity === 'emergency') {
    base.push('If safe, evacuate the area and call local emergency services for fire/smoke/gas.');
    base.push('Shut off main water/power/gas if it can be done safely.');
  } else if (category === 'plumbing') {
    base.push('Shut off the nearest water valve if accessible and safe.');
  } else if (category === 'electrical') {
    base.push('Do not touch outlets or breakers; avoid water near electrical components.');
  }
  return base;
}

function questions(category: MaintenanceCategory): string[] {
  const shared = ['When did this start?', 'Can water/power/gas be shut off safely?', 'Any photos or video available?', 'Is anyone in danger right now?'];
  if (category === 'plumbing') return ['Is water still flowing?', 'Can you see a shutoff valve?'].concat(shared);
  if (category === 'electrical') return ['Are lights flickering or are breakers tripping repeatedly?', 'Any burning smell?'].concat(shared);
  if (category === 'hvac') return ['Is the system running or completely off?', 'Any error codes on thermostat/unit?'].concat(shared);
  return shared;
}

export function runMaintenanceTriage(input: MaintenanceTriageInput): MaintenanceTriageResult {
  const lower = input.requestText.toLowerCase();
  const { category, trade } = detectCategory(lower);
  const { severity, reasoning } = detectSeverity(lower);

  const priorityMap: Record<MaintenanceSeverity, 'low' | 'normal' | 'high' | 'urgent'> = {
    low: 'low',
    medium: 'normal',
    high: 'high',
    emergency: 'urgent',
  };

  const title = category === 'other' ? 'Maintenance request' : `${category} issue`;
  const scope_notes = [`Reported issue: ${input.requestText}`];

  return {
    category,
    severity,
    risk_reasoning: reasoning,
    immediate_instructions_for_tenant: instructions(severity, category),
    questions_to_ask: questions(category),
    recommended_trade: trade,
    suggested_response_time_hours: severity === 'emergency' ? 0 : severity === 'high' ? 4 : 24,
    create_work_order: {
      should_create: true,
      title,
      scope_notes,
      priority: priorityMap[severity],
    },
  };
}
