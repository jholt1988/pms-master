# Voice AI Agent Architecture
**Property Management Suite - AI Implementation Plan**  
**Date:** November 11, 2025  
**Version:** 1.0

---

## Executive Summary

This document outlines the technical architecture for implementing two voice-enabled AI agents:
1. **AI Voice Receptionist** - Handles incoming calls, routes inquiries, schedules appointments, and manages emergencies
2. **AI Voice Leasing Agent** - Manages property inquiries, tour scheduling, application status, and lead qualification

Both agents leverage speech-to-text (STT), natural language understanding (NLU), and text-to-speech (TTS) technologies to provide 24/7 automated voice assistance.

---

## 1. System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Phone System Layer                           │
│                                                                       │
│  ┌──────────┐      ┌──────────┐      ┌──────────┐                  │
│  │ PSTN     │─────▶│  Twilio  │─────▶│ SIP Trunk│                  │
│  │ Landline │      │  Voice   │      │          │                  │
│  └──────────┘      └──────────┘      └──────────┘                  │
└────────────────────────────┬──────────────────────────────────────┘
                             │ WebSocket/HTTP
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Voice Processing Layer                            │
│                                                                       │
│  ┌───────────────┐  ┌────────────────┐  ┌────────────────┐         │
│  │ Speech-to-Text│  │ Natural Language│  │ Text-to-Speech │         │
│  │   (Deepgram)  │─▶│  Understanding  │─▶│   (ElevenLabs) │         │
│  │               │  │   (OpenAI GPT)  │  │                │         │
│  └───────────────┘  └────────────────┘  └────────────────┘         │
└────────────────────────────┬──────────────────────────────────────┘
                             │ REST API
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   AI Agent Service Layer                             │
│                          (NestJS)                                     │
│                                                                       │
│  ┌──────────────────────┐  ┌──────────────────────┐                │
│  │  Voice Receptionist  │  │  Voice Leasing Agent │                │
│  │     Service          │  │      Service         │                │
│  │                      │  │                      │                │
│  │  • Call routing      │  │  • Lead qualification│                │
│  │  • Appointment sched │  │  • Tour scheduling   │                │
│  │  • Emergency detect  │  │  • Application status│                │
│  │  • Message taking    │  │  • Property details  │                │
│  └──────────────────────┘  └──────────────────────┘                │
│              │                        │                              │
│              └────────┬───────────────┘                              │
│                       │                                              │
│  ┌────────────────────▼───────────────────────────┐                │
│  │         Conversation Manager                    │                │
│  │  • Session management                           │                │
│  │  • Context tracking                             │                │
│  │  • Intent classification                        │                │
│  │  • Dialog flow control                          │                │
│  └────────────────────┬───────────────────────────┘                │
└────────────────────────┼──────────────────────────────────────────┘
                         │ Prisma ORM
                         ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      Database Layer                                  │
│                      (PostgreSQL)                                    │
│                                                                       │
│  • VoiceCall records                                                 │
│  • VoiceTranscript logs                                             │
│  • LeadMessage history                                              │
│  • MaintenanceRequest (emergency detection)                         │
│  • ScheduleEvent (appointments)                                     │
│  • Property & Unit data                                             │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack Selection

### 2.1 Telephony Platform: **Twilio Voice**

**Why Twilio:**
- Industry-leading reliability (99.95% uptime SLA)
- WebSocket support for real-time streaming
- Built-in call recording and analytics
- Pay-as-you-go pricing ($0.013/min for US calls)
- Excellent documentation and SDK support
- SMS integration for follow-ups

**Alternatives Considered:**
- Vonage API (similar pricing, less documentation)
- Plivo (cheaper but limited features)
- AWS Connect (requires AWS ecosystem lock-in)

### 2.2 Speech-to-Text: **Deepgram**

**Why Deepgram:**
- Real-time streaming STT (sub-100ms latency)
- 95%+ accuracy on conversational speech
- Speaker diarization (multi-speaker support)
- Custom vocabulary for property terms
- $0.0043/min pricing (vs Google $0.024/min)
- WebSocket streaming API

**Alternatives Considered:**
- AssemblyAI ($0.00025/sec = $0.015/min) - Good alternative
- Google Speech-to-Text ($0.024/min) - More expensive
- Whisper (OpenAI) - Batch only, not real-time

### 2.3 Natural Language Understanding: **OpenAI GPT-4**

**Why GPT-4:**
- Superior intent detection and context understanding
- Function calling for API integration
- Conversational memory management
- Fine-tuning capability for property domain
- JSON mode for structured responses

**Configuration:**
```typescript
{
  model: "gpt-4-turbo",
  temperature: 0.7,
  max_tokens: 150,
  functions: [
    { name: "route_to_maintenance" },
    { name: "schedule_appointment" },
    { name: "create_lead" },
    { name: "book_tour" }
  ]
}
```

### 2.4 Text-to-Speech: **ElevenLabs**

**Why ElevenLabs:**
- Most natural-sounding AI voices (Turing-test level)
- Low latency streaming (200-300ms)
- Voice cloning capability (branded voice)
- Emotional tone control
- $0.30/1000 characters (~$0.018/min of speech)

**Voice Configuration:**
```typescript
{
  voice_id: "professional_female_1",
  model: "eleven_turbo_v2",
  stability: 0.5,
  similarity_boost: 0.75,
  style: 0.3, // Professional but friendly
  use_speaker_boost: true
}
```

**Alternatives:**
- Google Cloud TTS (robotic)
- Amazon Polly (good quality, $4/1M chars)
- Play.ht (similar to ElevenLabs)

---

## 3. Database Schema Extensions

### 3.1 New Models Required

```prisma
// Voice call tracking
model VoiceCall {
  id                String              @id @default(uuid())
  twilioCallSid     String              @unique
  agentType         VoiceAgentType      // RECEPTIONIST | LEASING_AGENT
  phoneNumber       String
  direction         CallDirection       // INBOUND | OUTBOUND
  status            CallStatus          // RINGING | IN_PROGRESS | COMPLETED | FAILED
  duration          Int?                // seconds
  startTime         DateTime
  endTime           DateTime?
  recordingUrl      String?
  
  // Linked entities
  lead              Lead?               @relation(fields: [leadId], references: [id])
  leadId            Int?
  maintenanceReq    MaintenanceRequest? @relation(fields: [maintenanceReqId], references: [id])
  maintenanceReqId  Int?
  scheduleEvent     ScheduleEvent?      @relation(fields: [scheduleEventId], references: [id])
  scheduleEventId   Int?
  
  // Conversation data
  transcripts       VoiceTranscript[]
  intents           CallIntent[]
  sentiment         String?             // POSITIVE | NEUTRAL | NEGATIVE
  escalated         Boolean             @default(false)
  escalationReason  String?
  
  // Metadata
  metadata          Json?               // Store custom fields
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
  
  @@index([agentType, status])
  @@index([phoneNumber])
  @@index([startTime])
}

// Conversation transcripts
model VoiceTranscript {
  id                Int                 @id @default(autoincrement())
  call              VoiceCall           @relation(fields: [callId], references: [id])
  callId            String
  speaker           SpeakerType         // USER | AGENT
  text              String
  confidence        Float?              // STT confidence score
  timestamp         DateTime
  audioUrl          String?             // Link to audio segment
  
  @@index([callId, timestamp])
}

// Intent detection tracking
model CallIntent {
  id                Int                 @id @default(autoincrement())
  call              VoiceCall           @relation(fields: [callId], references: [id])
  callId            String
  intent            String              // maintenance_request, schedule_tour, etc.
  confidence        Float
  entities          Json                // Extracted entities
  handled           Boolean             @default(false)
  timestamp         DateTime            @default(now())
  
  @@index([callId, intent])
}

// Voice agent configuration
model VoiceAgentConfig {
  id                Int                 @id @default(autoincrement())
  agentType         VoiceAgentType      @unique
  enabled           Boolean             @default(true)
  phoneNumber       String?             // Twilio number
  greeting          String
  maxCallDuration   Int                 @default(600) // 10 minutes
  
  // AI Configuration
  sttProvider       String              @default("deepgram")
  ttsProvider       String              @default("elevenlabs")
  nluProvider       String              @default("openai")
  voiceId           String?
  
  // Business rules
  operatingHours    Json?               // Business hours config
  holidayCalendar   Json?
  escalationRules   Json?
  
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            @updatedAt
}

enum VoiceAgentType {
  RECEPTIONIST
  LEASING_AGENT
}

enum CallDirection {
  INBOUND
  OUTBOUND
}

enum CallStatus {
  RINGING
  IN_PROGRESS
  COMPLETED
  FAILED
  NO_ANSWER
  BUSY
  CANCELED
}

enum SpeakerType {
  USER
  AGENT
}
```

### 3.2 Existing Model Extensions

```prisma
// Extend Lead model for voice integration
model Lead {
  // ... existing fields ...
  voiceCalls        VoiceCall[]
  preferredContact  ContactMethod       @default(EMAIL)
  callbackRequested Boolean             @default(false)
  callbackTime      DateTime?
  timezone          String?             @default("America/New_York")
}

enum ContactMethod {
  EMAIL
  PHONE
  SMS
  ANY
}

// Extend MaintenanceRequest for voice-created requests
model MaintenanceRequest {
  // ... existing fields ...
  voiceCalls        VoiceCall[]
  createdByVoice    Boolean             @default(false)
  voiceNotes        String?
}

// Extend ScheduleEvent for voice-scheduled appointments
model ScheduleEvent {
  // ... existing fields ...
  voiceCalls        VoiceCall[]
  scheduledByVoice  Boolean             @default(false)
  confirmationSent  Boolean             @default(false)
}
```

---

## 4. AI Voice Receptionist Architecture

### 4.1 Capabilities & Intent Types

```typescript
enum ReceptionistIntent {
  // Routing
  ROUTE_TO_MAINTENANCE = 'route_to_maintenance',
  ROUTE_TO_LEASING = 'route_to_leasing',
  ROUTE_TO_PAYMENTS = 'route_to_payments',
  ROUTE_TO_MANAGER = 'route_to_manager',
  
  // Scheduling
  SCHEDULE_APPOINTMENT = 'schedule_appointment',
  CANCEL_APPOINTMENT = 'cancel_appointment',
  RESCHEDULE_APPOINTMENT = 'reschedule_appointment',
  CHECK_AVAILABILITY = 'check_availability',
  
  // Emergency
  EMERGENCY_MAINTENANCE = 'emergency_maintenance',
  SECURITY_ISSUE = 'security_issue',
  
  // Information
  GET_HOURS = 'get_hours',
  GET_DIRECTIONS = 'get_directions',
  GENERAL_INQUIRY = 'general_inquiry',
  
  // Message
  LEAVE_MESSAGE = 'leave_message',
  SPEAK_TO_HUMAN = 'speak_to_human'
}
```

### 4.2 Conversation Flow

```typescript
interface ConversationFlow {
  // Initial greeting
  greeting: {
    message: "Thank you for calling [Property Name]. This is your AI assistant. How may I help you today?",
    listenFor: ['intent', 'keywords'],
    timeout: 5 // seconds
  },
  
  // Intent classification
  intentDetection: {
    confidence_threshold: 0.75,
    fallback: "I'm not sure I understood. Could you tell me if you're calling about maintenance, leasing, payments, or something else?"
  },
  
  // Routing logic
  routing: {
    maintenance: {
      emergency_keywords: ['emergency', 'urgent', 'flooding', 'fire', 'gas', 'broken'],
      escalate_immediately: ['fire', 'gas leak', 'break-in'],
      collect_info: ['name', 'unit_number', 'issue_description', 'callback_number']
    },
    leasing: {
      transfer_to: 'LEASING_AGENT',
      message: "I'll transfer you to our leasing specialist who can help with property information and tours."
    },
    after_hours: {
      emergency_only: true,
      message: "Our office is currently closed. For maintenance emergencies, press 1. To leave a message, press 2."
    }
  }
}
```

### 4.3 Emergency Detection System

```typescript
interface EmergencyDetector {
  // Critical keywords (immediate escalation)
  critical: string[] = [
    'fire', 'smoke', 'flames',
    'gas leak', 'smell gas',
    'break-in', 'intruder', 'burglary',
    'flood', 'major leak', 'water everywhere',
    'no heat', 'freezing', // if winter
    'electrical fire', 'sparks'
  ];
  
  // High priority (create ticket, notify on-call)
  high_priority: string[] = [
    'no power', 'power out',
    'no water', 'water off',
    'lock out', 'locked out',
    'broken window',
    'heater not working',
    'AC not working' // if summer
  ];
  
  // Detection logic
  detect(transcript: string): EmergencyLevel {
    const normalized = transcript.toLowerCase();
    
    for (const keyword of this.critical) {
      if (normalized.includes(keyword)) {
        return {
          level: 'CRITICAL',
          keyword,
          action: 'IMMEDIATE_ESCALATION',
          notify: ['on_call_manager', 'emergency_services']
        };
      }
    }
    
    for (const keyword of this.high_priority) {
      if (normalized.includes(keyword)) {
        return {
          level: 'HIGH',
          keyword,
          action: 'CREATE_URGENT_TICKET',
          notify: ['on_call_technician']
        };
      }
    }
    
    return { level: 'NORMAL' };
  }
}
```

### 4.4 Appointment Scheduling Logic

```typescript
class ReceptionistScheduler {
  async scheduleAppointment(
    intent: string,
    availableSlots: TimeSlot[],
    userPreference?: DateTime
  ): Promise<ScheduleResult> {
    // 1. Check availability
    const slots = await this.getAvailableSlots(intent);
    
    // 2. Conversational scheduling
    if (userPreference) {
      const closest = this.findClosestSlot(slots, userPreference);
      return {
        slot: closest,
        confirmation: `I can schedule you for ${closest.format()}. Does that work for you?`
      };
    }
    
    // 3. Offer next 3 available slots
    const options = slots.slice(0, 3);
    return {
      options,
      message: `I have availability on ${this.formatOptions(options)}. Which time works best for you?`
    };
  }
  
  // Slot availability based on intent type
  getAvailableSlots(intent: string): TimeSlot[] {
    switch (intent) {
      case 'maintenance_inspection':
        return this.technicianAvailability();
      case 'property_tour':
        return this.leasingAgentAvailability();
      case 'manager_meeting':
        return this.managerAvailability();
      default:
        return this.generalAvailability();
    }
  }
}
```

---

## 5. AI Voice Leasing Agent Architecture

### 5.1 Capabilities & Intent Types

```typescript
enum LeasingAgentIntent {
  // Lead Qualification
  QUALIFY_LEAD = 'qualify_lead',
  GET_BUDGET = 'get_budget',
  GET_MOVE_IN_DATE = 'get_move_in_date',
  GET_REQUIREMENTS = 'get_requirements', // beds, baths, pets, etc.
  
  // Property Information
  GET_AVAILABILITY = 'get_availability',
  GET_AMENITIES = 'get_amenities',
  GET_PRICING = 'get_pricing',
  GET_FLOOR_PLANS = 'get_floor_plans',
  GET_PET_POLICY = 'get_pet_policy',
  GET_PARKING = 'get_parking',
  
  // Tour Scheduling
  SCHEDULE_TOUR = 'schedule_tour',
  VIRTUAL_TOUR = 'virtual_tour',
  CANCEL_TOUR = 'cancel_tour',
  
  // Application Process
  APPLICATION_STATUS = 'application_status',
  APPLICATION_REQUIREMENTS = 'application_requirements',
  START_APPLICATION = 'start_application',
  
  // Follow-up
  REQUEST_INFO = 'request_info',
  CALLBACK_REQUEST = 'callback_request'
}
```

### 5.2 Lead Qualification Flow

```typescript
interface LeadQualificationFlow {
  // Progressive information gathering
  stages: [
    {
      stage: 1,
      question: "Great! I'd love to help you find the perfect place. What type of unit are you looking for?",
      collect: ['bedrooms', 'bathrooms'],
      parse_entities: true
    },
    {
      stage: 2,
      question: "And when are you looking to move in?",
      collect: ['move_in_date'],
      validate: (date) => date > now() && date < now() + 180 days
    },
    {
      stage: 3,
      question: "What's your monthly budget range?",
      collect: ['budget_min', 'budget_max'],
      parse_numbers: true
    },
    {
      stage: 4,
      question: "Do you have any pets?",
      collect: ['has_pets', 'pet_type', 'pet_count'],
      conditional: true
    },
    {
      stage: 5,
      action: 'match_properties',
      then: 'present_options'
    }
  ];
  
  // Lead scoring
  scoring: {
    budget_match: 30,      // Budget aligns with available units
    timeline_urgent: 25,    // Move-in < 30 days
    timeline_ready: 15,     // Move-in 30-60 days
    requirements_match: 20, // Bed/bath match availability
    qualified_tenant: 10    // Has good answers to screening questions
  };
}
```

### 5.3 Property Matching & Recommendation

```typescript
class PropertyMatcher {
  async findMatchingUnits(leadCriteria: LeadCriteria): Promise<UnitMatch[]> {
    const {
      bedrooms,
      bathrooms,
      budget_min,
      budget_max,
      move_in_date,
      has_pets,
      pet_type
    } = leadCriteria;
    
    // Query available units
    const units = await prisma.unit.findMany({
      where: {
        status: 'AVAILABLE',
        bedrooms: bedrooms || { gte: 1 },
        bathrooms: bathrooms || { gte: 1 },
        rent: {
          gte: budget_min * 0.9, // 10% flexibility
          lte: budget_max * 1.1
        },
        property: {
          petsAllowed: has_pets ? true : undefined
        }
      },
      include: {
        property: true
      },
      orderBy: {
        rent: 'asc'
      },
      take: 5
    });
    
    // Score and rank
    return units.map(unit => ({
      unit,
      score: this.calculateMatchScore(unit, leadCriteria),
      highlights: this.generateHighlights(unit, leadCriteria)
    })).sort((a, b) => b.score - a.score);
  }
  
  // Generate conversational description
  generatePresentationScript(matches: UnitMatch[]): string {
    if (matches.length === 0) {
      return "I don't have any units that match those exact requirements right now, but let me check what's coming available soon...";
    }
    
    const best = matches[0];
    return `Great news! I have ${matches.length} units that match what you're looking for. 
            The best match is a ${best.unit.bedrooms} bedroom, ${best.unit.bathrooms} bath at 
            ${best.unit.property.name} for $${best.unit.rent} per month. 
            ${best.highlights.join(', ')}. 
            Would you like to schedule a tour?`;
  }
}
```

### 5.4 Tour Scheduling Integration

```typescript
class TourScheduler {
  async scheduleTour(
    lead: Lead,
    unitIds: number[],
    preferredDate?: DateTime
  ): Promise<TourBooking> {
    // 1. Check leasing agent availability
    const availability = await this.getLeasingAgentAvailability(preferredDate);
    
    // 2. Find optimal tour time (group multiple units if same property)
    const tourSlots = this.optimizeTourRoute(unitIds, availability);
    
    // 3. Book calendar slot
    const event = await prisma.scheduleEvent.create({
      data: {
        type: 'PROPERTY_TOUR',
        title: `Property Tour - ${lead.name}`,
        startTime: tourSlots[0].start,
        endTime: tourSlots[tourSlots.length - 1].end,
        location: tourSlots[0].property.address,
        scheduledByVoice: true,
        metadata: {
          leadId: lead.id,
          unitIds,
          phoneNumber: lead.phone
        }
      }
    });
    
    // 4. Send confirmations
    await this.sendTourConfirmation(lead, event);
    
    return {
      event,
      confirmation_message: `Perfect! I've scheduled your tour for ${event.startTime.format('MMMM Do [at] h:mm A')}. 
                             You'll receive a confirmation via ${lead.preferredContact}. 
                             Is there anything else I can help you with?`
    };
  }
  
  async sendTourConfirmation(lead: Lead, event: ScheduleEvent): Promise<void> {
    if (lead.preferredContact === 'SMS' || lead.preferredContact === 'PHONE') {
      await twilioClient.messages.create({
        to: lead.phone,
        from: process.env.TWILIO_PHONE_NUMBER,
        body: `Hi ${lead.name}! Your property tour is confirmed for ${event.startTime.format()}. Address: ${event.location}. Reply CANCEL to cancel.`
      });
    }
    
    if (lead.preferredContact === 'EMAIL' || lead.preferredContact === 'ANY') {
      await emailService.sendTourConfirmation(lead.email, event);
    }
  }
}
```

---

## 6. Conversation Manager Implementation

### 6.1 Session Management

```typescript
class ConversationManager {
  private sessions: Map<string, ConversationSession> = new Map();
  
  async handleIncomingCall(twilioCallSid: string, fromNumber: string): Promise<void> {
    // Create session
    const session = new ConversationSession({
      callSid: twilioCallSid,
      phoneNumber: fromNumber,
      agentType: this.detectAgentType(fromNumber), // Based on dialed number
      context: await this.loadContext(fromNumber),
      state: 'GREETING'
    });
    
    this.sessions.set(twilioCallSid, session);
    
    // Start conversation
    await this.sendGreeting(session);
  }
  
  async handleSpeech(callSid: string, transcript: string): Promise<void> {
    const session = this.sessions.get(callSid);
    if (!session) throw new Error('Session not found');
    
    // 1. Save transcript
    await this.saveTranscript(callSid, 'USER', transcript);
    
    // 2. Detect intent
    const intent = await this.detectIntent(transcript, session.context);
    
    // 3. Update context
    session.context.addUserMessage(transcript);
    session.context.currentIntent = intent;
    
    // 4. Generate response
    const response = await this.generateResponse(session, intent);
    
    // 5. Execute actions
    await this.executeActions(session, intent);
    
    // 6. Synthesize and send speech
    await this.sendSpeech(callSid, response);
    
    // 7. Save assistant transcript
    await this.saveTranscript(callSid, 'AGENT', response);
  }
  
  async loadContext(phoneNumber: string): Promise<ConversationContext> {
    // Check if returning caller
    const recentCalls = await prisma.voiceCall.findMany({
      where: {
        phoneNumber,
        startTime: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // 30 days
      },
      include: {
        lead: true,
        transcripts: true
      },
      orderBy: { startTime: 'desc' },
      take: 5
    });
    
    return {
      isReturningCaller: recentCalls.length > 0,
      previousIntents: recentCalls.map(c => c.intents).flat(),
      lead: recentCalls[0]?.lead,
      conversationHistory: recentCalls[0]?.transcripts || []
    };
  }
}
```

### 6.2 Intent Detection with OpenAI

```typescript
class IntentDetector {
  async detectIntent(
    transcript: string,
    context: ConversationContext
  ): Promise<IntentResult> {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      temperature: 0.3, // Low for consistency
      messages: [
        {
          role: "system",
          content: this.getSystemPrompt(context.agentType)
        },
        ...context.conversationHistory.map(msg => ({
          role: msg.speaker === 'USER' ? 'user' : 'assistant',
          content: msg.text
        })),
        {
          role: "user",
          content: transcript
        }
      ],
      functions: this.getFunctionDefinitions(context.agentType),
      function_call: "auto"
    });
    
    const message = completion.choices[0].message;
    
    if (message.function_call) {
      return {
        intent: message.function_call.name,
        confidence: 0.9, // Function calls are high confidence
        entities: JSON.parse(message.function_call.arguments),
        requiresAction: true
      };
    }
    
    // Fallback to content classification
    return this.classifyIntent(message.content);
  }
  
  getSystemPrompt(agentType: VoiceAgentType): string {
    if (agentType === 'RECEPTIONIST') {
      return `You are a professional AI receptionist for a property management company.
              Your job is to:
              1. Greet callers warmly
              2. Understand their needs (maintenance, leasing, payments, emergencies)
              3. Route calls appropriately
              4. Schedule appointments
              5. Take messages
              6. Handle emergencies with urgency
              
              Be concise, professional, and empathetic. For emergencies, act quickly.
              Always confirm important details (name, unit number, callback number).`;
    } else {
      return `You are a professional AI leasing agent for a property management company.
              Your job is to:
              1. Qualify potential tenants (budget, move-in date, requirements)
              2. Match them with available properties
              3. Answer questions about amenities, pricing, policies
              4. Schedule property tours
              5. Guide them through the application process
              
              Be enthusiastic about properties, consultative, and build rapport.
              Ask qualifying questions naturally in conversation.`;
    }
  }
}
```

### 6.3 Response Generation

```typescript
class ResponseGenerator {
  async generateResponse(
    session: ConversationSession,
    intent: IntentResult
  ): Promise<string> {
    // Use template responses for common intents (faster, cheaper)
    if (this.hasTemplate(intent.intent)) {
      return this.fillTemplate(intent.intent, intent.entities, session.context);
    }
    
    // Use GPT for complex/contextual responses
    return await this.generateDynamicResponse(session, intent);
  }
  
  // Template-based responses (fast path)
  private templates: Record<string, (entities: any, context: any) => string> = {
    schedule_appointment: (entities, context) => 
      `I'd be happy to schedule an appointment for you. ${
        entities.preferred_date 
          ? `I have availability on ${entities.preferred_date}. Does ${entities.preferred_time} work for you?`
          : 'What day works best for you?'
      }`,
    
    emergency_maintenance: (entities, context) => 
      `I understand this is urgent. I'm creating an emergency maintenance request right now. 
       Can you confirm your unit number and the best callback number?`,
    
    get_availability: (entities, context) => {
      const units = context.matchedUnits || [];
      if (units.length === 0) {
        return "Let me check what we have available. What size unit are you looking for?";
      }
      return `We currently have ${units.length} units available that match your needs. 
              ${this.describeTopUnits(units)}. Would you like to schedule a tour?`;
    }
  };
  
  // GPT-based responses (for complex cases)
  async generateDynamicResponse(
    session: ConversationSession,
    intent: IntentResult
  ): Promise<string> {
    const completion = await openai.chat.completions.create({
      model: "gpt-4-turbo",
      temperature: 0.7,
      max_tokens: 150,
      messages: [
        { role: "system", content: this.getSystemPrompt(session.agentType) },
        ...session.context.conversationHistory,
        {
          role: "user",
          content: `Generate a natural response for intent: ${intent.intent} with entities: ${JSON.stringify(intent.entities)}`
        }
      ]
    });
    
    return completion.choices[0].message.content;
  }
}
```

---

## 7. Integration Points

### 7.1 Twilio Voice Integration

```typescript
// Backend: voice-agent/voice-agent.controller.ts
@Controller('voice-agent')
export class VoiceAgentController {
  @Post('twilio/incoming')
  async handleIncomingCall(
    @Body() body: TwilioIncomingRequest
  ): Promise<TwiMLResponse> {
    const { CallSid, From, To } = body;
    
    // Determine agent type based on phone number called
    const agentType = this.getAgentType(To);
    
    // Create call record
    const call = await this.voiceService.createCall({
      twilioCallSid: CallSid,
      phoneNumber: From,
      direction: 'INBOUND',
      agentType,
      status: 'IN_PROGRESS'
    });
    
    // Return TwiML to start streaming
    const twiml = new VoiceResponse();
    const connect = twiml.connect();
    connect.stream({
      url: `wss://${process.env.DOMAIN}/voice-agent/stream`,
      track: 'both_tracks'
    });
    
    // Also play greeting while establishing WebSocket
    twiml.say(await this.getGreeting(agentType));
    
    return twiml.toString();
  }
  
  @WebSocketGateway({ path: '/voice-agent/stream' })
  handleStream(
    @MessageBody() data: TwilioStreamData,
    @ConnectedSocket() client: Socket
  ): void {
    const { event, streamSid, media } = data;
    
    if (event === 'media') {
      // Audio chunk from Twilio (mulaw encoded)
      const audioChunk = Buffer.from(media.payload, 'base64');
      
      // Send to Deepgram for STT
      this.deepgramService.processAudio(streamSid, audioChunk);
    }
    
    if (event === 'start') {
      // Stream started
      this.deepgramService.initStream(streamSid);
    }
    
    if (event === 'stop') {
      // Stream ended
      this.deepgramService.closeStream(streamSid);
      this.conversationManager.endSession(streamSid);
    }
  }
}
```

### 7.2 Deepgram STT Integration

```typescript
// services/deepgram.service.ts
@Injectable()
export class DeepgramService {
  private streams: Map<string, DeepgramStream> = new Map();
  
  async initStream(streamSid: string): Promise<void> {
    const deepgram = new Deepgram(process.env.DEEPGRAM_API_KEY);
    
    const stream = deepgram.transcription.live({
      model: 'nova-2',
      language: 'en-US',
      punctuate: true,
      interim_results: false,
      endpointing: 400, // ms of silence before finalizing
      keywords: ['maintenance', 'emergency', 'leasing', 'apartment:2'] // Boost property terms
    });
    
    stream.on('transcript', async (data) => {
      if (data.is_final) {
        const transcript = data.channel.alternatives[0].transcript;
        const confidence = data.channel.alternatives[0].confidence;
        
        // Send to conversation manager
        await this.conversationManager.handleSpeech(
          streamSid,
          transcript,
          confidence
        );
      }
    });
    
    this.streams.set(streamSid, stream);
  }
  
  processAudio(streamSid: string, audioChunk: Buffer): void {
    const stream = this.streams.get(streamSid);
    if (stream) {
      // Convert from mulaw to linear16 if needed
      const pcmAudio = this.convertMulawToPCM(audioChunk);
      stream.send(pcmAudio);
    }
  }
}
```

### 7.3 ElevenLabs TTS Integration

```typescript
// services/elevenlabs.service.ts
@Injectable()
export class ElevenLabsService {
  async synthesizeSpeech(
    text: string,
    voiceId: string = 'professional_female_1'
  ): Promise<Buffer> {
    const response = await axios.post(
      `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream`,
      {
        text,
        model_id: 'eleven_turbo_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.3,
          use_speaker_boost: true
        }
      },
      {
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        responseType: 'arraybuffer'
      }
    );
    
    return Buffer.from(response.data);
  }
  
  async streamToTwilio(
    callSid: string,
    text: string
  ): Promise<void> {
    const audioBuffer = await this.synthesizeSpeech(text);
    
    // Convert to mulaw for Twilio
    const mulawAudio = this.convertPCMToMulaw(audioBuffer);
    
    // Stream to Twilio via Media Streams API
    const base64Audio = mulawAudio.toString('base64');
    
    await this.twilioStream.send({
      event: 'media',
      streamSid: callSid,
      media: {
        payload: base64Audio
      }
    });
  }
}
```

---

## 8. Cost Analysis & Scalability

### 8.1 Per-Call Cost Breakdown

```
Assuming average 3-minute call:

Twilio Voice:
- Inbound call: $0.013/min × 3 = $0.039
- Recording storage: $0.0025/min × 3 = $0.0075
- Subtotal: $0.0465

Deepgram STT:
- Real-time transcription: $0.0043/min × 3 = $0.0129

OpenAI GPT-4:
- ~10 turns × 500 tokens/turn = 5,000 tokens
- Input: 5,000 × $0.01/1K = $0.05
- Output: 2,000 × $0.03/1K = $0.06
- Subtotal: $0.11

ElevenLabs TTS:
- ~200 words × 6 chars/word = 1,200 characters
- $0.30/1,000 chars × 1.2 = $0.36

TOTAL PER CALL: ~$0.53
```

### 8.2 Monthly Cost Projections

```
Conservative (50 calls/month):
50 calls × $0.53 = $26.50/month

Moderate (200 calls/month):
200 calls × $0.53 = $106/month

High Volume (1,000 calls/month):
1,000 calls × $0.53 = $530/month

Enterprise discounts available at >5,000 calls/month
```

### 8.3 Scaling Strategy

```typescript
// Phase 1: Single Instance (0-500 calls/month)
- Single NestJS server with voice-agent module
- In-memory session management
- Direct API calls (no queue)

// Phase 2: Horizontal Scaling (500-5,000 calls/month)
- Load-balanced NestJS instances
- Redis for session state
- RabbitMQ for async task processing
- Separate worker for STT/TTS processing

// Phase 3: Microservices (5,000+ calls/month)
- Dedicated Voice Gateway service
- Separate STT/TTS processing cluster
- Distributed tracing (OpenTelemetry)
- CDN for audio caching
```

---

## 9. Testing & Quality Assurance

### 9.1 Test Scenarios

```typescript
// test/voice-agent/receptionist.e2e-spec.ts
describe('Voice Receptionist E2E Tests', () => {
  it('should handle emergency maintenance call', async () => {
    const call = await simulateCall({
      transcript: "Hi, I have a gas leak in my apartment!",
      expectedIntent: 'EMERGENCY_MAINTENANCE',
      expectedActions: [
        'create_maintenance_request',
        'notify_on_call_manager',
        'collect_unit_number'
      ]
    });
    
    expect(call.status).toBe('ESCALATED');
    expect(call.escalationReason).toContain('gas leak');
  });
  
  it('should schedule appointment', async () => {
    const call = await simulateCall({
      transcript: "I'd like to schedule a maintenance appointment for tomorrow",
      expectedIntent: 'SCHEDULE_APPOINTMENT',
      expectedActions: ['check_availability', 'create_schedule_event']
    });
    
    expect(call.scheduleEvent).toBeDefined();
    expect(call.scheduleEvent.type).toBe('MAINTENANCE_APPOINTMENT');
  });
  
  it('should transfer to leasing agent', async () => {
    const call = await simulateCall({
      transcript: "I'm looking for a 2 bedroom apartment",
      expectedIntent: 'ROUTE_TO_LEASING',
      expectedActions: ['transfer_call']
    });
    
    expect(call.transferredTo).toBe('LEASING_AGENT');
  });
});
```

### 9.2 Quality Metrics

```typescript
interface VoiceAgentMetrics {
  // Performance
  average_call_duration: number;
  intent_detection_accuracy: number; // Target: >85%
  speech_recognition_accuracy: number; // Target: >90%
  
  // User Experience
  call_completion_rate: number; // Target: >80%
  escalation_rate: number; // Target: <15%
  customer_satisfaction: number; // Post-call survey, Target: >4/5
  
  // Business Impact
  calls_handled_vs_human: number; // Target: 70% automation
  average_resolution_time: number;
  cost_per_call: number;
  
  // Technical
  p95_latency_ms: number; // Target: <500ms
  error_rate: number; // Target: <2%
  uptime: number; // Target: 99.5%
}
```

---

## 10. Deployment & Operations

### 10.1 Deployment Checklist

```bash
# 1. Infrastructure Setup
□ Provision Twilio phone numbers (1 for receptionist, 1 for leasing)
□ Configure Twilio webhook URLs
□ Set up SSL certificates for WebSocket endpoints
□ Configure firewall rules for Twilio IPs

# 2. API Keys & Secrets
□ TWILIO_ACCOUNT_SID
□ TWILIO_AUTH_TOKEN
□ TWILIO_PHONE_RECEPTIONIST
□ TWILIO_PHONE_LEASING
□ DEEPGRAM_API_KEY
□ OPENAI_API_KEY
□ ELEVENLABS_API_KEY

# 3. Database Migration
□ Run voice agent schema migration
□ Create indexes for performance
□ Set up backup policies

# 4. Service Configuration
□ Configure business hours
□ Set up holiday calendar
□ Define escalation rules
□ Configure on-call rotations

# 5. Testing
□ End-to-end test calls
□ Load testing (50 concurrent calls)
□ Emergency scenario drills
□ Failover testing
```

### 10.2 Monitoring & Alerts

```typescript
// monitoring/voice-agent.alerts.ts
export const voiceAgentAlerts = [
  {
    name: 'High Error Rate',
    condition: 'error_rate > 5%',
    action: 'page_on_call_engineer',
    severity: 'critical'
  },
  {
    name: 'High Latency',
    condition: 'p95_latency > 1000ms',
    action: 'notify_slack',
    severity: 'warning'
  },
  {
    name: 'Call Abandonment',
    condition: 'abandonment_rate > 20%',
    action: 'notify_product_team',
    severity: 'warning'
  },
  {
    name: 'Emergency Call Missed',
    condition: 'emergency_intent && !handled',
    action: 'page_manager_immediately',
    severity: 'critical'
  },
  {
    name: 'API Quota Exceeded',
    condition: 'api_quota_remaining < 10%',
    action: 'notify_ops_team',
    severity: 'high'
  }
];
```

---

## 11. Future Enhancements

### Phase 2 (6-12 months)
- **Multilingual Support**: Spanish, Mandarin STT/TTS
- **Sentiment Analysis**: Real-time emotion detection for escalation
- **Proactive Calling**: Appointment reminders, lease renewal outreach
- **Integration with CRM**: Salesforce, HubSpot sync

### Phase 3 (12-18 months)
- **Voice Biometrics**: Caller identification via voice print
- **Advanced NLP**: Custom fine-tuned models for property domain
- **Video Support**: Virtual tours with screen sharing
- **Analytics Dashboard**: Call insights, trend analysis, agent performance

---

## Appendices

### A. Sample Conversation Flows

**Receptionist - Emergency Scenario:**
```
Agent: Thank you for calling Sunset Apartments. How may I help you?
User: There's water pouring from my ceiling!
Agent: That sounds urgent. I'm creating an emergency maintenance request right now. 
       Can you tell me your unit number?
User: Unit 304
Agent: Unit 304, got it. And the best phone number to reach you?
User: 555-0123
Agent: Perfect. I've dispatched our emergency maintenance team and they'll call you 
       at 555-0123 within 15 minutes. For immediate action, you may also want to 
       turn off your water main if accessible. Is there anything else urgent?
```

**Leasing Agent - Tour Scheduling:**
```
Agent: Hi! Thanks for your interest in Sunset Apartments. I'd love to help you 
       find your next home. What are you looking for?
User: I need a 2 bedroom place, under $2000, and I have a dog.
Agent: Great! We're dog-friendly and I have three 2-bedroom units available in your 
       budget. The closest match is $1,850/month with a private patio - perfect for 
       your pup. When are you looking to move in?
User: Next month
Agent: Perfect timing! Would you like to schedule a tour? I have availability 
       tomorrow at 2 PM or Wednesday at 10 AM.
User: Tomorrow at 2 works
Agent: Excellent! I've scheduled your tour for tomorrow at 2 PM. You'll receive a 
       confirmation text shortly. Can I get your name and phone number?
```

### B. Error Handling Playbook

| Error Type | Detection | Recovery | User Communication |
|------------|-----------|----------|-------------------|
| STT Failure | No transcript for 5s | Ask user to repeat | "I'm sorry, I didn't catch that. Could you repeat?" |
| TTS Failure | Audio generation error | Use backup TTS | Transparent to user |
| API Timeout | >30s wait | Graceful degradation | "I'm experiencing technical difficulties. Let me transfer you." |
| Intent Confusion | Confidence <0.5 | Ask clarifying question | "I want to make sure I help you correctly. Are you calling about...?" |
| Database Error | Write failure | Queue for retry | "I've noted your request and will follow up shortly." |

---

**Document Version:** 1.0  
**Last Updated:** November 11, 2025  
**Next Review:** December 1, 2025
