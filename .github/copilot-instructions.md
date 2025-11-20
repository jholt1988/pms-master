# GitHub Copilot Instructions - Property Management Suite

## Project Overview
Full-stack property management system with AI-powered features. Monorepo with:
- **tenant_portal_backend** (NestJS/TypeScript) - REST API on port 3001
- **tenant_portal_app** (React/TypeScript) - Frontend on port 3000  
- **rent_optimization_ml** (FastAPI/Python) - ML microservice on port 8000

## Critical Architecture Patterns

### Backend: NestJS Module Structure
Services live in feature-based modules (`src/{feature}/`). Each module follows this pattern:
```typescript
// Standard service injection
@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}
}

// Always inject PrismaService, never import directly
// Controllers use DTOs with class-validator decorators
```

**Key Services:**
- `PrismaService` - Database access (inject, never instantiate)
- `EmailService` - All email notifications (inject into services needing email)
- `AuthService` - JWT generation, password hashing (bcrypt with 10 rounds)

### Database: Prisma ORM Patterns
Schema location: `tenant_portal_backend/prisma/schema.prisma`

**Critical Models:**
- `MaintenanceRequest` - Has relations to `MaintenanceAsset`, `Technician`, `MaintenanceSlaPolicy`, history tracking
- `Lease` - Core tenant relationship with `LeaseHistory` audit trail
- `Property/Unit` - Hierarchy for multi-unit properties

**Always:**
- Use `prisma.{model}.{operation}` (never raw SQL unless absolutely necessary)
- Include relations in queries: `include: { property: true, unit: true }`
- Use transactions for multi-step operations: `prisma.$transaction([...])`
- Check unique constraints before `create` (use `upsert` when appropriate)

### Frontend: Domain-Driven UI Architecture
Structure: `src/domains/{tenant|property-manager|admin|shared}/`

**Critical Conventions:**
- Components go in `domains/{role}/features/{feature}/`
- Shared services in `domains/shared/ai-services/`
- Never cross-import between tenant/property-manager/admin domains
- Design tokens in `domains/shared/design-tokens/`

**Routing:**
- Role-based shells: `TenantShell` vs `AppShell` (property manager)
- Protected routes with `RequireAuth` and `RequireRole` guards
- Route constants in `src/constants/routes.ts` (never hardcode paths)

**Example:**
```tsx
// CORRECT: Domain isolation
import { MaintenancePage } from './domains/tenant/features/maintenance';
import { colors } from './domains/shared/design-tokens/colors';

// WRONG: Cross-domain imports
import { TenantCard } from './domains/tenant/components'; // Don't import from tenant in property-manager
```

### AI/ML Integration Pattern
ML services follow microservice architecture with **separate FastAPI server**:

```
Frontend → Backend (NestJS) → ML Service (FastAPI)
         HTTP            HTTP POST /predict
```

**ML Service Structure:**
- `rent_optimization_ml/main.py` - FastAPI app entry point
- `app/services/prediction_service.py` - Model inference logic (Git LFS file)
- `app/services/market_data_service.py` - External API integration (Rentcast)
- `models/` - Trained XGBoost models (.joblib files)

**Integration Pattern:**
```typescript
// Backend: rent-optimization.service.ts
@Injectable()
export class RentOptimizationService {
  async predict(unitId: number) {
    // Call ML service via HTTP
    const response = await axios.post('http://localhost:8000/predict', data);
    // Store results in database
    await this.prisma.rentRecommendation.create({...});
  }
}
```

## Development Workflows

### Starting Development Servers
```bash
# Backend (Terminal 1)
cd tenant_portal_backend
npm start  # Runs on port 3001

# Frontend (Terminal 2)
cd tenant_portal_app
npm start  # Runs on port 3000

# ML Service (Terminal 3) - Only if using AI features
cd rent_optimization_ml
python -m venv venv
venv\Scripts\activate  # Windows (PowerShell: venv\Scripts\Activate.ps1)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Environment Configuration
**Backend:** Create `.env` file (no example exists, configure manually)
- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret for token signing
- `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` - Email configuration

**Frontend:** Copy `tenant_portal_app/.env.example` to `.env.local`
- Uses `VITE_` prefix for all environment variables
- Mock mode by default: `VITE_LLM_PROVIDER=mock`, `VITE_MARKET_DATA_PROVIDER=mock`
- Production mode: Set API keys and change providers (e.g., `VITE_MARKET_DATA_PROVIDER=rentometer`)
- Feature flags: `VITE_FEATURE_RENT_OPTIMIZATION=true` (toggle AI features)

**ML Service:** Copy `rent_optimization_ml/.env.example` to `.env`
- `DATABASE_URL` - Same as backend for training data access
- `RENTOMETER_API_KEY`, `ZILLOW_API_KEY` - Market data APIs
- `CORS_ORIGINS` - Must include frontend URL (http://localhost:3000)

### Database Operations
```bash
cd tenant_portal_backend

# Apply schema changes
npx prisma migrate dev --name description_of_change

# Regenerate client after schema changes
npx prisma generate

# Seed database (creates admin user)
npm run db:seed  # Username: admin, Password: Admin123!@#

# View database in browser
npx prisma studio
```

### Testing Strategy
- **Unit tests**: `npm test` - 141 tests covering services
- **E2E tests**: `npm run test:e2e` - Requires separate test database setup
- **E2E Database Setup** (Windows): Run `.\setup-e2e-db.ps1` or manually create `tenant_portal_test_DB`
- Test factories in `test/factories/index.ts` - Use for consistent test data
- **Always mock PrismaService in unit tests** (see `payments.service.spec.ts` for pattern)

**E2E Test Database Requirements:**
```sql
-- Create test database
CREATE DATABASE tenant_portal_test_DB;
-- Run migrations: npx prisma migrate deploy --schema=./prisma/schema.prisma
```

## Project-Specific Conventions

### Authentication & Authorization
- JWT tokens with 24hr expiration
- Password policy: min 8 chars, uppercase, lowercase, number, special char
- Roles: `TENANT | PROPERTY_MANAGER | ADMIN`
- Guards: `JwtAuthGuard` for all protected routes, custom role guards in controllers
- MFA optional (TOTP via otplib)

### Security Events Logging
Always log security-critical actions:
```typescript
await this.prisma.securityEvent.create({
  data: {
    eventType: 'LOGIN_SUCCESS',
    userId: user.id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    metadata: { /* additional context */ }
  }
});
```

### Email Notifications
Use centralized `EmailService`:
```typescript
// Inject EmailService
constructor(private emailService: EmailService) {}

// Send template-based email
await this.emailService.sendMaintenanceCreated(request, user.email);
await this.emailService.sendPaymentConfirmation(payment, lease.tenant);
```

Available templates: maintenance (created/updated/completed), lease (signed/expiring/terminated), payment (confirmed/failed/overdue)

### Maintenance SLA Calculation
Automatic deadline calculation based on priority:
```typescript
// In maintenance.service.ts
async computeSlaTargets(priority: MaintenancePriority) {
  const policy = await this.prisma.maintenanceSlaPolicy.findFirst({
    where: { priority, active: true }
  });
  return {
    responseDeadline: add(policy.responseTimeMinutes, 'minutes'),
    resolutionDeadline: add(policy.resolutionTimeMinutes, 'minutes')
  };
}
```

### AI Chatbot Integration
FAQ-based with 8 categories. Located in `tenant_portal_app/src/domains/shared/ai-services/chatbot/`:
- Intent detection via keyword matching (no LLM yet)
- Session management with 30min timeout
- Expandable to LLM-based responses

**Frontend Mock Mode vs Production:**
- Development uses mock providers by default (zero-cost, no API keys)
- Switch providers via `.env.local`: `VITE_LLM_PROVIDER=openai`, `VITE_MARKET_DATA_PROVIDER=rentometer`
- Feature flags control availability: `VITE_FEATURE_RENT_OPTIMIZATION=true`
- See `tenant_portal_app/src/domains/shared/ai-services/README.md` for configuration

## Common Pitfalls

### Database
- ❌ Don't forget `await` on Prisma queries (returns Promises)
- ❌ Don't use `findUnique` without checking null (use `findUniqueOrThrow` or handle null)
- ❌ Don't create duplicate records (check `unique` constraints in schema)

### Backend
- ❌ Don't inject services in constructors without `private`/`public` keyword
- ❌ Don't forget `@Injectable()` decorator on services
- ❌ Don't use synchronous bcrypt (always use `bcrypt.hash()` / `bcrypt.compare()` async)

### Frontend
- ❌ Don't fetch API directly in components (use service layer in `domains/shared/`)
- ❌ Don't store sensitive data in localStorage (use httpOnly cookies for tokens when possible)
- ❌ Don't hardcode API URLs (use environment variables: `VITE_API_URL` for Vite, not `REACT_APP_`)

### ML Service
- ❌ Don't commit `.env` files (use `.env.example` as template)
- ❌ Don't commit trained models to Git (use Git LFS: `git lfs track "*.joblib"`)
- ❌ Don't assume ML service is always running (handle connection errors gracefully)

### Windows Development
- ✅ Use `venv\Scripts\activate` for PowerShell: `venv\Scripts\Activate.ps1`
- ✅ Run E2E setup script: `.\setup-e2e-db.ps1` (not `./setup-e2e-db.ps1`)
- ✅ Use `&&` only in Git Bash; use separate commands in cmd.exe

## Key Files to Reference

### Backend
- `tenant_portal_backend/src/app.module.ts` - Module registration
- `tenant_portal_backend/prisma/schema.prisma` - Database schema (839 lines)
- `tenant_portal_backend/src/maintenance/maintenance.service.ts` - Complex service example with relations
- `tenant_portal_backend/test/factories/index.ts` - Test data generation patterns

### Frontend
- `tenant_portal_app/src/App.tsx` - Routing and role-based shells
- `tenant_portal_app/src/domains/shared/design-tokens/` - All styling constants
- `tenant_portal_app/src/AuthContext.tsx` - Auth state management
- `tenant_portal_app/src/domains/shared/ai-services/README.md` - AI integration guide

### ML
- `rent_optimization_ml/README.md` - Setup and architecture
- `rent_optimization_ml/TRAINING_GUIDE.md` - Model training workflow
- `rent_optimization_ml/app/services/market_data_service.py` - External API pattern

### Documentation
- `AI_FEATURES_PHASE_3_COMPLETE.md` - AI implementation status
- `TESTING_STATUS.md` - Testing infrastructure and coverage
- `tenant_portal_app/docs/ADR.md` - Architecture decision records

## ML Model Performance

### Rent Optimization Model (XGBoost v1.0.0)
- **Status:** Operational and production-ready
- **Performance:** MAE $298.25, R² 0.85
- **Features:** 27 engineered features (property characteristics, market data, temporal patterns)
- **Training:** `python scripts/train_model.py` (see `TRAINING_GUIDE.md`)
- **Model File:** `models/rent_predictor.joblib` (Git LFS tracked)
- **API Endpoint:** FastAPI on port 8000, `/predict` endpoint
- **Market Data:** Rentcast (primary), Rentometer (fallback)

## External Dependencies

- **Rentcast API** - Real estate market data (active, API key in ML service .env)
- **Nodemailer** - SMTP email (configure in backend .env)
- **PostgreSQL** - Database (default port 5432)
- **XGBoost** - ML model library (Python package)

## Quick Reference Commands

```bash
# Install dependencies
cd tenant_portal_backend && npm install
cd tenant_portal_app && npm install
cd rent_optimization_ml && pip install -r requirements.txt

# Database setup
cd tenant_portal_backend
npx prisma migrate dev
npm run db:seed

# Run tests
npm test              # Unit tests
npm run test:e2e      # E2E tests (needs test DB)

# Code generation
npx prisma generate   # Regenerate Prisma client after schema changes

# ML model training
cd rent_optimization_ml
python scripts/train_model.py  # See TRAINING_GUIDE.md
```

---

**Version:** 1.0  
**Last Updated:** November 11, 2025  
**For Questions:** See project documentation in root or `docs/` folders
