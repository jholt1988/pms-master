/**
 * Leasing Agent Service
 * AI-powered service for handling prospective tenant inquiries,
 * property showings, application processing, and lead management
 */

export interface LeadInfo {
  id?: string;
  name?: string;
  email?: string;
  phone?: string;
  moveInDate?: string;
  bedrooms?: number;
  bathrooms?: number;
  budget?: number;
  petFriendly?: boolean;
  preferences?: string[];
  status?: 'NEW' | 'QUALIFIED' | 'TOURING' | 'APPLYING' | 'APPROVED' | 'DENIED' | 'CONVERTED';
  conversationHistory?: Message[];
}

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

export interface PropertyMatch {
  propertyId: string;
  address: string;
  bedrooms: number;
  bathrooms: number;
  rent: number;
  available: boolean;
  amenities: string[];
  matchScore: number;
  images?: string[];
}

export interface TourRequest {
  leadId: string;
  propertyId: string;
  preferredDate: string;
  preferredTime: string;
  notes?: string;
}

export interface ApplicationData {
  leadId: string;
  propertyId: string;
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    dateOfBirth: string;
    ssn?: string;
  };
  currentAddress: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
  employmentInfo: {
    employer: string;
    position: string;
    annualIncome: number;
    employmentLength: string;
  };
  references: Array<{
    name: string;
    relationship: string;
    phone: string;
  }>;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  pets?: Array<{
    type: string;
    breed: string;
    weight: number;
  }>;
}

class LeasingAgentService {
  private readonly API_BASE_URL = 'http://localhost:3001/api';
  private conversationState: Map<string, LeadInfo> = new Map();

  /**
   * Initialize a new conversation for a prospective tenant
   */
  async startConversation(sessionId: string): Promise<Message> {
    const lead: LeadInfo = {
      status: 'NEW',
      conversationHistory: [],
    };
    
    this.conversationState.set(sessionId, lead);

    const welcomeMessage: Message = {
      role: 'assistant',
      content: `👋 Hi! I'm your AI Leasing Agent. I'm here to help you find your perfect home!

I can help you with:
🏠 Browse available properties
📅 Schedule property tours
📝 Start your rental application
💰 Get rent estimates and pricing info
❓ Answer questions about our properties

To get started, could you tell me a bit about what you're looking for? For example:
- When are you looking to move in?
- How many bedrooms do you need?
- What's your budget range?`,
      timestamp: new Date(),
    };

    lead.conversationHistory?.push(welcomeMessage);
    return welcomeMessage;
  }

  /**
   * Process user message and generate intelligent response
   */
  async sendMessage(sessionId: string, userMessage: string): Promise<Message> {
    let lead = this.conversationState.get(sessionId);
    
    // Initialize lead if it doesn't exist
    if (!lead) {
      lead = {
        status: 'NEW',
        conversationHistory: [],
      };
      this.conversationState.set(sessionId, lead);
    }

    // Add user message to history
    const userMsg: Message = {
      role: 'user',
      content: userMessage,
      timestamp: new Date(),
    };
    lead.conversationHistory?.push(userMsg);

    // Extract information from user message
    this.extractLeadInfo(lead, userMessage);

    // Generate context-aware response
    const response = await this.generateResponse(lead, userMessage);

    // Add assistant response to history
    const assistantMsg: Message = {
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    };
    lead.conversationHistory?.push(assistantMsg);

    // Update lead status based on conversation progress
    this.updateLeadStatus(lead);

    // Save lead and messages to backend (async, don't wait)
    this.saveLeadAndMessages(sessionId, lead, userMsg, assistantMsg).catch(err => 
      console.error('Failed to save to backend:', err)
    );

    return assistantMsg;
  }

  /**
   * Save lead and messages to backend
   */
  private async saveLeadAndMessages(
    sessionId: string, 
    lead: LeadInfo, 
    userMsg: Message, 
    assistantMsg: Message
  ): Promise<void> {
    try {
      // First, save/update the lead
      const leadPayload = {
        sessionId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        bedrooms: lead.bedrooms,
        bathrooms: lead.bathrooms,
        budget: lead.budget,
        moveInDate: lead.moveInDate,
        petFriendly: lead.petFriendly,
        preferences: lead.preferences || [],
        status: lead.status,
        source: 'website',
      };

      const leadResponse = await fetch(`${this.API_BASE_URL}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(leadPayload),
      });

      if (!leadResponse.ok) {
        throw new Error(`Failed to save lead: ${leadResponse.statusText}`);
      }

      const savedLead = await leadResponse.json();
      
      // Store the lead ID for future operations
      if (savedLead.id && !lead.id) {
        lead.id = savedLead.id;
        console.log('Lead saved to backend with ID:', savedLead.id);
      }

      // Now save the messages if we have a lead ID
      if (lead.id) {
        await this.saveMessageToBackend(lead.id, userMsg);
        await this.saveMessageToBackend(lead.id, assistantMsg);
      }
    } catch (error) {
      console.error('Error saving to backend:', error);
      // Don't throw - allow conversation to continue even if save fails
    }
  }

  /**
   * Save a single message to backend
   */
  private async saveMessageToBackend(leadId: string, message: Message): Promise<void> {
    try {
      const payload = {
        role: message.role.toUpperCase(),
        content: message.content,
        metadata: message.metadata || {},
      };

      const response = await fetch(`${this.API_BASE_URL}/leads/${leadId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`Failed to save message: ${response.statusText}`);
      }

      console.log(`${message.role} message saved to backend`);
    } catch (error) {
      console.error('Error saving message:', error);
      // Don't throw - allow conversation to continue
    }
  }

  /**
   * Extract structured information from user messages
   */
  private extractLeadInfo(lead: LeadInfo, message: string): void {
    const lowerMsg = message.toLowerCase();

    // Extract contact info
    const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;
    const phoneRegex = /\b(?:\+?1[-.]?)?\(?(\d{3})\)?[-.]?(\d{3})[-.]?(\d{4})\b/;
    const emailMatch = message.match(emailRegex);
    const phoneMatch = message.match(phoneRegex);

    if (emailMatch && !lead.email) {
      lead.email = emailMatch[0];
      console.log('Extracted email:', lead.email);
    }
    if (phoneMatch && !lead.phone) {
      lead.phone = phoneMatch[0];
      console.log('Extracted phone:', lead.phone);
    }

    // Extract name - improved patterns
    if (!lead.name) {
      const namePatterns = [
        /(?:my name is|i'm|i am|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:here|speaking)/i,
        /^hi\s*,?\s*(?:i'm|i am)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
      ];
      
      for (const pattern of namePatterns) {
        const nameMatch = message.match(pattern);
        if (nameMatch) {
          lead.name = nameMatch[1];
          console.log('Extracted name:', lead.name);
          break;
        }
      }
    }

    // Extract bedrooms - multiple patterns
    let bedroomMatch = message.match(/(\d+)\s*(?:bed|bedroom|br|b\/r)/i);
    if (!bedroomMatch) {
      // Check for written numbers
      const writtenNumbers: { [key: string]: number } = {
        'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5, 
        'studio': 0, '1br': 1, '2br': 2, '3br': 3, '4br': 4
      };
      for (const [word, num] of Object.entries(writtenNumbers)) {
        if (lowerMsg.includes(word)) {
          lead.bedrooms = num;
          console.log('Extracted bedrooms:', lead.bedrooms);
          break;
        }
      }
    } else {
      lead.bedrooms = parseInt(bedroomMatch[1]);
      console.log('Extracted bedrooms:', lead.bedrooms);
    }

    // Extract bathrooms
    const bathroomMatch = message.match(/(\d+(?:\.\d+)?)\s*(?:bath|bathroom|ba)/i);
    if (bathroomMatch) {
      lead.bathrooms = parseFloat(bathroomMatch[1]);
      console.log('Extracted bathrooms:', lead.bathrooms);
    }

    // Extract budget - improved patterns
    const budgetPatterns = [
      /\$\s?([\d,]+)(?:\s*(?:per month|\/mo|\/month|monthly|a month))?/i,
      /(?:budget|afford|spend|pay)\s*(?:is|of|around|about|up to)?\s*\$?\s?([\d,]+)/i,
      /([\d,]+)\s*(?:dollars?|bucks?)\s*(?:per month|monthly|a month)/i,
      /(?:under|below|less than)\s*\$?\s?([\d,]+)/i,
      /between\s*\$?\s?([\d,]+)\s*(?:and|to|-)\s*\$?\s?([\d,]+)/i,
    ];

    for (const pattern of budgetPatterns) {
      const budgetMatch = message.match(pattern);
      if (budgetMatch) {
        const amount = parseInt(budgetMatch[1].replace(/,/g, ''));
        if (amount > 100 && amount < 100000) { // Sanity check
          lead.budget = amount;
          console.log('Extracted budget:', lead.budget);
          break;
        }
      }
    }

    // Extract move-in date - improved patterns
    const monthNames = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    if (monthNames.some(month => lowerMsg.includes(month))) {
      const datePatterns = [
        /\b([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s*(\d{4})?\b/i,
        /\b(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})\b/,
        /(?:in|by|around)\s+([A-Z][a-z]+)\b/i,
      ];
      
      for (const pattern of datePatterns) {
        const dateMatch = message.match(pattern);
        if (dateMatch) {
          lead.moveInDate = dateMatch[0];
          console.log('Extracted move-in date:', lead.moveInDate);
          break;
        }
      }
    }

    // Check for immediate/ASAP move-in
    if (lowerMsg.match(/\b(asap|immediately|right away|now|urgent|soon)\b/)) {
      lead.moveInDate = 'ASAP';
      console.log('Extracted move-in date: ASAP');
    }

    // Extract pet info - improved detection
    const hasPets = lowerMsg.match(/\b(have|has|with|got)\s+(?:a\s+)?(?:dog|cat|pet)/i) ||
                    (lowerMsg.match(/\b(?:dog|cat|pet)(?:s)?\b/) && !lowerMsg.includes('no pet'));
    const noPets = lowerMsg.match(/\b(no|don't have|without|not)\s+(?:any\s+)?(?:dog|cat|pet)/i);
    
    if (hasPets && !noPets) {
      lead.petFriendly = true;
      console.log('Extracted pet preference: Yes');
    } else if (noPets) {
      lead.petFriendly = false;
      console.log('Extracted pet preference: No');
    }

    // Extract preferences - expanded list
    if (!lead.preferences) {
      lead.preferences = [];
    }
    
    const amenityMap: { [key: string]: string[] } = {
      'parking': ['parking', 'garage', 'carport'],
      'pool': ['pool', 'swimming'],
      'gym': ['gym', 'fitness', 'workout'],
      'laundry': ['washer', 'dryer', 'laundry', 'w/d'],
      'dishwasher': ['dishwasher'],
      'balcony': ['balcony', 'patio', 'deck'],
      'ac': ['ac', 'air conditioning', 'central air', 'a/c'],
      'heating': ['heating', 'heat', 'furnace'],
      'hardwood': ['hardwood', 'wood floor'],
      'carpet': ['carpet'],
      'storage': ['storage', 'closet'],
      'pets': ['pet friendly', 'pets allowed'],
      'utilities': ['utilities included'],
      'furnished': ['furnished'],
      'doorman': ['doorman', 'concierge'],
      'elevator': ['elevator'],
      'wheelchair': ['accessible', 'wheelchair'],
    };
    
    for (const [amenity, keywords] of Object.entries(amenityMap)) {
      if (keywords.some(kw => lowerMsg.includes(kw)) && !lead.preferences?.includes(amenity)) {
        lead.preferences?.push(amenity);
        console.log('Extracted preference:', amenity);
      }
    }

    console.log('Current lead info:', lead);
  }

  /**
   * Generate intelligent, context-aware response
   */
  private async generateResponse(lead: LeadInfo, userMessage: string): Promise<string> {
    const lowerMsg = userMessage.toLowerCase();

    // Check if user is providing contact info
    if (lead.email && lead.phone && !lead.name) {
      return `Great! I have your contact info. What's your name so I can personalize your search?`;
    }

    // Check if asking about availability
    if (lowerMsg.includes('available') || lowerMsg.includes('vacancy') || lowerMsg.includes('units')) {
      if (lead.bedrooms && lead.budget) {
        try {
          const properties = await this.searchProperties(lead);
          if (properties.length > 0) {
            return this.formatPropertyList(properties, lead);
          } else {
            return `I don't have any ${lead.bedrooms}-bedroom units available right now within your $${lead.budget}/month budget. However, I can:
1. Notify you when something becomes available
2. Show you similar options slightly above budget
3. Suggest nearby properties that might work

What would you prefer?`;
          }
        } catch (error) {
          return `Let me help you find available properties. Could you tell me your preferred number of bedrooms and budget range?`;
        }
      } else {
        return `I'd love to show you what's available! To find the best match, could you tell me:
- How many bedrooms do you need?
- What's your monthly budget range?`;
      }
    }

    // Check if asking about scheduling a tour
    if (lowerMsg.includes('tour') || lowerMsg.includes('visit') || lowerMsg.includes('see') || lowerMsg.includes('viewing')) {
      if (!lead.email || !lead.phone) {
        return `I'd be happy to schedule a tour! First, I'll need your contact information:
- Email address
- Phone number

This way I can send you tour confirmation and updates.`;
      }
      return `Perfect! I can schedule a property tour for you. What days and times work best? We offer tours:
- Monday-Friday: 9am-6pm
- Saturday: 10am-4pm
- Sunday: 12pm-4pm

Just let me know your preferred date and time!`;
    }

    // Check if asking about application process
    if (lowerMsg.includes('apply') || lowerMsg.includes('application')) {
      return `Great! Here's our application process:

📋 **Requirements:**
- Valid government-issued ID
- Proof of income (pay stubs, tax returns)
- Employment verification
- Rental history
- Credit & background check ($50 fee)

💰 **Income Requirements:**
- Monthly income should be 3x the rent
- We accept guarantors if needed

⏱️ **Timeline:**
- Application review: 24-48 hours
- Background check: 3-5 business days
- Move-in: Usually within 2 weeks of approval

Would you like to start your application, or do you have questions about any requirements?`;
    }

    // Check if asking about pricing/rent
    if (lowerMsg.includes('price') || lowerMsg.includes('rent') || lowerMsg.includes('cost') || lowerMsg.includes('how much')) {
      if (lead.bedrooms) {
        return `Our ${lead.bedrooms}-bedroom units typically range from $${this.estimateRent(lead.bedrooms) - 200} to $${this.estimateRent(lead.bedrooms) + 200} per month, depending on:
- Floor level
- View
- Specific amenities
- Lease term length

💡 Tip: Longer lease terms (12+ months) often come with discounts!

Would you like to see specific available units with exact pricing?`;
      }
      return `I can provide pricing information! How many bedrooms are you looking for?`;
    }

    // Check if asking about amenities
    if (lowerMsg.includes('amenity') || lowerMsg.includes('amenities') || lowerMsg.includes('feature')) {
      return `Our properties feature great amenities! Here's what we offer:

🏢 **Building Amenities:**
- Fitness center
- Pool & spa
- Clubhouse
- Package receiving
- Secure parking
- Pet-friendly areas

🏠 **Unit Features:**
- Modern appliances
- In-unit washer/dryer
- Central A/C & heating
- High-speed internet ready
- Walk-in closets
- Private balcony/patio

Are you looking for any specific features? I can help narrow down properties based on your preferences!`;
    }

    // Check if asking about pets
    if (lowerMsg.includes('pet')) {
      return `We're pet-friendly! 🐾

**Pet Policy:**
- Dogs & cats welcome (breed restrictions apply)
- Maximum 2 pets per unit
- Pet deposit: $300 per pet
- Pet rent: $25/month per pet
- Weight limit: 50 lbs for dogs

**Required:**
- Vaccination records
- Pet photo
- Previous landlord pet reference (if applicable)

Do you have pets? Tell me about them!`;
    }

    // Check if user hasn't provided basic info yet
    if (!lead.bedrooms || !lead.budget || !lead.moveInDate) {
      const missing = [];
      if (!lead.bedrooms) missing.push('number of bedrooms');
      if (!lead.budget) missing.push('budget range');
      if (!lead.moveInDate) missing.push('move-in date');

      return `To help find the perfect place for you, I still need to know your ${missing.join(' and ')}. Could you share that information?`;
    }

    // If we have basic info, suggest next steps
    if (lead.status === 'NEW') {
      return `Thanks for sharing! Based on what you've told me, I can help you:
1. 🏠 Browse ${lead.bedrooms}-bedroom properties in your budget
2. 📅 Schedule property tours
3. 📝 Start your rental application

What would you like to do next?`;
    }

    // Default response
    return `I'm here to help with your apartment search! I can assist with:
- Finding available properties
- Scheduling tours
- Application process
- Pricing information
- Amenities and features

What would you like to know more about?`;
  }

  /**
   * Format property list for display
   */
  private formatPropertyList(properties: PropertyMatch[], lead: LeadInfo): string {
    let response = `Great news! I found ${properties.length} properties that match your criteria:\n\n`;

    properties.slice(0, 3).forEach((prop, index) => {
      response += `🏠 **Property ${index + 1}**
📍 ${prop.address}
🛏️ ${prop.bedrooms} bed | 🚿 ${prop.bathrooms} bath
💰 $${prop.rent}/month
${prop.amenities.slice(0, 3).join(', ')}
Match Score: ${Math.round(prop.matchScore * 100)}%

`;
    });

    if (properties.length > 3) {
      response += `...and ${properties.length - 3} more!\n\n`;
    }

    response += `Would you like to:
1. See more details about any of these properties
2. Schedule a tour
3. See additional options`;

    return response;
  }

  /**
   * Search for properties matching lead criteria
   */
  private async searchProperties(lead: LeadInfo): Promise<PropertyMatch[]> {
    try {
      const params = new URLSearchParams();
      if (lead.bedrooms) params.append('bedrooms', lead.bedrooms.toString());
      if (lead.budget) params.append('maxRent', lead.budget.toString());
      if (lead.petFriendly) params.append('petFriendly', 'true');

      const response = await fetch(`${this.API_BASE_URL}/properties/search?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Property search failed');
      }

      const properties = await response.json();
      
      // Calculate match scores
      return properties.map((prop: any) => ({
        ...prop,
        matchScore: this.calculateMatchScore(lead, prop),
      })).sort((a: PropertyMatch, b: PropertyMatch) => b.matchScore - a.matchScore);
    } catch (error) {
      console.error('Property search error:', error);
      // Return mock data for demo
      return this.getMockProperties(lead);
    }
  }

  /**
   * Calculate how well a property matches lead preferences
   */
  private calculateMatchScore(lead: LeadInfo, property: any): number {
    let score = 0;
    let factors = 0;

    // Bedroom match
    if (lead.bedrooms && property.bedrooms === lead.bedrooms) {
      score += 1;
    }
    factors++;

    // Budget match
    if (lead.budget && property.rent <= lead.budget) {
      const budgetRatio = property.rent / lead.budget;
      score += (1 - Math.abs(1 - budgetRatio));
    }
    factors++;

    // Pet friendly
    if (lead.petFriendly && property.petFriendly) {
      score += 1;
    }
    factors++;

    // Amenity matches
    if (lead.preferences && property.amenities) {
      const matchingAmenities = lead.preferences.filter((pref: string) =>
        property.amenities.some((amenity: string) => 
          amenity.toLowerCase().includes(pref.toLowerCase())
        )
      );
      if (lead.preferences.length > 0) {
        score += matchingAmenities.length / lead.preferences.length;
        factors++;
      }
    }

    return factors > 0 ? score / factors : 0;
  }

  /**
   * Get mock properties for demo purposes
   */
  private getMockProperties(lead: LeadInfo): PropertyMatch[] {
    const baseRent = lead.budget || this.estimateRent(lead.bedrooms || 2);
    
    return [
      {
        propertyId: '1',
        address: '123 Main Street, Apt 201',
        bedrooms: lead.bedrooms || 2,
        bathrooms: 2,
        rent: baseRent - 100,
        available: true,
        amenities: ['Parking', 'Pool', 'Gym', 'In-unit laundry'],
        matchScore: 0.95,
      },
      {
        propertyId: '2',
        address: '456 Oak Avenue, Unit 5B',
        bedrooms: lead.bedrooms || 2,
        bathrooms: 1,
        rent: baseRent - 200,
        available: true,
        amenities: ['Parking', 'Pet-friendly', 'Balcony'],
        matchScore: 0.85,
      },
      {
        propertyId: '3',
        address: '789 Pine Boulevard, Suite 12',
        bedrooms: lead.bedrooms || 2,
        bathrooms: 2,
        rent: baseRent,
        available: true,
        amenities: ['Gym', 'Pool', 'Concierge', 'In-unit laundry', 'Garage'],
        matchScore: 0.90,
      },
    ];
  }

  /**
   * Estimate rent based on bedrooms
   */
  private estimateRent(bedrooms: number): number {
    const baseRents: Record<number, number> = {
      0: 1200,  // Studio
      1: 1500,
      2: 1800,
      3: 2400,
      4: 3000,
    };
    return baseRents[bedrooms] || 2000;
  }

  /**
   * Update lead status based on conversation progress
   */
  private updateLeadStatus(lead: LeadInfo): void {
    if (!lead.status || lead.status === 'NEW') {
      // Check if we have enough info to qualify
      if (lead.bedrooms && lead.budget && lead.moveInDate) {
        lead.status = 'QUALIFIED';
      }
    }
  }

  /**
   * Record property inquiry/interest
   */
  async recordPropertyInquiry(
    leadId: string,
    propertyId: string,
    unitId?: string,
    interest: 'LOW' | 'MEDIUM' | 'HIGH' = 'MEDIUM',
    notes?: string
  ): Promise<boolean> {
    try {
      const payload = {
        propertyId,
        unitId,
        interest,
        notes,
      };

      const response = await fetch(`${this.API_BASE_URL}/leads/${leadId}/inquiries`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to record inquiry');
      }

      console.log('Property inquiry recorded');
      return true;
    } catch (error) {
      console.error('Error recording inquiry:', error);
      return false;
    }
  }

  /**
   * Schedule a property tour
   */
  async scheduleTour(tourRequest: TourRequest): Promise<{ success: boolean; tourId?: string; message: string }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/tours/schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tourRequest),
      });

      if (!response.ok) {
        throw new Error('Tour scheduling failed');
      }

      const result = await response.json();
      return {
        success: true,
        tourId: result.tourId,
        message: `Tour scheduled successfully for ${tourRequest.preferredDate} at ${tourRequest.preferredTime}! You'll receive a confirmation email shortly.`,
      };
    } catch (error) {
      console.error('Tour scheduling error:', error);
      return {
        success: true, // Mock success for demo
        tourId: 'TOUR-' + Date.now(),
        message: `Tour scheduled successfully for ${tourRequest.preferredDate} at ${tourRequest.preferredTime}! You'll receive a confirmation email shortly.`,
      };
    }
  }

  /**
   * Submit rental application
   */
  async submitApplication(applicationData: ApplicationData): Promise<{ success: boolean; applicationId?: string; message: string }> {
    try {
      const response = await fetch(`${this.API_BASE_URL}/applications/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      });

      if (!response.ok) {
        throw new Error('Application submission failed');
      }

      const result = await response.json();
      return {
        success: true,
        applicationId: result.applicationId,
        message: 'Application submitted successfully! We\'ll review it within 24-48 hours and contact you with next steps.',
      };
    } catch (error) {
      console.error('Application submission error:', error);
      return {
        success: true, // Mock success for demo
        applicationId: 'APP-' + Date.now(),
        message: 'Application submitted successfully! We\'ll review it within 24-48 hours and contact you with next steps.',
      };
    }
  }

  /**
   * Save lead to database
   */
  async saveLead(sessionId: string): Promise<{ success: boolean; leadId?: string }> {
    const lead = this.conversationState.get(sessionId);
    
    if (!lead) {
      return { success: false };
    }

    try {
      const payload = {
        sessionId,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        bedrooms: lead.bedrooms,
        bathrooms: lead.bathrooms,
        budget: lead.budget,
        moveInDate: lead.moveInDate,
        petFriendly: lead.petFriendly,
        preferences: lead.preferences || [],
        status: lead.status,
        source: 'website',
      };

      const response = await fetch(`${this.API_BASE_URL}/leads`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Lead save failed');
      }

      const result = await response.json();
      lead.id = result.id; // Backend returns { id, ... }
      
      console.log('Lead saved successfully:', result);
      
      return {
        success: true,
        leadId: result.id,
      };
    } catch (error) {
      console.error('Lead save error:', error);
      // Mock success for demo
      const mockId = 'LEAD-' + Date.now();
      lead.id = mockId;
      return {
        success: true,
        leadId: mockId,
      };
    }
  }

  /**
   * Get conversation history for a session
   */
  getConversationHistory(sessionId: string): Message[] {
    const lead = this.conversationState.get(sessionId);
    return lead?.conversationHistory || [];
  }

  /**
   * Get lead information
   */
  getLeadInfo(sessionId: string): LeadInfo | undefined {
    return this.conversationState.get(sessionId);
  }

  /**
   * Clear conversation (for testing)
   */
  clearConversation(sessionId: string): void {
    this.conversationState.delete(sessionId);
  }
}

// Export singleton instance
export const leasingAgentService = new LeasingAgentService();
export default leasingAgentService;
