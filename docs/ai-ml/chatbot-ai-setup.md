# Chatbot AI Integration Guide

This guide explains how to enable AI-powered responses for the chatbot.

## Overview

The chatbot now supports AI-powered responses using OpenAI. When enabled, the chatbot uses GPT-4o-mini to generate intelligent, context-aware responses based on:
- User's lease and property information
- Conversation history
- Property management knowledge

## Backend Setup

### 1. Environment Variables

Add to your `.env` file:

```bash
# Enable AI for chatbot
AI_ENABLED=true
AI_CHATBOT_ENABLED=true

# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7
```

### 2. API Endpoints

The chatbot service provides two endpoints:

**POST `/api/chatbot/message`**
- Send a message to the chatbot
- Body: `{ message: string, sessionId?: string }`
- Returns: `{ message: string, sessionId: string, intent?: string, confidence?: number, suggestedActions?: Array }`

**GET `/api/chatbot/session/:sessionId`**
- Get conversation history for a session
- Returns: Array of messages

### 3. Features

- **Context-Aware Responses**: Uses user's lease and property information
- **Conversation History**: Maintains context across multiple messages
- **Intent Detection**: Automatically detects user intent (maintenance, payment, lease, etc.)
- **Suggested Actions**: Provides actionable buttons based on conversation
- **Session Management**: Maintains sessions for 24 hours
- **Graceful Fallback**: Falls back to FAQ if AI is unavailable

## Frontend Setup

### 1. Enable LLM in Chatbot Service

Update the chatbot configuration to use LLM:

```typescript
import { chatbotService } from '@/domains/shared/ai-services/chatbot';

// Enable AI-powered responses
chatbotService.updateConfig({
  useLLM: true,
  llmProvider: 'openai', // or 'mock' to disable
});
```

### 2. Configuration Options

The frontend chatbot service supports:

```typescript
{
  enabled: true,
  useLLM: true,              // Enable AI responses
  llmProvider: 'openai',     // 'openai' | 'anthropic' | 'mock'
  model: 'gpt-4o-mini',      // Model to use
  temperature: 0.7,          // Response creativity (0-1)
  maxTokens: 500,            // Maximum response length
  minConfidenceThreshold: 0.6, // Minimum confidence for FAQ match
  maxSessionMessages: 100,   // Max messages per session
  sessionTimeoutMinutes: 30, // Session timeout
}
```

### 3. How It Works

1. User sends a message through the chat widget
2. Frontend calls `chatbotService.sendMessage()`
3. If `useLLM: true`, it calls the backend API `/api/chatbot/message`
4. Backend uses OpenAI to generate a response with user context
5. Response is returned with intent, confidence, and suggested actions
6. Frontend displays the AI-generated response

## Testing

### Test with AI Enabled

1. Set `AI_ENABLED=true` and `OPENAI_API_KEY` in backend `.env`
2. Set `useLLM: true` in frontend chatbot config
3. Send a message: "How do I pay rent?"
4. Should receive an AI-generated response

### Test Fallback Behavior

1. Set `AI_ENABLED=false` or remove `OPENAI_API_KEY`
2. Send a message
3. Should receive FAQ-based fallback response

## Example Responses

**User**: "I have a water leak in my kitchen"

**AI Response**: "I understand you have a water leak in your kitchen. This is an urgent maintenance issue. I can help you submit a maintenance request right away. Would you like me to create a maintenance request for you?"

**Suggested Actions**:
- Submit Maintenance Request → Navigate to `/maintenance/new`

**User**: "When is my rent due?"

**AI Response**: "Based on your lease, your rent is due on the 1st of each month. You can view your current invoices and make payments in the Payments section of your portal."

**Suggested Actions**:
- View Invoices → Navigate to `/payments`
- Make Payment → Navigate to `/payments/pay`

## Cost Considerations

- Uses `gpt-4o-mini` by default (cost-effective)
- Average cost per message: ~$0.001-0.002
- Sessions maintain context (last 10 messages)
- Automatic session cleanup after 24 hours

## Troubleshooting

### Chatbot Not Using AI

1. Check `AI_ENABLED=true` in backend `.env`
2. Check `AI_CHATBOT_ENABLED=true` in backend `.env`
3. Verify `OPENAI_API_KEY` is set
4. Check backend logs for initialization messages
5. Verify frontend has `useLLM: true` in config

### Getting FAQ Responses Instead of AI

- AI may be disabled or API key missing
- Check backend logs for "Chatbot Service initialized in mock mode"
- Verify OpenAI API key is valid
- Check network connectivity

### High Costs

- Reduce `OPENAI_MAX_TOKENS` (default: 500)
- Use `gpt-4o-mini` instead of `gpt-4`
- Implement caching for common questions
- Reduce session history length

## Related Documentation

- [AI Configuration Guide](./ai-configuration.md)
- [AI Services Integration Plan](./ai-services-integration-plan.md)

