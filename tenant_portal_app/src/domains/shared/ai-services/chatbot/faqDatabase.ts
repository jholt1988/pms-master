/**
 * FAQ Database
 * Comprehensive FAQ entries for tenant inquiries
 */

import { FAQEntry, FAQCategory } from './types';

/**
 * Predefined FAQ entries organized by category
 */
export const FAQ_DATABASE: FAQEntry[] = [
  // ========== LEASE TERMS ==========
  {
    id: 'lease_001',
    category: FAQCategory.LEASE_TERMS,
    question: 'How long is my lease?',
    answer: 'Your lease duration can be found in your lease agreement under "Lease Management". Standard leases are typically 12 months, but some properties offer 6-month or month-to-month options. You can view your specific lease end date in the "My Lease" section of the tenant portal.',
    keywords: ['lease', 'duration', 'how long', 'lease term', 'contract', 'months'],
    relatedQuestions: ['Can I renew my lease early?', 'What happens when my lease ends?'],
    priority: 90,
  },
  {
    id: 'lease_002',
    category: FAQCategory.LEASE_TERMS,
    question: 'Can I break my lease early?',
    answer: 'Early lease termination is possible but typically requires 60 days written notice and may incur early termination fees as specified in your lease agreement. Special circumstances (military deployment, job relocation) may qualify for reduced penalties. Please review Section 8 of your lease agreement or contact your property manager to discuss your specific situation.',
    keywords: ['break lease', 'early termination', 'end lease', 'cancel', 'move out early'],
    relatedQuestions: ['What are the early termination fees?', 'How do I give notice to vacate?'],
    priority: 85,
  },
  {
    id: 'lease_003',
    category: FAQCategory.LEASE_TERMS,
    question: 'Can I have pets?',
    answer: 'Pet policies vary by property. Please refer to your lease agreement Section 12 for specific pet restrictions. Most properties allow cats and dogs under 50 lbs with a pet deposit ($250-$500) and monthly pet rent ($25-$50). Some breeds may be restricted. Register your pet through the "Lease Management" section and upload vaccination records.',
    keywords: ['pets', 'dogs', 'cats', 'animals', 'pet policy', 'pet deposit'],
    relatedQuestions: ['How much is the pet deposit?', 'Are emotional support animals allowed?'],
    priority: 80,
  },
  {
    id: 'lease_004',
    category: FAQCategory.LEASE_TERMS,
    question: 'Can I renew my lease early?',
    answer: 'Yes! We encourage tenants to renew early. Renewal notices are typically sent 90 days before lease expiration. Early renewal benefits may include: waived renewal fees, rental rate locks, and priority access to unit upgrades. Visit the "My Lease" section and click "Renew Lease" to start the process.',
    keywords: ['renew', 'renewal', 'extend lease', 'stay longer'],
    relatedQuestions: ['Will my rent increase when I renew?', 'How long is my lease?'],
    priority: 75,
  },

  // ========== MAINTENANCE ==========
  {
    id: 'maint_001',
    category: FAQCategory.MAINTENANCE,
    question: 'How do I submit a maintenance request?',
    answer: 'Submit maintenance requests through the "Maintenance Dashboard" in your tenant portal. Click "New Request", select the issue category, provide detailed description with photos if possible, and indicate urgency level. Emergency requests (water leaks, no heat, security issues) are responded to within 4 hours. Standard requests are typically addressed within 48-72 hours.',
    keywords: ['maintenance', 'repair', 'fix', 'broken', 'submit request', 'work order'],
    relatedQuestions: ['What is considered a maintenance emergency?', 'How long does maintenance take?'],
    priority: 95,
  },
  {
    id: 'maint_002',
    category: FAQCategory.MAINTENANCE,
    question: 'What is considered a maintenance emergency?',
    answer: 'Maintenance emergencies require immediate attention and include: no heat/AC in extreme weather (below 55°F or above 85°F), major water leaks or flooding, gas leaks, electrical hazards, broken locks on exterior doors, sewage backups, and no hot water. For emergencies, select "Emergency" priority when submitting your request or call the emergency hotline at (555) 123-4567.',
    keywords: ['emergency', 'urgent', 'immediate', 'critical', 'hotline'],
    relatedQuestions: ['How do I submit a maintenance request?', 'What is the emergency phone number?'],
    priority: 100,
  },
  {
    id: 'maint_003',
    category: FAQCategory.MAINTENANCE,
    question: 'How long does maintenance take?',
    answer: 'Response times vary by urgency: Emergency requests are responded to within 4 hours. Urgent repairs (non-functional appliances, major leaks) are addressed within 24 hours. Standard maintenance is completed within 48-72 hours. Planned upgrades may require 7-14 days scheduling. You\'ll receive status updates via email and the tenant portal.',
    keywords: ['how long', 'response time', 'timeline', 'when', 'wait'],
    relatedQuestions: ['How do I check maintenance status?', 'Can I track my maintenance request?'],
    priority: 85,
  },
  {
    id: 'maint_004',
    category: FAQCategory.MAINTENANCE,
    question: 'Do I need to be home for maintenance?',
    answer: 'For scheduled maintenance, you\'re not required to be home. Maintenance staff have keys and will knock before entering. We recommend being present for: major repairs requiring decisions, if you have pets, or for personal preference. You can specify "Tenant must be present" when submitting requests. All maintenance visits are logged with entry/exit times for your security.',
    keywords: ['be home', 'present', 'entry', 'access', 'schedule'],
    relatedQuestions: ['How will I know when maintenance is coming?', 'Is maintenance bonded and insured?'],
    priority: 70,
  },

  // ========== PAYMENTS ==========
  {
    id: 'pay_001',
    category: FAQCategory.PAYMENTS,
    question: 'When is rent due?',
    answer: 'Rent is due on the 1st of each month. A grace period extends until the 5th without late fees. Late fees ($50-$75) apply starting on the 6th. Pay online through the "Payments" section using: ACH bank transfer (free, 1-2 days), debit card (2.5% fee, instant), or credit card (3.5% fee, instant). Set up autopay to never miss a payment!',
    keywords: ['rent', 'due date', 'when', 'payment', 'first', 'month'],
    relatedQuestions: ['What payment methods do you accept?', 'How do I set up autopay?'],
    priority: 95,
  },
  {
    id: 'pay_002',
    category: FAQCategory.PAYMENTS,
    question: 'What payment methods do you accept?',
    answer: 'We accept multiple payment methods through the tenant portal: ACH bank transfer (free, recommended), debit card (2.5% convenience fee), credit card (3.5% convenience fee), cashier\'s check (deliver to office), and money order (deliver to office). Online payments post instantly. Physical payments should be received by the 3rd to avoid late fees.',
    keywords: ['payment method', 'how to pay', 'credit card', 'bank transfer', 'ach', 'check'],
    relatedQuestions: ['Is there a fee for paying with a credit card?', 'Can I pay cash?'],
    priority: 90,
  },
  {
    id: 'pay_003',
    category: FAQCategory.PAYMENTS,
    question: 'How do I set up autopay?',
    answer: 'Set up autopay in 3 easy steps: 1) Go to "Payments" section, 2) Click "Set Up AutoPay", 3) Select payment method and confirm. AutoPay charges on the 1st of each month automatically. You\'ll receive confirmation emails. Benefits: never forget rent, no late fees, and some properties offer $10-25/month autopay discount. You can cancel anytime with 5 days notice.',
    keywords: ['autopay', 'automatic payment', 'recurring', 'auto pay', 'set up'],
    relatedQuestions: ['When does autopay charge?', 'Can I cancel autopay?'],
    priority: 85,
  },
  {
    id: 'pay_004',
    category: FAQCategory.PAYMENTS,
    question: 'What are the late fees?',
    answer: 'Late fee structure (varies by state law): $50-75 flat fee after 5th of the month, additional $5-10/day after the 10th, maximum cap at 10% of monthly rent. Three consecutive late payments may trigger lease violation proceedings. Financial hardship? Contact property management immediately to discuss payment plans before the 5th to avoid fees.',
    keywords: ['late fee', 'penalty', 'late payment', 'charge', 'cost'],
    relatedQuestions: ['Can I get a payment extension?', 'What happens if I can\'t pay rent?'],
    priority: 80,
  },

  // ========== RENT OPTIMIZATION ==========
  {
    id: 'rent_001',
    category: FAQCategory.RENT_OPTIMIZATION,
    question: 'How is my rent calculated?',
    answer: 'Your rent is calculated using AI-powered market analysis that considers: property location and neighborhood trends, unit size and amenities, comparable rental prices in your area, seasonal demand patterns, and property condition. Our ML model analyzes 27+ factors to ensure fair market pricing. You can view your rent analysis in the "Rent Estimator" section of the portal.',
    keywords: ['rent calculation', 'how much', 'pricing', 'market rate', 'why rent'],
    relatedQuestions: ['Can I negotiate my rent?', 'Will my rent increase next year?'],
    priority: 90,
  },
  {
    id: 'rent_002',
    category: FAQCategory.RENT_OPTIMIZATION,
    question: 'Will my rent increase when I renew?',
    answer: 'Rent adjustments at renewal are based on current market conditions. Our AI analyzes local market trends to recommend fair increases. Typical annual increases range 3-8% but may be higher in hot markets or lower/zero in slow markets. You\'ll receive renewal terms 90 days before lease expiration. Early renewals may lock in lower rates.',
    keywords: ['rent increase', 'raise', 'renewal', 'price', 'go up'],
    relatedQuestions: ['How much will my rent increase?', 'Can I negotiate my rent?'],
    priority: 85,
  },
  {
    id: 'rent_003',
    category: FAQCategory.RENT_OPTIMIZATION,
    question: 'Can I negotiate my rent?',
    answer: 'Rent negotiations are possible, especially at renewal time. Factors that strengthen your position: excellent payment history, long-term residency, referrals of new tenants, and willingness to sign longer leases. Our AI-powered rent estimator shows market comparables which can support your negotiation. Submit formal requests through the "Messages" section addressed to property management.',
    keywords: ['negotiate', 'lower rent', 'discount', 'reduce', 'bargain'],
    relatedQuestions: ['How is my rent calculated?', 'Will my rent increase when I renew?'],
    priority: 75,
  },

  // ========== AMENITIES ==========
  {
    id: 'amen_001',
    category: FAQCategory.AMENITIES,
    question: 'What amenities are included?',
    answer: 'Standard amenities vary by property but typically include: on-site parking, fitness center, laundry facilities, online rent payment, 24/7 maintenance request system, and secure package delivery. Premium properties may offer: pool, clubhouse, business center, pet stations, and EV charging. View your property\'s specific amenities in the "Property Information" section.',
    keywords: ['amenities', 'features', 'facilities', 'included', 'what do I get'],
    relatedQuestions: ['Is parking included?', 'Do you have a gym?'],
    priority: 70,
  },
  {
    id: 'amen_002',
    category: FAQCategory.AMENITIES,
    question: 'Is parking included?',
    answer: 'Parking availability varies by property: Some include 1 space in rent, others charge $50-150/month per space, street parking may be available. Reserved/covered spots may cost more. Guest parking is typically available on a first-come basis. Check your lease Section 9 for specific parking details. Additional parking can be requested through property management.',
    keywords: ['parking', 'garage', 'spot', 'car', 'vehicle'],
    relatedQuestions: ['Can I get a second parking spot?', 'Where do guests park?'],
    priority: 75,
  },

  // ========== POLICIES ==========
  {
    id: 'policy_001',
    category: FAQCategory.POLICIES,
    question: 'What are the quiet hours?',
    answer: 'Standard quiet hours are 10 PM - 8 AM on weekdays and 11 PM - 9 AM on weekends. During these hours, noise should not be audible from adjacent units. Excessive noise violations can result in warnings and potential lease violations. Special events require 48-hour notice to neighbors and property management. File noise complaints through the tenant portal.',
    keywords: ['quiet hours', 'noise', 'loud', 'silent', 'disturbance'],
    relatedQuestions: ['How do I file a noise complaint?', 'Can I have parties?'],
    priority: 70,
  },
  {
    id: 'policy_002',
    category: FAQCategory.POLICIES,
    question: 'Can I sublease my apartment?',
    answer: 'Subleasing requires written approval from property management. Process: 1) Submit sublease request with proposed tenant info, 2) Subtenant must complete application and screening ($50 fee), 3) If approved, sign sublease addendum. You remain responsible for rent and damages. Unauthorized subleasing is a lease violation and grounds for eviction. Some properties prohibit subleasing entirely.',
    keywords: ['sublease', 'sublet', 'roommate', 'someone else', 'transfer'],
    relatedQuestions: ['Can I add a roommate?', 'What if I need to move out early?'],
    priority: 65,
  },

  // ========== EMERGENCIES ==========
  {
    id: 'emerg_001',
    category: FAQCategory.EMERGENCIES,
    question: 'What is the emergency phone number?',
    answer: 'Emergency maintenance hotline: (555) 123-4567 (24/7). Use for: gas leaks, floods, no heat in winter, electrical hazards, broken door locks, and other safety issues. For non-life-threatening maintenance, submit requests through the tenant portal. For life-threatening emergencies (fire, medical, crime), always call 911 first, then notify property management.',
    keywords: ['emergency', 'phone number', 'contact', 'hotline', 'urgent'],
    relatedQuestions: ['What is considered a maintenance emergency?', 'Who do I call after hours?'],
    priority: 100,
  },
  {
    id: 'emerg_002',
    category: FAQCategory.EMERGENCIES,
    question: 'What do I do if I smell gas?',
    answer: 'GAS LEAK EMERGENCY PROTOCOL: 1) DO NOT turn on/off any electrical switches or create sparks, 2) Evacuate immediately - leave doors/windows open, 3) Call gas company emergency line (on your gas bill) or 911 from outside, 4) Call property emergency hotline (555) 123-4567, 5) Do not re-enter until cleared by professionals. Natural gas is odorless - a "rotten egg" smell is added as a safety warning.',
    keywords: ['gas', 'smell', 'leak', 'propane', 'odor'],
    relatedQuestions: ['What is the emergency phone number?', 'What other emergencies require immediate action?'],
    priority: 100,
  },

  // ========== GENERAL ==========
  {
    id: 'gen_001',
    category: FAQCategory.GENERAL,
    question: 'How do I contact property management?',
    answer: 'Contact property management through multiple channels: Tenant Portal Messages (recommended, 24-48 hour response), Email: management@property.com, Phone: (555) 123-4500 (Mon-Fri 9 AM - 6 PM), Emergency Hotline: (555) 123-4567 (24/7 for emergencies only). For routine matters, use the portal messaging system for fastest response and documentation.',
    keywords: ['contact', 'email', 'phone', 'reach', 'call', 'message'],
    relatedQuestions: ['What are office hours?', 'How quickly will I get a response?'],
    priority: 85,
  },
  {
    id: 'gen_002',
    category: FAQCategory.GENERAL,
    question: 'How do I get a copy of my lease?',
    answer: 'Access your lease anytime through the tenant portal: 1) Log in to your account, 2) Navigate to "Lease Management" or "My Lease", 3) Click "View Lease Document", 4) Download PDF or print. If you have trouble accessing your lease digitally, contact property management to request an email copy or pick up a physical copy during office hours.',
    keywords: ['lease copy', 'lease document', 'download lease', 'lease agreement'],
    relatedQuestions: ['Where can I find my lease?', 'How do I update my contact information?'],
    priority: 75,
  },
  {
    id: 'gen_003',
    category: FAQCategory.GENERAL,
    question: 'How do I update my contact information?',
    answer: 'Update your contact details through the tenant portal: 1) Click your profile icon in the top right, 2) Select "Account Settings" or "Profile", 3) Update phone, email, or emergency contact information, 4) Click "Save Changes". Important: Keep emergency contact information current. Changes are effective immediately and you\'ll receive a confirmation email.',
    keywords: ['update', 'change', 'contact', 'phone', 'email', 'address'],
    relatedQuestions: ['How do I reset my password?', 'How do I contact property management?'],
    priority: 70,
  },
];

/**
 * Helper function to search FAQs by keywords
 */
export function searchFAQs(query: string, category?: FAQCategory): FAQEntry[] {
  const lowerQuery = query.toLowerCase();
  const words = lowerQuery.split(/\s+/).filter(w => w.length > 2); // Filter short words
  
  let results = FAQ_DATABASE.filter(faq => {
    // Filter by category if specified
    if (category && faq.category !== category) {
      return false;
    }
    
    // Check if any keyword matches
    const keywordMatch = faq.keywords.some(keyword => 
      keyword.toLowerCase().includes(lowerQuery) || 
      lowerQuery.includes(keyword.toLowerCase())
    );
    
    // Check if question matches
    const questionMatch = faq.question.toLowerCase().includes(lowerQuery);
    
    // Check if any query word matches
    const wordMatch = words.some(word => 
      faq.keywords.some(keyword => keyword.toLowerCase().includes(word)) ||
      faq.question.toLowerCase().includes(word) ||
      faq.answer.toLowerCase().includes(word)
    );
    
    return keywordMatch || questionMatch || wordMatch;
  });
  
  // Sort by priority (higher first)
  results.sort((a, b) => b.priority - a.priority);
  
  return results;
}

/**
 * Get FAQs by category
 */
export function getFAQsByCategory(category: FAQCategory): FAQEntry[] {
  return FAQ_DATABASE
    .filter(faq => faq.category === category)
    .sort((a, b) => b.priority - a.priority);
}

/**
 * Get top priority FAQs across all categories
 */
export function getTopFAQs(limit: number = 10): FAQEntry[] {
  return FAQ_DATABASE
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit);
}
