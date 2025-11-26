# AI Services Configuration Guide

This document describes the environment variables required for AI services integration.

## Environment Variables

Create a `.env` file in the `tenant_portal_backend` directory with the following variables:

### Database Configuration
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/tenant_portal?schema=public
```

### JWT Configuration
```bash
JWT_SECRET=your-secret-key-change-in-production
JWT_EXPIRATION=24h
```

### Application Configuration
```bash
APP_URL=http://localhost:3001
PORT=3001
NODE_ENV=development
```

### Email Configuration
```bash
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-email@example.com
SMTP_PASS=your-email-password
SMTP_FROM=noreply@example.com
```

### AI Services Configuration

#### Master Switch
```bash
# Master switch for all AI services
AI_ENABLED=true
```

#### Individual Service Toggles
```bash
# Enable/disable individual AI services
AI_MAINTENANCE_ENABLED=true
AI_PAYMENT_ENABLED=true
AI_LEASE_RENEWAL_ENABLED=true
AI_NOTIFICATION_ENABLED=true
AI_ANOMALY_DETECTION_ENABLED=true
AI_CHATBOT_ENABLED=true
```

#### OpenAI Configuration
```bash
# Required for AI services that use OpenAI
OPENAI_API_KEY=sk-your-openai-api-key-here
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=500
OPENAI_TEMPERATURE=0.7
```

#### AI Service Performance Settings
```bash
# Timeout in milliseconds
AI_SERVICE_TIMEOUT=10000
# Number of retry attempts on failure
AI_SERVICE_RETRY_ATTEMPTS=3
```

#### ML Service Configuration
```bash
# URL for the ML microservice (rent optimization)
ML_SERVICE_URL=http://localhost:8000
USE_ML_SERVICE=true
```

### Feature Flags

Granular control over specific AI features:

```bash
# Maintenance AI Features
ENABLE_AI_PRIORITY_ASSIGNMENT=true
ENABLE_AI_TECHNICIAN_ASSIGNMENT=true
ENABLE_AI_SLA_PREDICTION=true

# Payment AI Features
ENABLE_AI_PAYMENT_RISK_ASSESSMENT=true
ENABLE_AI_SMART_REMINDERS=true

# Lease AI Features
ENABLE_AI_RENEWAL_PREDICTION=true

# Notification AI Features
ENABLE_AI_NOTIFICATION_TIMING=true

# Monitoring AI Features
ENABLE_AI_ANOMALY_DETECTION=true
```

### Monitoring Configuration
```bash
MONITORING_ENABLED=true
```

## Configuration Priority

The application uses `@nestjs/config` with the following priority:

1. `.env.local` (local overrides, not committed to git)
2. `.env` (default configuration)

## Usage in Services

All AI services check the `AI_ENABLED` flag first, then their specific service flag:

```typescript
const aiEnabled = this.configService.get<string>('AI_ENABLED', 'false') === 'true';
const serviceEnabled = this.configService.get<string>('AI_MAINTENANCE_ENABLED', 'true') === 'true';

if (aiEnabled && serviceEnabled) {
  // AI service is active
}
```

## Getting OpenAI API Key

1. Sign up at [OpenAI](https://platform.openai.com/)
2. Navigate to API Keys section
3. Create a new secret key
4. Copy the key (starts with `sk-`)
5. Add it to your `.env` file as `OPENAI_API_KEY`

## Testing Without OpenAI

If you don't have an OpenAI API key, the services will:
- Log warnings about missing API key
- Operate in "mock mode" with fallback behavior
- Use rule-based logic instead of AI

## Production Considerations

1. **Never commit `.env` files** - They contain sensitive information
2. **Use strong secrets** - Generate secure random strings for `JWT_SECRET`
3. **Set appropriate timeouts** - Adjust `AI_SERVICE_TIMEOUT` based on your infrastructure
4. **Monitor API costs** - OpenAI API usage is billed per token
5. **Use feature flags** - Disable features you don't need to reduce costs

## Environment-Specific Settings

### Development
```bash
AI_ENABLED=true
OPENAI_MODEL=gpt-4o-mini  # Cheaper model for development
OPENAI_MAX_TOKENS=500     # Lower token limit
```

### Production
```bash
AI_ENABLED=true
OPENAI_MODEL=gpt-4o-mini  # Or gpt-4 for better quality
OPENAI_MAX_TOKENS=1000     # Higher limit for complex requests
AI_SERVICE_TIMEOUT=15000   # Longer timeout for production
```

## Troubleshooting

### AI Services Not Working

1. Check `AI_ENABLED=true` is set
2. Verify `OPENAI_API_KEY` is valid
3. Check service-specific flags (e.g., `AI_MAINTENANCE_ENABLED`)
4. Review logs for error messages
5. Ensure OpenAI API key has sufficient credits

### High API Costs

1. Reduce `OPENAI_MAX_TOKENS`
2. Use `gpt-4o-mini` instead of `gpt-4`
3. Disable unused feature flags
4. Implement caching (already included in services)
5. Monitor usage in OpenAI dashboard

### Slow Response Times

1. Increase `AI_SERVICE_TIMEOUT`
2. Check network connectivity
3. Verify ML service is running (if using ML features)
4. Review OpenAI API status

## Related Documentation

- [AI Services Integration Plan](./AI-SERVICES-INTEGRATION-PLAN.md)
- [Overall User Guide](./docs/Overall_User_Guide.md)

