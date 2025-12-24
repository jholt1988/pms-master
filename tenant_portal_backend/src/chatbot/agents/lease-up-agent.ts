/**
 * Lease-Up Agent stub per Agent Spec 3.
 * Drafts listing, lead response, pre-screen, showing options, and compliance flags.
 */

export interface LeaseUpInput {
  propertyId?: string;
  unitId?: string;
  rentTarget?: number;
  availabilityDate?: string;
  petPolicy?: string;
  smokingPolicy?: string;
  incomeRequirements?: string;
  fees?: string;
  leadMessage?: string;
}

export interface LeaseUpResult {
  listing_draft: {
    headline: string;
    body: string;
    amenities: string[];
    disclosures: string[];
  };
  lead_response_draft: string;
  pre_screen_questions: string[];
  showing_options: Array<{ date: string; time_windows: string[] }>;
  next_step_checklist: string[];
  compliance_flags: string[];
}

export function runLeaseUpAgent(input: LeaseUpInput): LeaseUpResult {
  const rent = input.rentTarget ? `$${input.rentTarget}` : '$TBD';
  const available = input.availabilityDate || 'TBD';

  const headline = `Updated ${rent} - Available ${available}`;
  const body = `Spacious unit with modern finishes. Pet policy: ${input.petPolicy || 'See policy'}. Smoking: ${input.smokingPolicy || 'No smoking indoors'}. Income requirements: ${input.incomeRequirements || '3x rent unless noted'}. Fees: ${input.fees || 'Standard application fees apply.'}`;

  const lead_response_draft =
    input.leadMessage
      ? `Thanks for reaching out! Based on your note: "${input.leadMessage}", we can share availability on ${available}. Please confirm your move-in window and pets.`
      : 'Thanks for your interest! Please share your move-in timing, pets, and any questions. We can offer showings later this week.';

  return {
    listing_draft: {
      headline,
      body,
      amenities: ['In-unit laundry', 'Dishwasher', 'Parking available', 'On-site maintenance'],
      disclosures: ['Equal housing opportunity', 'Application and screening required', 'All figures subject to lease terms'],
    },
    lead_response_draft,
    pre_screen_questions: [
      'Desired move-in date?',
      'Monthly household income and source?',
      'Any pets? Type/breed/weight?',
      'Do you agree to no smoking indoors?',
    ],
    showing_options: [
      { date: '2025-12-20', time_windows: ['10:00-12:00', '16:00-18:00'] },
      { date: '2025-12-21', time_windows: ['12:00-14:00', '17:00-19:00'] },
    ],
    next_step_checklist: [
      'Confirm screening criteria and fees with applicant.',
      'Provide showing window and access instructions.',
      'Send application link after showing is scheduled.',
    ],
    compliance_flags: [],
  };
}
