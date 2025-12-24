/**
 * Draft-only Tenant Communications Agent per Agent Spec 4.
 * Generates structured drafts without sending messages.
 */

export interface TenantCommsInput {
  tenantId?: string;
  propertyId?: string;
  context?: string;
  desiredOutcome?: string;
  channel?: 'sms' | 'email';
  tone?: 'firm' | 'neutral' | 'friendly';
  deadlines?: Array<{ item: string; by: string }>;
}

export interface TenantCommsResult {
  message_subject: string;
  message_body: string;
  sms_version: string;
  key_points: string[];
  requested_info: string[];
  deadlines: Array<{ item: string; by: string }>;
  escalation_needed: boolean;
  confidence: number;
}

function buildSubject(tone: TenantCommsInput['tone'], context?: string): string {
  const base = context ? context.slice(0, 60) : 'Account update';
  if (tone === 'firm') return `Action needed: ${base}`;
  if (tone === 'friendly') return `Quick update: ${base}`;
  return `Regarding: ${base}`;
}

function buildBody(input: TenantCommsInput): string {
  const tone = input.tone || 'neutral';
  const outcome = input.desiredOutcome || 'provide an update';
  const context = input.context || 'the recent request';
  const deadline = input.deadlines?.[0]?.by;
  const cta = deadline
    ? `Please complete this by ${deadline}.`
    : 'Please reply so we can move forward.';

  const tonePrefix =
    tone === 'firm'
      ? 'We need your prompt attention.'
      : tone === 'friendly'
        ? 'Hope you are well!'
        : 'Hello,';

  return `${tonePrefix} We’re following up about ${context}. We need to ${outcome}. ${cta} If you have questions, reply to this message.`;
}

export function runTenantCommsAgent(input: TenantCommsInput): TenantCommsResult {
  const subject = buildSubject(input.tone, input.context);
  const body = buildBody(input);
  const sms = `${body} Reply STOP to opt out.`;

  return {
    message_subject: subject,
    message_body: body,
    sms_version: sms,
    key_points: [
      input.context ? `Context: ${input.context}` : 'Context: not provided',
      input.desiredOutcome ? `Outcome: ${input.desiredOutcome}` : 'Outcome: clarify desired action',
    ],
    requested_info: ['Best time for access (if scheduling)', 'Photos/video (if applicable)'],
    deadlines: input.deadlines || [],
    escalation_needed: false,
    confidence: 0.65,
  };
}
