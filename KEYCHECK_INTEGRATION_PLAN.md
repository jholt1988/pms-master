# KeyCheck Integration Plan
## Property Management Suite + Property Inspection System

**Date:** November 11, 2025  
**Status:** Planning Phase  
**Integration Type:** Full Feature Merge with Microservice Architecture

---

## Executive Summary

This plan outlines the integration of **KeyCheck** (PDL Property Inspector) into the **Property Management Suite**, creating a unified platform that combines property management, tenant services, and comprehensive property inspection capabilities with AI-powered repair cost estimation.

### Strategic Value
- **Enhanced Maintenance Workflow:** Connect inspections directly to maintenance requests
- **AI-Powered Cost Estimation:** 6-step analysis with depreciation, condition adjustments, and trade-specific pricing
- **Unified Data Model:** Single source of truth for properties, units, and maintenance
- **Improved Tenant Experience:** Seamless move-in/move-out inspections with digital signatures
- **Better Financial Planning:** Accurate repair cost forecasts based on real inspection data

---

## Current State Analysis

### KeyCheck (Property Inspection App)
**Architecture:**
- React 18 + TypeScript frontend (Vite)
- Node.js/Express backend with TypeScript
- Supabase (PostgreSQL) for database
- Redis for caching and rate limiting
- OpenAI Agents API for AI-powered estimates

**Core Features:**
- Room-by-room property inspections with checklists
- Photo documentation and condition tracking
- AI-powered repair cost estimation (6-step process)
- Digital signatures for move-in/move-out
- Report generation (PDF exports)
- Multi-tenant support
- Social login (Google, Microsoft, Apple)
- API key management for external integrations

**Key Data Models:**
- `Property`, `Room`, `Inspection`, `ChecklistItem`
- `InventoryItem`, `EstimateResult`, `RepairPlan`
- `User` (with role: property_manager, landlord, tenant, maintenance)

### Property Management Suite
**Architecture:**
- NestJS/TypeScript backend (port 3001)
- React/TypeScript frontend (port 3000)
- FastAPI/Python ML service (port 8000)
- PostgreSQL with Prisma ORM
- AI features (rent optimization, chatbot)

**Core Features:**
- Tenant portal and property manager dashboard
- Lease management with renewal workflows
- Maintenance request tracking with SLA policies
- Payment processing and expense tracking
- Email notifications and security events
- Role-based access (TENANT, PROPERTY_MANAGER, ADMIN)
- Rental application screening

**Key Data Models:**
- `Property`, `Unit`, `Lease`, `User`
- `MaintenanceRequest`, `MaintenanceAsset`, `Technician`
- `Payment`, `Expense`, `Document`

---

## Integration Strategy

### Phase 1: Data Model Unification (Weeks 1-3)

#### 1.1 Database Schema Extensions
Extend existing Prisma schema to support inspection functionality:

```prisma
// New models to add to schema.prisma

model UnitInspection {
  id                Int                   @id @default(autoincrement())
  property          Property              @relation(fields: [propertyId], references: [id])
  propertyId        Int
  unit              Unit?                 @relation(fields: [unitId], references: [id])
  unitId            Int?
  type              InspectionType
  status            InspectionStatus      @default(IN_PROGRESS)
  createdAt         DateTime              @default(now())
  completedAt       DateTime?
  inspector         User                  @relation("Inspector", fields: [inspectorId], references: [id])
  inspectorId       Int
  tenant            User?                 @relation("Tenant", fields: [tenantId], references: [id])
  tenantId          Int?
  lease             Lease?                @relation(fields: [leaseId], references: [id])
  leaseId           Int?
  generalNotes      String?
  reportGenerated   Boolean               @default(false)
  reportPath        String?
  createdBy         User                  @relation("CreatedBy", fields: [createdById], references: [id])
  createdById       Int
  rooms             InspectionRoom[]
  signatures        InspectionSignature[]
  repairEstimates   RepairEstimate[]
  
  @@index([propertyId])
  @@index([unitId])
  @@index([leaseId])
  @@index([status])
}

model InspectionRoom {
  id           Int                      @id @default(autoincrement())
  inspection   UnitInspection           @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  inspectionId Int
  name         String
  roomType     RoomType
  checklistItems InspectionChecklistItem[]
  
  @@index([inspectionId])
}

model InspectionChecklistItem {
  id              Int                        @id @default(autoincrement())
  room            InspectionRoom             @relation(fields: [roomId], references: [id], onDelete: Cascade)
  roomId          Int
  category        String
  itemName        String
  condition       InspectionCondition?
  notes           String?
  estimatedAge    Int?                       // Age in years
  requiresAction  Boolean                    @default(false)
  photos          UnitInspectionPhoto[]
  subItems        InspectionChecklistSubItem[]
  
  @@index([roomId])
  @@index([condition])
  @@index([requiresAction])
}

model InspectionChecklistSubItem {
  id              Int                     @id @default(autoincrement())
  parentItem      InspectionChecklistItem @relation(fields: [parentItemId], references: [id], onDelete: Cascade)
  parentItemId    Int
  name            String
  condition       InspectionCondition?
  estimatedAge    Int?
  
  @@index([parentItemId])
}

model UnitInspectionPhoto {
  id              Int                     @id @default(autoincrement())
  checklistItem   InspectionChecklistItem @relation(fields: [checklistItemId], references: [id], onDelete: Cascade)
  checklistItemId Int
  uploadedBy      User                    @relation(fields: [uploadedById], references: [id])
  uploadedById    Int
  url             String
  caption         String?
  createdAt       DateTime                @default(now())
  
  @@index([checklistItemId])
}

model InspectionSignature {
  id           Int            @id @default(autoincrement())
  inspection   UnitInspection @relation(fields: [inspectionId], references: [id], onDelete: Cascade)
  inspectionId Int
  user         User           @relation(fields: [userId], references: [id])
  userId       Int
  role         String
  signatureData String        // Base64 encoded signature image
  signedAt     DateTime       @default(now())
  
  @@index([inspectionId])
  @@index([userId])
}

model RepairEstimate {
  id                    Int                   @id @default(autoincrement())
  inspection            UnitInspection?       @relation(fields: [inspectionId], references: [id])
  inspectionId          Int?
  maintenanceRequest    MaintenanceRequest?   @relation(fields: [maintenanceRequestId], references: [id])
  maintenanceRequestId  Int?
  property              Property?             @relation(fields: [propertyId], references: [id])
  propertyId            Int?
  unit                  Unit?                 @relation(fields: [unitId], references: [id])
  unitId                Int?
  
  // Estimate summary
  totalLaborCost        Float
  totalMaterialCost     Float
  totalProjectCost      Float
  itemsToRepair         Int
  itemsToReplace        Int
  
  // Metadata
  currency              String                @default("USD")
  generatedAt           DateTime              @default(now())
  generatedBy           User                  @relation(fields: [generatedById], references: [id])
  generatedById         Int
  status                EstimateStatus        @default(DRAFT)
  approvedAt            DateTime?
  approvedBy            User?                 @relation("ApprovedEstimates", fields: [approvedById], references: [id])
  approvedById          Int?
  
  lineItems             RepairEstimateLineItem[]
  
  @@index([inspectionId])
  @@index([maintenanceRequestId])
  @@index([status])
}

model RepairEstimateLineItem {
  id                    Int            @id @default(autoincrement())
  estimate              RepairEstimate @relation(fields: [estimateId], references: [id], onDelete: Cascade)
  estimateId            Int
  
  // Item identification
  itemDescription       String
  location              String
  category              String         // plumbing, electrical, HVAC, etc.
  issueType             String         // repair, replace
  
  // Cost breakdown
  laborHours            Float?
  laborRate             Float?
  laborCost             Float
  materialCost          Float
  totalCost             Float
  
  // Depreciation & condition
  originalCost          Float?
  depreciatedValue      Float?
  depreciationRate      Float?
  conditionAdjustment   Float?
  estimatedLifetime     Int?           // Years
  currentAge            Int?           // Years
  
  // Additional details
  repairInstructions    String?
  notes                 String?
  
  @@index([estimateId])
  @@index([category])
}

// Enums
enum InspectionType {
  MOVE_IN
  MOVE_OUT
  ROUTINE
  ANNUAL
  EMERGENCY
}

enum InspectionStatus {
  IN_PROGRESS
  COMPLETED
  SIGNED
  ARCHIVED
}

enum InspectionCondition {
  EXCELLENT
  GOOD
  FAIR
  POOR
  DAMAGED
  NON_FUNCTIONAL
}

enum RoomType {
  BEDROOM
  BATHROOM
  KITCHEN
  LIVING_ROOM
  DINING_ROOM
  UTILITY_ROOM
  EXTERIOR_BUILDING
  EXTERIOR_LANDSCAPING
  EXTERIOR_PARKING
  COMMON_HALLWAYS
  COMMON_LAUNDRY
  COMMON_LOBBY
  OTHER
}

enum EstimateStatus {
  DRAFT
  PENDING_REVIEW
  APPROVED
  REJECTED
  COMPLETED
}
```

**Migration Tasks:**
1. Create new Prisma migration: `npx prisma migrate dev --name add_inspection_system`
2. Update existing `MaintenanceRequest` model to add optional `inspectionId` relation
3. Seed database with inspection room templates for common property types
4. Create database indexes for performance optimization

#### 1.2 Data Migration Strategy
- **No data loss:** KeyCheck runs on separate Supabase, PMS uses PostgreSQL
- **Parallel operation:** Both systems run simultaneously during transition
- **Export/Import:** Create migration scripts to import historical KeyCheck data (if needed)
- **User mapping:** Map KeyCheck users to PMS users by email address

---

### Phase 2: Backend Integration (Weeks 4-7)

#### 2.1 Inspection Service Module (NestJS)
Create new `inspection` module in `tenant_portal_backend/src/`:

```typescript
// src/inspection/inspection.module.ts
import { Module } from '@nestjs/common';
import { InspectionController } from './inspection.controller';
import { InspectionService } from './inspection.service';
import { EstimateService } from './estimate.service';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';

@Module({
  controllers: [InspectionController],
  providers: [InspectionService, EstimateService, PrismaService, EmailService],
  exports: [InspectionService, EstimateService],
})
export class InspectionModule {}
```

**Key Service Methods:**
- `createInspection(propertyId, unitId, type, inspectorId)` - Initialize new inspection
- `getInspectionById(id)` - Fetch with full relations (rooms, items, photos)
- `updateChecklistItem(itemId, condition, notes, photos)` - Update inspection items
- `addSignature(inspectionId, userId, signatureData)` - Digital signature capture
- `completeInspection(id)` - Mark complete and trigger estimate generation
- `generateReport(inspectionId)` - Create PDF report
- `linkToMaintenanceRequest(inspectionId, requestId)` - Connect inspection findings to work orders

#### 2.2 AI Estimate Service Integration
Create bridge between KeyCheck's AI estimate agent and PMS:

```typescript
// src/inspection/estimate.service.ts
import { Injectable, HttpException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { createEnhancedEstimateAgent } from './agents/enhanced-estimate-agent';

@Injectable()
export class EstimateService {
  constructor(private prisma: PrismaService) {}

  /**
   * Generate AI-powered repair estimate from inspection data
   * Uses 6-step analysis: labor rates, material costs, depreciation,
   * condition adjustments, original cost basis, lifetime analysis
   */
  async generateEstimateFromInspection(inspectionId: number, userId: number) {
    const inspection = await this.prisma.unitInspection.findUniqueOrThrow({
      where: { id: inspectionId },
      include: {
        rooms: {
          include: {
            checklistItems: {
              where: { requiresAction: true },
              include: { subItems: true },
            },
          },
        },
        property: true,
        unit: true,
      },
    });

    // Convert inspection items to inventory format for AI agent
    const inventoryItems = this.convertToInventoryItems(inspection);

    // Get user location from property address
    const userLocation = await this.getLocationFromProperty(inspection.property);

    // Call AI agent (port to NestJS from KeyCheck's agent)
    const agent = createEnhancedEstimateAgent(userLocation);
    const estimateResult = await agent.generateEstimate(inventoryItems);

    // Save estimate to database
    const estimate = await this.prisma.repairEstimate.create({
      data: {
        inspectionId,
        propertyId: inspection.propertyId,
        unitId: inspection.unitId,
        totalLaborCost: estimateResult.estimate_summary.total_labor_cost,
        totalMaterialCost: estimateResult.estimate_summary.total_material_cost,
        totalProjectCost: estimateResult.estimate_summary.total_project_cost,
        itemsToRepair: estimateResult.estimate_summary.items_to_repair,
        itemsToReplace: estimateResult.estimate_summary.items_to_replace,
        generatedById: userId,
        lineItems: {
          create: estimateResult.line_items.map(item => ({
            itemDescription: item.item_description,
            location: item.location,
            category: item.category,
            issueType: item.action_type,
            laborHours: item.labor_hours,
            laborRate: item.labor_rate_per_hour,
            laborCost: item.labor_cost,
            materialCost: item.material_cost,
            totalCost: item.total_cost,
            originalCost: item.original_cost,
            depreciatedValue: item.depreciated_value,
            depreciationRate: item.depreciation_rate_per_year,
            conditionAdjustment: item.condition_adjustment_percent,
            estimatedLifetime: item.average_lifetime_years,
            currentAge: item.estimated_age_years,
            repairInstructions: item.repair_instructions?.join('\n'),
            notes: item.notes,
          })),
        },
      },
      include: { lineItems: true },
    });

    return estimate;
  }

  /**
   * Generate estimate for maintenance request (without inspection)
   */
  async generateEstimateForMaintenance(requestId: number, userId: number) {
    const request = await this.prisma.maintenanceRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: { property: true, unit: true, asset: true },
    });

    // Convert maintenance request to inventory item
    const inventoryItem = this.convertMaintenanceToInventory(request);
    const userLocation = await this.getLocationFromProperty(request.property);

    const agent = createEnhancedEstimateAgent(userLocation);
    const estimateResult = await agent.generateEstimate([inventoryItem]);

    // Save and link to maintenance request
    const estimate = await this.prisma.repairEstimate.create({
      data: {
        maintenanceRequestId: requestId,
        propertyId: request.propertyId,
        unitId: request.unitId,
        // ... similar to above
      },
    });

    return estimate;
  }
}
```

#### 2.3 API Endpoints
Add REST endpoints to `InspectionController`:

```typescript
// POST /api/inspections - Create new inspection
// GET /api/inspections/:id - Get inspection details
// PATCH /api/inspections/:id - Update inspection
// POST /api/inspections/:id/items/:itemId - Update checklist item
// POST /api/inspections/:id/photos - Upload photo
// POST /api/inspections/:id/signatures - Add signature
// POST /api/inspections/:id/complete - Mark complete
// GET /api/inspections/:id/report - Generate PDF report
// POST /api/inspections/:id/estimate - Generate AI estimate
// POST /api/estimates/:id/approve - Approve estimate
// POST /api/estimates/:id/convert-to-maintenance - Create maintenance requests from estimate
```

---

### Phase 3: Frontend Integration (Weeks 8-11)

#### 3.1 UI Component Migration
Port KeyCheck React components to PMS domain architecture:

**New Domain Structure:**
```
tenant_portal_app/src/domains/
├── shared/
│   └── inspection-services/
│       ├── InspectionService.ts          # API client
│       ├── EstimateService.ts            # Estimate API client
│       └── types.ts                      # TypeScript interfaces
├── property-manager/
│   └── features/
│       ├── inspections/
│       │   ├── InspectionListPage.tsx    # All inspections
│       │   ├── InspectionDetailPage.tsx  # View/edit inspection
│       │   ├── NewInspectionPage.tsx     # Create inspection
│       │   ├── InspectionReportPage.tsx  # View PDF report
│       │   └── components/
│       │       ├── InspectionCard.tsx
│       │       ├── RoomChecklist.tsx
│       │       ├── ChecklistItemForm.tsx
│       │       ├── PhotoUploader.tsx
│       │       └── SignaturePad.tsx
│       └── estimates/
│           ├── EstimateListPage.tsx      # All estimates
│           ├── EstimateDetailPage.tsx    # View estimate breakdown
│           └── components/
│               ├── EstimateCard.tsx
│               ├── EstimateLineItemTable.tsx
│               └── CostBreakdownChart.tsx
└── tenant/
    └── features/
        └── inspections/
            ├── MyInspectionsPage.tsx     # Tenant view only
            └── SignInspectionPage.tsx    # Digital signature flow
```

#### 3.2 Route Configuration
Update `App.tsx` and `routes.ts`:

```typescript
// src/constants/routes.ts
export const ROUTES = {
  // ... existing routes
  INSPECTIONS: '/inspections',
  INSPECTION_NEW: '/inspections/new',
  INSPECTION_DETAIL: '/inspections/:id',
  INSPECTION_REPORT: '/inspections/:id/report',
  ESTIMATES: '/estimates',
  ESTIMATE_DETAIL: '/estimates/:id',
  TENANT_INSPECTIONS: '/tenant/inspections',
};

// src/App.tsx - Add routes
<Route path={ROUTES.INSPECTIONS} element={
  <RequireAuth><RequireRole roles={['PROPERTY_MANAGER', 'ADMIN']}>
    <InspectionListPage />
  </RequireRole></RequireAuth>
} />
<Route path={ROUTES.INSPECTION_NEW} element={
  <RequireAuth><RequireRole roles={['PROPERTY_MANAGER', 'ADMIN']}>
    <NewInspectionPage />
  </RequireRole></RequireAuth>
} />
// ... more routes
```

#### 3.3 Sidebar Navigation
Update `Sidebar.tsx` to add inspection links:

```tsx
// Property Manager sidebar
const inspectionLinks = [
  { label: 'Inspections', path: ROUTES.INSPECTIONS, icon: ClipboardCheck },
  { label: 'Estimates', path: ROUTES.ESTIMATES, icon: Calculator },
];

// Tenant sidebar
const tenantInspectionLinks = [
  { label: 'My Inspections', path: ROUTES.TENANT_INSPECTIONS, icon: ClipboardCheck },
];
```

#### 3.4 Key UI Features to Port
1. **Room-by-Room Checklist:** Interactive checklist with expandable categories
2. **Photo Upload:** Multi-photo upload with compression and preview
3. **Condition Selector:** Visual condition picker (Excellent → Poor → Non-functional)
4. **Signature Pad:** Canvas-based digital signature capture
5. **Estimate Visualization:** Charts showing cost breakdown, depreciation analysis
6. **PDF Export:** Generate inspection reports with embedded photos

---

### Phase 4: AI Agent Integration (Weeks 12-14)

#### 4.1 OpenAI Agents SDK Setup
Install and configure OpenAI Agents in backend:

```bash
cd tenant_portal_backend
npm install @openai/agents openai
```

#### 4.2 Port Enhanced Estimate Agent
Create agent implementation in NestJS:

```typescript
// src/inspection/agents/enhanced-estimate-agent.ts
import { Agent } from '@openai/agents';
import { 
  createLaborCostTool, 
  createMaterialCostTool, 
  createDepreciationTool, 
  createLifetimeTool 
} from './tools';

export function createEnhancedEstimateAgent(userLocation: UserLocation): Agent {
  return new Agent({
    name: 'Enhanced Property Repair Estimator',
    model: 'gpt-4o-mini',
    instructions: `
You are an enhanced property repair estimator following a 6-step process:
1. Search average per-hour labor rates by trade (${userLocation.city}, ${userLocation.region})
2. Search current material prices
3. Calculate average per-year depreciation for each item
4. Adjust for condition status with incremental penalties
5. Return to original cost basis
6. Search and return average lifetime of each item

Return ONLY valid JSON without markdown formatting.
    `,
    tools: [
      createLaborCostTool(userLocation),
      createMaterialCostTool(userLocation),
      createDepreciationTool(),
      createLifetimeTool(),
    ],
  });
}
```

#### 4.3 Tool Implementations
Port KeyCheck's cost calculation tools:

**Tools to implement:**
- `laborCostTool.ts` - Calculate trade-specific labor rates
- `materialCostTool.ts` - Fetch current material pricing
- `depreciationTool.ts` - Apply depreciation formulas
- `lifetimeTool.ts` - Estimate item lifetime by category

**Trade-Specific Depreciation Rates:**
```typescript
const DEPRECIATION_RATES = {
  hvac: 0.12,          // 12% per year
  plumbing: 0.08,      // 8% per year
  electrical: 0.10,    // 10% per year
  flooring: 0.15,      // 15% per year
  locksmith: 0.10,
  painter: 0.20,
  carpentry: 0.08,
  roofing: 0.05,
  fencing: 0.10,
  landscaping: 0.25,
  pest_control: 1.0,   // 100% (annual service)
  foundation: 0.02,    // 2% per year
};

const CONDITION_ADJUSTMENTS = {
  EXCELLENT: 0.00,     // 0% additional
  GOOD: 0.15,          // 15% additional
  FAIR: 0.30,          // 30% additional
  POOR: 0.45,          // 45% additional
};
```

#### 4.4 Environment Configuration
Add to `.env`:

```bash
# OpenAI Configuration
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=4000

# Estimate Service
ESTIMATE_DEFAULT_CURRENCY=USD
ESTIMATE_ENABLE_CACHING=true
ESTIMATE_CACHE_TTL_HOURS=24
```

---

### Phase 5: Workflow Integration (Weeks 15-16)

#### 5.1 Inspection → Maintenance Request Flow
Connect inspection findings to maintenance workflow:

```typescript
// src/inspection/inspection.service.ts
async convertEstimateToMaintenanceRequests(
  estimateId: number,
  userId: number
): Promise<MaintenanceRequest[]> {
  const estimate = await this.prisma.repairEstimate.findUniqueOrThrow({
    where: { id: estimateId },
    include: { lineItems: true, inspection: true, property: true, unit: true },
  });

  // Group line items by category (plumbing, electrical, etc.)
  const itemsByCategory = this.groupBy(estimate.lineItems, 'category');

  const requests = [];
  for (const [category, items] of Object.entries(itemsByCategory)) {
    const totalCost = items.reduce((sum, item) => sum + item.totalCost, 0);
    
    const request = await this.prisma.maintenanceRequest.create({
      data: {
        title: `${category.toUpperCase()} Repairs - Inspection ${estimate.inspectionId}`,
        description: this.formatDescription(items),
        priority: this.determinePriority(items),
        authorId: userId,
        propertyId: estimate.propertyId,
        unitId: estimate.unitId,
        status: 'PENDING',
        // Link estimate for cost reference
        // Note: May need to add estimateId field to MaintenanceRequest
      },
    });
    
    requests.push(request);
  }

  return requests;
}
```

#### 5.2 Move-In/Move-Out Inspection Triggers
Automate inspection scheduling:

```typescript
// src/lease/lease.service.ts
async createLease(dto: CreateLeaseDto): Promise<Lease> {
  const lease = await this.prisma.lease.create({ data: dto });

  // Auto-schedule move-in inspection 2 days before start date
  const moveInDate = subDays(lease.startDate, 2);
  await this.scheduleService.createEvent({
    type: 'INSPECTION_MOVE_IN',
    scheduledFor: moveInDate,
    leaseId: lease.id,
    unitId: lease.unitId,
  });

  return lease;
}

async terminateLease(leaseId: number): Promise<Lease> {
  const lease = await this.prisma.lease.update({
    where: { id: leaseId },
    data: { status: 'TERMINATED' },
  });

  // Auto-schedule move-out inspection on end date
  await this.scheduleService.createEvent({
    type: 'INSPECTION_MOVE_OUT',
    scheduledFor: lease.endDate,
    leaseId: lease.id,
    unitId: lease.unitId,
  });

  return lease;
}
```

#### 5.3 Email Notification Templates
Add inspection-related email templates:

```typescript
// src/email/email.service.ts
async sendInspectionScheduled(inspection: UnitInspection, recipients: string[]) {
  await this.mailer.sendMail({
    to: recipients,
    subject: `Inspection Scheduled - ${inspection.property.name}`,
    template: 'inspection-scheduled',
    context: {
      inspectionType: inspection.type,
      propertyName: inspection.property.name,
      unitName: inspection.unit?.name,
      scheduledDate: format(inspection.createdAt, 'PPP'),
      inspectorName: inspection.inspector.name,
    },
  });
}

async sendInspectionCompleted(inspection: UnitInspection) {
  // Notify property manager and tenant
  await this.mailer.sendMail({
    to: [inspection.inspector.email, inspection.tenant?.email],
    subject: `Inspection Complete - ${inspection.property.name}`,
    template: 'inspection-completed',
    context: {
      inspectionType: inspection.type,
      requiresActionCount: inspection.rooms.reduce(
        (count, room) => count + room.checklistItems.filter(i => i.requiresAction).length,
        0
      ),
      reportUrl: `/inspections/${inspection.id}/report`,
    },
  });
}

async sendEstimateReady(estimate: RepairEstimate) {
  await this.mailer.sendMail({
    to: [/* property manager */],
    subject: `Repair Estimate Ready - $${estimate.totalProjectCost.toFixed(2)}`,
    template: 'estimate-ready',
    context: {
      totalCost: estimate.totalProjectCost,
      itemsToRepair: estimate.itemsToRepair,
      itemsToReplace: estimate.itemsToReplace,
      estimateUrl: `/estimates/${estimate.id}`,
    },
  });
}
```

---

### Phase 6: Testing & Quality Assurance (Weeks 17-18)

#### 6.1 Unit Tests
Create comprehensive test coverage:

```typescript
// src/inspection/inspection.service.spec.ts
describe('InspectionService', () => {
  it('should create inspection with default checklist', async () => {
    const inspection = await service.createInspection({
      propertyId: 1,
      unitId: 1,
      type: 'MOVE_IN',
      inspectorId: 1,
    });
    
    expect(inspection.rooms.length).toBeGreaterThan(0);
    expect(inspection.status).toBe('IN_PROGRESS');
  });

  it('should link inspection to maintenance request', async () => {
    const inspection = await service.createInspection({...});
    const request = await maintenanceService.create({...});
    
    await service.linkToMaintenanceRequest(inspection.id, request.id);
    
    const linked = await service.findById(inspection.id);
    expect(linked.maintenanceRequests).toContainEqual(
      expect.objectContaining({ id: request.id })
    );
  });
});

// src/inspection/estimate.service.spec.ts
describe('EstimateService', () => {
  it('should generate estimate from inspection', async () => {
    const inspection = await createTestInspection({
      rooms: [
        {
          name: 'Kitchen',
          items: [
            { 
              itemName: 'Refrigerator', 
              condition: 'POOR', 
              estimatedAge: 15 
            }
          ]
        }
      ]
    });

    const estimate = await estimateService.generateEstimateFromInspection(
      inspection.id, 
      1
    );

    expect(estimate.totalProjectCost).toBeGreaterThan(0);
    expect(estimate.lineItems.length).toBeGreaterThan(0);
    expect(estimate.lineItems[0].depreciationRate).toBeDefined();
  });

  it('should apply condition adjustments correctly', async () => {
    // Test EXCELLENT vs POOR conditions result in different costs
  });

  it('should auto-reclassify from repair to replace when cost-effective', async () => {
    // Test depreciation logic
  });
});
```

#### 6.2 E2E Tests
Add end-to-end workflow tests:

```typescript
// test/inspection.e2e-spec.ts
describe('Inspection Workflow (e2e)', () => {
  it('should complete full inspection flow', async () => {
    // 1. Property manager creates inspection
    const inspection = await request(app.getHttpServer())
      .post('/api/inspections')
      .set('Authorization', `Bearer ${pmToken}`)
      .send({ propertyId: 1, unitId: 1, type: 'MOVE_IN' })
      .expect(201);

    // 2. Update checklist items with conditions
    await request(app.getHttpServer())
      .patch(`/api/inspections/${inspection.body.id}/items/1`)
      .send({ condition: 'FAIR', notes: 'Minor wear' })
      .expect(200);

    // 3. Upload photos
    await request(app.getHttpServer())
      .post(`/api/inspections/${inspection.body.id}/photos`)
      .attach('file', 'test/fixtures/kitchen.jpg')
      .expect(201);

    // 4. Add signatures
    await request(app.getHttpServer())
      .post(`/api/inspections/${inspection.body.id}/signatures`)
      .send({ userId: 2, signatureData: 'data:image/png;base64,...' })
      .expect(201);

    // 5. Complete inspection
    await request(app.getHttpServer())
      .post(`/api/inspections/${inspection.body.id}/complete`)
      .expect(200);

    // 6. Generate estimate
    const estimate = await request(app.getHttpServer())
      .post(`/api/inspections/${inspection.body.id}/estimate`)
      .expect(201);

    expect(estimate.body.totalProjectCost).toBeGreaterThan(0);

    // 7. Convert to maintenance requests
    const requests = await request(app.getHttpServer())
      .post(`/api/estimates/${estimate.body.id}/convert-to-maintenance`)
      .expect(201);

    expect(requests.body.length).toBeGreaterThan(0);
  });
});
```

#### 6.3 Performance Testing
Test with realistic data volumes:

- 100+ inspections with 10 rooms each
- 50+ line items per estimate
- Large photo uploads (5MB+)
- Concurrent estimate generation

---

### Phase 7: Documentation & Training (Week 19)

#### 7.1 Update Copilot Instructions
Add inspection patterns to `.github/copilot-instructions.md`:

```markdown
### Inspection System Patterns

**Database Models:**
- `UnitInspection` - Links to Property, Unit, Lease, includes rooms and signatures
- `InspectionRoom` - Contains ChecklistItems for each room
- `RepairEstimate` - AI-generated cost estimates with depreciation analysis

**Key Services:**
- `InspectionService` - CRUD operations, checklist management, report generation
- `EstimateService` - AI agent integration, cost calculation, depreciation logic

**AI Estimate Generation:**
- 6-step process: labor rates → material costs → depreciation → condition adjustments → original cost → lifetime analysis
- Trade-specific depreciation rates (HVAC 12%, Plumbing 8%, etc.)
- Condition penalties (Excellent 0%, Good 15%, Fair 30%, Poor 45%)
- Auto-reclassify repair→replace when depreciated value hits zero

**Example Usage:**
```typescript
// Generate estimate from inspection
const estimate = await estimateService.generateEstimateFromInspection(
  inspectionId,
  userId
);

// Convert estimate to maintenance requests
const requests = await inspectionService.convertEstimateToMaintenanceRequests(
  estimate.id,
  userId
);
```
```

#### 7.2 User Documentation
Create user guides:

- **Property Manager Guide:** How to create inspections, interpret estimates, convert to maintenance
- **Tenant Guide:** How to sign inspections, view findings, understand deposit deductions
- **Technician Guide:** Using estimates for work order cost verification

#### 7.3 API Documentation
Update API docs with new endpoints:

```markdown
## Inspection Endpoints

### Create Inspection
**POST** `/api/inspections`
```json
{
  "propertyId": 1,
  "unitId": 1,
  "type": "MOVE_IN",
  "inspectorId": 1,
  "tenantId": 2
}
```

### Generate AI Estimate
**POST** `/api/inspections/:id/estimate`
Response includes:
- Total cost breakdown (labor + materials)
- Depreciation analysis per item
- Condition-adjusted values
- Repair vs replace recommendations
```

---

## Implementation Timeline

### Week-by-Week Breakdown

| Week | Phase | Key Deliverables |
|------|-------|------------------|
| 1-3 | Data Model | Prisma schema extensions, migrations, seed data |
| 4-5 | Backend Core | InspectionService, CRUD operations |
| 6-7 | AI Integration | EstimateService, OpenAI agent setup |
| 8-9 | Frontend Components | Inspection UI, checklist forms |
| 10-11 | Frontend Estimates | Estimate visualization, cost breakdowns |
| 12-14 | AI Agent Porting | Tools implementation, testing |
| 15-16 | Workflow Integration | Maintenance linking, email notifications |
| 17-18 | Testing | Unit tests, E2E tests, performance testing |
| 19 | Documentation | User guides, API docs, training materials |

**Total Duration:** 19 weeks (~4.5 months)

---

## Resource Requirements

### Development Team
- **Backend Engineer (Full-time):** Prisma schema, NestJS services, API endpoints
- **Frontend Engineer (Full-time):** React components, UI/UX, state management
- **AI/ML Engineer (Part-time 50%):** OpenAI agent porting, tool implementation
- **QA Engineer (Part-time 50%):** Test coverage, E2E testing, bug fixes
- **Technical Writer (Part-time 25%):** Documentation, user guides

### Infrastructure
- **OpenAI API Credits:** ~$200-500/month (estimate generation)
- **Storage:** Additional 100GB for inspection photos
- **Database:** Expand PostgreSQL to handle inspection data

### Third-Party Services
- **OpenAI API:** GPT-4o-mini for estimate generation
- **PDF Generation:** Existing library or new service for reports
- **Image Processing:** Optional - compression, thumbnail generation

---

## Risk Assessment

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| OpenAI API rate limits | HIGH | MEDIUM | Implement caching, queue system |
| Estimate accuracy concerns | HIGH | MEDIUM | Human review workflow, confidence scores |
| Photo storage costs | MEDIUM | HIGH | Image compression, CDN optimization |
| Performance degradation | MEDIUM | MEDIUM | Database indexing, query optimization |
| Data migration issues | HIGH | LOW | Parallel operation, rollback plan |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| User adoption resistance | HIGH | MEDIUM | Training, gradual rollout |
| Estimate disputes | HIGH | MEDIUM | Clear disclaimers, manual override |
| Legal/compliance issues | HIGH | LOW | Legal review, proper disclosures |
| Budget overruns | MEDIUM | MEDIUM | Phased approach, cost monitoring |

---

## Success Metrics

### Technical Metrics
- **API Response Time:** < 2 seconds for inspection CRUD
- **Estimate Generation:** < 30 seconds per estimate
- **Photo Upload:** < 5 seconds per image
- **Test Coverage:** > 80% for inspection/estimate modules
- **Uptime:** 99.9% availability

### Business Metrics
- **Inspection Completion Rate:** > 90% within 24 hours
- **Estimate Accuracy:** ±15% of actual repair costs
- **Time Savings:** 60% reduction in manual estimate creation
- **User Satisfaction:** 4.0+ rating for inspection experience
- **Cost Savings:** 20% reduction in unexpected repair costs

---

## Post-Integration Roadmap

### Phase 8: Enhancements (Months 6-9)
- **Mobile App:** Native iOS/Android apps for on-site inspections
- **Photo AI Analysis:** Auto-detect damage using computer vision
- **Predictive Maintenance:** ML model to predict failures based on inspection history
- **Vendor Integration:** Direct work order dispatch to contractors with estimates
- **Tenant Portal:** Self-service inspection viewing and dispute resolution

### Phase 9: Advanced Features (Months 10-12)
- **3D Property Scans:** LiDAR integration for spatial measurements
- **Voice Inspection:** Voice-to-text for hands-free note taking
- **Blockchain Signatures:** Immutable inspection record keeping
- **API Marketplace:** Third-party integrations (insurance, contractors)

---

## Conclusion

This integration plan unifies **Property Management Suite** and **KeyCheck** into a comprehensive platform that:

1. **Streamlines Operations:** Single system for property management + inspections
2. **Improves Accuracy:** AI-powered cost estimation with 6-step analysis
3. **Enhances User Experience:** Digital inspections with signatures, photos, reports
4. **Increases Revenue:** Better maintenance planning, reduced surprise costs
5. **Future-Proof Architecture:** Microservices design, API-first approach

**Estimated Total Investment:** 
- Development: 19 weeks × $10K/week = $190K
- Infrastructure: $5K setup + $500/month ongoing
- **Total Year 1:** ~$196K

**Expected ROI:**
- Time savings: 400 hours/year @ $75/hour = $30K/year
- Cost avoidance: 20% reduction on $500K repairs = $100K/year
- **Break-even: ~18 months**

**Recommendation:** Proceed with phased implementation starting with Phase 1 (Data Model) to validate integration approach with minimal risk.

---

**Next Steps:**
1. Executive approval of plan and budget
2. Assign development team
3. Create detailed Phase 1 tasks in project management tool
4. Schedule weekly progress reviews
5. Begin Prisma schema design and review

**Questions or Feedback:** Contact technical lead for clarification on any phase.
