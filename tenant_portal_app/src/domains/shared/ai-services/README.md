# AI Services Layer

This directory contains the AI-powered features for the Property Management Suite.

## Architecture

The AI services layer follows a domain-driven design with clear separation of concerns:

```
ai-services/
├── types/              # Shared TypeScript types for all AI features
├── config.ts           # Centralized configuration with feature flags
├── rent-optimization/  # AI Rent Optimization service
├── chatbot/            # AI Chatbot service (TODO)
├── smart-bill-entry/   # Smart Bill Entry with OCR (TODO)
└── predictive-maintenance/ # Predictive Maintenance ML (TODO)
```

## Features

### ✅ Rent Optimization (Implemented)
AI-powered rent recommendations based on market analysis, comparable properties, and unit characteristics.

**Service:** `RentOptimizationService`
- `getRecommendation(unitId)` - Get recommendation for a single unit
- `getRecommendations(unitIds)` - Batch operation for multiple units

**Mock Data:** Includes 3 sample units with realistic recommendations
- Unit 1: 2BR @ $1,200 → $1,285 (+7.1%)
- Unit 2: Studio @ $950 → $975 (+2.6%)
- Unit 3: 3BR @ $1,850 → $1,925 (+4.1%)

**UI Components:**
- `RentRecommendationCard` - Individual recommendation display
- `RentOptimizationDashboard` - Full dashboard with pending/accepted/rejected sections

**Route:** `/rent-optimization` (Property Manager only)

### 🚧 AI Chatbot (Planned)
Intelligent chatbot to answer tenant and property manager questions.

### 🚧 Smart Bill Entry (Planned)
OCR + AI to automatically extract and classify expense data from receipts.

### 🚧 Predictive Maintenance (Planned)
ML models to predict equipment failures and recommend preventive maintenance.

## Configuration

All AI services are configured via environment variables in `.env.local`:

```bash
# Feature Flags
VITE_FEATURE_RENT_OPTIMIZATION=true
VITE_FEATURE_CHATBOT=true
VITE_FEATURE_SMART_BILL_ENTRY=true
VITE_FEATURE_PREDICTIVE_MAINTENANCE=true

# Providers (mock by default)
VITE_LLM_PROVIDER=mock              # openai, anthropic, or mock
VITE_MARKET_DATA_PROVIDER=rentometer      # zillow, rentometer, or mock
VITE_OCR_PROVIDER=mock              # aws-textract, google-vision, or mock
VITE_PREDICTION_MODEL=mock          # xgboost, random-forest, or mock

# API Keys (only needed when not using mock)
VITE_OPENAI_API_KEY=your_key_here
VITE_ZILLOW_API_KEY=your_key_here
```

See `.env.example` for all available configuration options.

## Development Workflow

### 1. Frontend-First Development (Current)
- Mock data allows immediate UI/UX development
- No external API dependencies
- Fast iteration cycles
- Zero cost for testing

### 2. Backend Integration (Next)
- Replace mock methods with real API calls
- Add Prisma models for storing recommendations
- Implement accept/reject workflow in backend
- Add audit logging

### 3. ML Model Integration (Future)
- Deploy Python ML microservices
- Connect to external market data APIs
- Train models on historical data
- Implement real-time predictions

## Testing

### Manual Testing
1. Login as `admin_pm` (password: `password123`)
2. Navigate to "AI Rent Optimization" in sidebar
3. View 3 mock recommendations
4. Test accept/reject workflow
5. Verify recommendations update status

### Unit Testing (TODO)
```bash
npm run test ai-services
```

## Type Safety

All AI services use strongly-typed TypeScript interfaces:
- `RentRecommendation` - Complete recommendation with factors and comparables
- `AIServiceResponse<T>` - Standardized response wrapper with metadata
- `AIServiceError` - Error handling with retry logic

## Caching Strategy

Services implement intelligent caching:
- Default TTL: 24 hours for rent recommendations
- Configurable per service type
- Cache invalidation on status change
- Memory-based cache (can be extended to Redis)

## Error Handling

All services return `AIServiceResponse<T>`:
```typescript
{
  success: boolean;
  data?: T;
  error?: AIServiceError;
  metadata: {
    requestId: string;
    timestamp: string;
    processingTime: number;
    cached?: boolean;
  }
}
```

## Future Enhancements

### Phase 2: AI Chatbot
- LangChain integration
- Context-aware responses
- Action execution (create maintenance request, pay rent)
- Multi-turn conversations

### Phase 3: Smart Bill Entry
- OCR with AWS Textract or Google Vision
- AI classification with GPT-4
- Auto-categorization with confidence scores
- Plaid API integration for banking

### Phase 4: Predictive Maintenance
- XGBoost/Random Forest models
- Equipment failure prediction
- Cost-benefit analysis
- Preventive maintenance scheduling

## Contributing

When adding new AI features:
1. Create feature directory under `ai-services/`
2. Define TypeScript types in `types/index.ts`
3. Add configuration in `config.ts`
4. Implement service class with mock data
5. Create UI components
6. Add routes and navigation
7. Update this README
8. Write tests

## Resources

- [AI Features Development Plan](../../../docs/AI_FEATURES_DEVELOPMENT_PLAN.md)
- [Executive Summary](../../../docs/AI_FEATURE_INTEGRATION_EXECUTIVE_SUMMARY.md)
- [Architecture Diagram](../../../docs/AI_FEATURE_INTEGRATION_PLAN_ARCHITECTURE.txt)
