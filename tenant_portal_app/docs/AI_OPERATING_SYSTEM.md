# AI Operating System Documentation

## Overview

The AI Operating System (AIOperatingSystem) is a unified, intelligent AI-powered assistant that provides comprehensive support for property management operations. It replaces the previous ChatbotService with enhanced capabilities including natural language command processing, voice input, context awareness, and seamless integration with all AI services.

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Command Processing](#command-processing)
- [Voice Input](#voice-input)
- [Context Awareness](#context-awareness)
- [Service Integration](#service-integration)
- [Configuration](#configuration)
- [Examples](#examples)
- [Migration Guide](#migration-guide)
- [Troubleshooting](#troubleshooting)

## Features

### Core Capabilities

- **Intelligent Conversations**: FAQ-based responses with LLM fallback via backend API
- **Command Processing**: Natural language commands that execute actual actions
- **Voice Input**: Web Speech API integration for hands-free interaction
- **Context Awareness**: Tracks user role, current page, and provides proactive suggestions
- **Service Integration**: Seamlessly integrates with LeasingAgent, RentOptimization, and other AI services
- **Session Management**: Maintains conversation history and context across sessions
- **Error Handling**: Graceful fallbacks and user-friendly error messages

### Supported Commands

- **Draft Lease Renewal** → Opens lease renewal page
- **Analyze Market Rates** → Calls RentOptimizationService or navigates to rent optimization dashboard
- **Show Vacancies** → Opens property search page
- **Email All Tenants** → Opens bulk messaging composer
- **Schedule Tour** → Opens tour scheduling page
- **Create Maintenance Request** → Opens maintenance request form

## Architecture

### Component Structure

```
AIOperatingSystem (UI Component)
    ↓
AIOperatingSystemService (Unified Service)
    ├── ChatbotService functionality (FAQ + LLM)
    ├── Command Processor
    ├── LeasingAgentService integration
    ├── RentOptimizationService integration
    └── Context Manager
```

### Service Layer

The `AIOperatingSystemService` is the core service that:

1. **Unifies AI Services**: Absorbs ChatbotService functionality and integrates with other AI services
2. **Processes Commands**: Recognizes and executes natural language commands
3. **Manages Sessions**: Maintains conversation history and user context
4. **Handles Responses**: Generates intelligent responses via FAQ matching or LLM API

### Data Flow

```
User Input (Text/Voice)
    ↓
AIOperatingSystem Component
    ↓
AIOperatingSystemService.sendMessage()
    ↓
[Command?] → Command Processor → Execute Action
[Query?] → Intent Detection → FAQ/LLM Response
    ↓
Response + Suggested Actions
    ↓
UI Update
```

## Getting Started

### Installation

The AIOperatingSystem is already integrated into the application. No additional installation is required.

### Basic Usage

The AIOperatingSystem component is available in the Topbar and can be accessed via the AI Assistant button:

```tsx
import { AIOperatingSystem } from './components/ui/AIOperatingSystem';

// Already integrated in Topbar.tsx
<AIOperatingSystem />
```

### Accessing the AI Assistant

1. Click the **AI ASSISTANT** button in the top navigation bar
2. The holographic interface overlay will open
3. Type your question or command in the input field
4. Click **Send** or press **Enter**

## Usage

### Text Input

Simply type your question or command in the input field:

```
"How do I submit a maintenance request?"
"Draft lease renewal"
"Analyze market rates for my property"
```

### Voice Input

1. Click the microphone button (if supported in your browser)
2. Speak your question or command
3. The system will automatically transcribe and send your message

**Browser Support**: Chrome, Edge, Safari (WebKit-based browsers)

### Quick Actions

Use the quick action buttons at the bottom of the input area for common commands:

- Draft Lease Renewal
- Analyze Market Rates
- Show Vacancies
- Email All Tenants

### Suggested Actions

After receiving a response, click on suggested action buttons to:
- Navigate to relevant pages
- Perform specific actions
- Access related features

## API Reference

### AIOperatingSystemService

#### `sendMessage()`

Send a message to the AI system and get a response.

```typescript
async sendMessage(
  userId: string | number,
  message: string,
  sessionId?: string,
  token?: string,
  context?: UserContext
): Promise<{ response: AISystemMessage; sessionId: string }>
```

**Parameters:**
- `userId`: User identifier
- `message`: User's message text
- `sessionId`: Optional session ID for continuing conversation
- `token`: Optional authentication token for backend API calls
- `context`: Optional user context (role, current page, etc.)

**Returns:**
- `response`: AI system message with content, confidence, and metadata
- `sessionId`: Session ID for maintaining conversation context

**Example:**
```typescript
import { aiOperatingSystemService } from './services/AIOperatingSystemService';

const result = await aiOperatingSystemService.sendMessage(
  'user-123',
  'How do I pay rent?',
  undefined,
  authToken,
  {
    userId: 'user-123',
    username: 'john@example.com',
    role: 'TENANT',
    currentPage: '/dashboard',
  }
);

console.log(result.response.content);
console.log(result.sessionId);
```

#### `processCommand()`

Process a natural language command and execute the corresponding action.

```typescript
async processCommand(
  command: string,
  context: UserContext,
  token?: string
): Promise<CommandResult>
```

**Parameters:**
- `command`: Natural language command text
- `context`: User context for command execution
- `token`: Optional authentication token

**Returns:**
- `CommandResult` with success status, action details, and result

**Example:**
```typescript
const result = await aiOperatingSystemService.processCommand(
  'Draft lease renewal',
  userContext,
  authToken
);

if (result.success && result.action.type === 'navigate') {
  navigate(result.action.target);
}
```

#### `getProactiveSuggestions()`

Get proactive suggestions based on user context.

```typescript
async getProactiveSuggestions(
  context: UserContext
): Promise<ProactiveSuggestion[]>
```

**Parameters:**
- `context`: User context (role, leaseId, etc.)

**Returns:**
- Array of proactive suggestions sorted by priority

**Example:**
```typescript
const suggestions = await aiOperatingSystemService.getProactiveSuggestions({
  userId: 'user-123',
  username: 'john@example.com',
  role: 'TENANT',
  leaseId: 456,
});

suggestions.forEach(suggestion => {
  console.log(suggestion.title, suggestion.description);
});
```

#### `updateContext()`

Update user context for an existing session.

```typescript
updateContext(sessionId: string, context: Partial<UserContext>): void
```

**Parameters:**
- `sessionId`: Session ID
- `context`: Partial context to update

**Example:**
```typescript
aiOperatingSystemService.updateContext(sessionId, {
  currentPage: '/maintenance',
  recentActions: ['viewed_maintenance', 'submitted_request'],
});
```

#### `getSessionHistory()`

Get message history for a session.

```typescript
getSessionHistory(sessionId: string): AISystemMessage[]
```

**Parameters:**
- `sessionId`: Session ID

**Returns:**
- Array of messages in the session

**Example:**
```typescript
const history = aiOperatingSystemService.getSessionHistory(sessionId);
history.forEach(msg => {
  console.log(`${msg.type}: ${msg.content}`);
});
```

## Command Processing

### Command Recognition

The system recognizes commands through pattern matching on natural language input:

- **Draft/Create/Generate**: "Draft lease renewal", "Create maintenance request"
- **Analyze/Check/Show**: "Analyze market rates", "Show vacancies"
- **Schedule/Book**: "Schedule tour", "Book showing"
- **Email/Send**: "Email all tenants", "Send message"

### Command Execution

Commands are automatically executed when recognized:

1. **Navigation Commands**: Automatically navigate to the target page
2. **Service Commands**: Call appropriate services (RentOptimization, LeasingAgent)
3. **Data Display**: Show relevant data or open dashboards

### Supported Commands

| Command Pattern | Action | Target |
|----------------|--------|--------|
| Draft/Create lease renewal | Navigate | `/lease/renew` |
| Analyze/Check market rates | Service Call | RentOptimizationService |
| Show/List vacancies | Navigate | `/properties/search` |
| Email/Send to tenants | Navigate | `/messaging/bulk` |
| Schedule/Book tour | Navigate | `/leasing/tours` |
| Create/Submit maintenance | Navigate | `/maintenance/new` |

## Voice Input

### Browser Support

Voice input uses the Web Speech API, which is supported in:
- ✅ Chrome/Chromium (desktop & mobile)
- ✅ Edge (Chromium-based)
- ✅ Safari (iOS 14.5+, macOS 11+)

### Implementation

The voice input feature:

1. **Checks Browser Support**: Automatically detects if Web Speech API is available
2. **Requests Permission**: Prompts user for microphone access
3. **Transcribes Speech**: Converts speech to text in real-time
4. **Auto-Sends**: Automatically sends transcribed message

### Usage

1. Click the microphone button in the input area
2. Speak your question or command clearly
3. The system will transcribe and send automatically
4. Click the microphone again to stop listening

### Troubleshooting Voice Input

**Issue**: Microphone button not visible
- **Solution**: Your browser may not support Web Speech API. Use text input instead.

**Issue**: "Permission denied" error
- **Solution**: Allow microphone access in browser settings

**Issue**: Poor transcription accuracy
- **Solution**: Speak clearly, reduce background noise, check microphone quality

## Context Awareness

### User Context Tracking

The system tracks:

- **User Role**: TENANT, PROPERTY_MANAGER, ADMIN
- **Current Page**: Active route/path
- **Lease Information**: Lease ID, property details
- **Recent Actions**: User activity history
- **Preferences**: User settings and preferences

### Proactive Suggestions

Based on context, the system provides proactive suggestions:

- **Rent Due Reminders**: "Your rent is due in 5 days"
- **Lease Renewal**: "Your lease expires in 30 days"
- **Maintenance Alerts**: "You have 3 pending maintenance requests"
- **Payment Suggestions**: "Set up autopay to never miss a payment"

### Context Updates

Context is automatically updated when:
- User navigates to different pages
- User performs actions (submits forms, makes payments)
- Session is created or updated

## Service Integration

### LeasingAgentService

Integrated for property search and lead management:

```typescript
// Property search queries automatically use LeasingAgentService
"Find 2-bedroom apartments under $1500"
"Show me pet-friendly properties"
```

### RentOptimizationService

Integrated for market analysis:

```typescript
// Rent analysis commands use RentOptimizationService
"Analyze market rates for my property"
"What's the recommended rent for unit 123?"
```

### Backend Chatbot API

Integrated for LLM-powered responses:

```typescript
// When LLM is enabled, queries go to /api/chatbot/message
// Falls back to FAQ if LLM unavailable
```

## Configuration

### Environment Variables

```bash
# Enable AI Operating System
VITE_FEATURE_AI_OS=true

# LLM Configuration
VITE_LLM_PROVIDER=openai
VITE_OPENAI_API_KEY=sk-...
VITE_LLM_MODEL=gpt-4o-mini

# Voice Input
VITE_VOICE_INPUT_ENABLED=true

# Command Processing
VITE_COMMAND_PROCESSING_ENABLED=true
```

### Service Configuration

```typescript
const service = new AIOperatingSystemService({
  enabled: true,
  useLLM: true, // Use backend LLM API
  llmProvider: 'openai',
  voiceInputEnabled: true,
  commandProcessingEnabled: true,
  proactiveSuggestionsEnabled: true,
  sessionTimeoutMinutes: 30,
  maxSessionMessages: 100,
});
```

## Examples

### Example 1: Basic Query

```typescript
// User asks: "How do I submit a maintenance request?"

const result = await aiOperatingSystemService.sendMessage(
  userId,
  'How do I submit a maintenance request?',
  undefined,
  token
);

// Response includes:
// - FAQ answer about maintenance requests
// - Suggested actions: "Submit Maintenance Request", "View Open Requests"
// - Related questions
```

### Example 2: Command Execution

```typescript
// User says: "Draft lease renewal"

const result = await aiOperatingSystemService.sendMessage(
  userId,
  'Draft lease renewal',
  sessionId,
  token,
  context
);

// System recognizes command and:
// - Returns command result
// - Executes navigation to /lease/renew
// - Shows confirmation message
```

### Example 3: Voice Input

```typescript
// User clicks microphone and says: "Show me available properties"

// System automatically:
// 1. Transcribes: "Show me available properties"
// 2. Sends message
// 3. Recognizes as property search command
// 4. Navigates to /properties/search
```

### Example 4: Context-Aware Suggestions

```typescript
// System automatically suggests based on context:

const suggestions = await aiOperatingSystemService.getProactiveSuggestions({
  userId: 'user-123',
  role: 'TENANT',
  leaseId: 456,
  currentPage: '/dashboard',
});

// Returns:
// [
//   {
//     title: 'Rent Due Soon',
//     description: 'Your rent is due in 5 days. Set up autopay...',
//     action: { type: 'navigate', target: '/payments/autopay' },
//     priority: 8
//   },
//   {
//     title: 'Lease Renewal Available',
//     description: 'Your lease expires in 30 days...',
//     action: { type: 'navigate', target: '/lease/renew' },
//     priority: 7
//   }
// ]
```

## Migration Guide

### From ChatbotService to AIOperatingSystem

The AIOperatingSystem replaces ChatbotService with enhanced capabilities:

#### Before (ChatbotService)

```typescript
import { chatbotService } from './domains/shared/ai-services/chatbot';

const { response, sessionId } = await chatbotService.sendMessage(
  userId,
  'How do I pay rent?'
);
```

#### After (AIOperatingSystem)

```typescript
import { aiOperatingSystemService } from './services/AIOperatingSystemService';

const { response, sessionId } = await aiOperatingSystemService.sendMessage(
  userId,
  'How do I pay rent?',
  undefined,
  token,
  context
);
```

### Key Differences

1. **Enhanced Context**: AIOperatingSystem accepts user context for better responses
2. **Command Processing**: Automatically recognizes and executes commands
3. **Service Integration**: Seamlessly integrates with other AI services
4. **Voice Input**: Supports voice-to-text input
5. **Proactive Suggestions**: Provides context-aware suggestions

### Migration Steps

1. **Update Imports**: Replace ChatbotService imports with AIOperatingSystemService
2. **Add Context**: Provide user context when calling `sendMessage()`
3. **Handle Commands**: Update UI to handle command execution results
4. **Test Voice Input**: Verify voice input works in supported browsers
5. **Update UI**: Use AIOperatingSystem component instead of ChatWidget

## Troubleshooting

### Common Issues

#### Issue: "AI Operating System is disabled"

**Solution**: Check that the service is enabled in configuration:
```typescript
const service = new AIOperatingSystemService({ enabled: true });
```

#### Issue: LLM responses not working

**Possible Causes:**
- Backend API not available
- Invalid authentication token
- LLM provider not configured

**Solution**: 
- Check backend API status
- Verify token is valid
- Check environment variables for LLM configuration
- System will automatically fallback to FAQ responses

#### Issue: Commands not executing

**Possible Causes:**
- Command processing disabled
- Command not recognized
- Navigation target invalid

**Solution**:
- Enable command processing: `commandProcessingEnabled: true`
- Check command patterns in documentation
- Verify navigation routes exist

#### Issue: Voice input not working

**Possible Causes:**
- Browser doesn't support Web Speech API
- Microphone permission denied
- Voice input disabled

**Solution**:
- Use supported browser (Chrome, Edge, Safari)
- Grant microphone permission in browser settings
- Enable voice input: `voiceInputEnabled: true`

#### Issue: Session not persisting

**Possible Causes:**
- Session timeout too short
- Session cleanup running too frequently

**Solution**:
- Increase `sessionTimeoutMinutes` in configuration
- Check session cleanup interval settings

### Debug Mode

Enable debug logging:

```typescript
// In browser console
localStorage.setItem('ai-os-debug', 'true');

// Service will log detailed information
```

## Best Practices

### 1. Provide Context

Always provide user context for better responses:

```typescript
await aiOperatingSystemService.sendMessage(
  userId,
  message,
  sessionId,
  token,
  {
    userId,
    username,
    role,
    currentPage: location.pathname,
    leaseId,
  }
);
```

### 2. Handle Commands

Check for command results and execute actions:

```typescript
const result = await aiOperatingSystemService.sendMessage(...);

if (result.response.type === 'command') {
  const commandResult = result.response.metadata?.commandResult;
  if (commandResult?.success && commandResult.action.type === 'navigate') {
    navigate(commandResult.action.target);
  }
}
```

### 3. Use Proactive Suggestions

Load and display proactive suggestions:

```typescript
useEffect(() => {
  if (isOpen && user) {
    loadProactiveSuggestions();
  }
}, [isOpen, user]);
```

### 4. Error Handling

Always handle errors gracefully:

```typescript
try {
  const result = await aiOperatingSystemService.sendMessage(...);
  // Handle success
} catch (error) {
  console.error('AI service error:', error);
  // Show user-friendly error message
}
```

## Future Enhancements

Planned features for future releases:

- **Streaming Responses**: Real-time streaming of LLM responses
- **Rich Message Types**: Support for markdown, tables, and embedded content
- **Command History**: Save and quick-access to recent commands
- **Multi-modal Input**: Support for images and file uploads
- **Advanced Analytics**: Track usage patterns and improve responses
- **Personalization**: Learn from user interactions and preferences
- **Calendar Integration**: Schedule actions and reminders
- **Advanced Command Chaining**: Execute multiple commands in sequence

## Support

For issues, questions, or feature requests:

1. Check this documentation
2. Review troubleshooting section
3. Check GitHub issues
4. Contact the development team

## License

This component is part of the Property Management Suite and follows the project's license.

