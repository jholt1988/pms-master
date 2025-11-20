# Phase 1: Data Model Unification - Detailed Task Breakdown
## Weeks 1-3 | KeyCheck Integration

**Phase Owner:** Backend Engineer  
**Status:** Not Started  
**Dependencies:** None (Kickoff Phase)

---

## Week 1: Schema Design & Planning

### Task 1.1: Environment Setup & Prerequisites
**Assignee:** Backend Engineer  
**Estimate:** 4 hours  
**Priority:** HIGH

**Subtasks:**
- [ ] Set up local development environment with both codebases
- [ ] Clone KeyCheck repository and review data structures
- [ ] Install Prisma CLI and verify PostgreSQL connection
- [ ] Create feature branch: `feature/inspection-integration-phase1`
- [ ] Document current PMS schema models (Property, Unit, MaintenanceRequest)
- [ ] Document KeyCheck Supabase schema for comparison

**Acceptance Criteria:**
- Both applications run locally without conflicts
- Database connection verified for PMS PostgreSQL
- Feature branch created and pushed to remote
- Schema comparison document created

**Deliverables:**
- `docs/SCHEMA_COMPARISON.md` - Side-by-side schema analysis

---

### Task 1.2: Design Prisma Schema Extensions
**Assignee:** Backend Engineer  
**Estimate:** 8 hours  
**Priority:** HIGH

**Subtasks:**
- [ ] Map KeyCheck data models to Prisma schema format
- [ ] Design `UnitInspection` model with relations to Property, Unit, Lease
- [ ] Design `InspectionRoom` model with room type enum
- [ ] Design `InspectionChecklistItem` with condition tracking
- [ ] Design `InspectionChecklistSubItem` for grouped items
- [ ] Design `UnitInspectionPhoto` with upload metadata
- [ ] Design `InspectionSignature` with digital signature storage
- [ ] Design `RepairEstimate` model with cost breakdown
- [ ] Design `RepairEstimateLineItem` with depreciation fields
- [ ] Define all enums (InspectionType, InspectionStatus, InspectionCondition, RoomType, EstimateStatus)
- [ ] Map relationships and foreign keys
- [ ] Add indexes for query optimization

**Acceptance Criteria:**
- Complete Prisma schema draft in `schema.prisma`
- All relationships properly defined with cascade rules
- Enums match business requirements
- Indexes added for performance-critical queries
- Schema passes Prisma validation: `npx prisma validate`

**Deliverables:**
- Updated `tenant_portal_backend/prisma/schema.prisma`
- `docs/SCHEMA_DESIGN_DECISIONS.md` - Rationale for design choices

---

### Task 1.3: Schema Review & Refinement
**Assignee:** Backend Engineer + Tech Lead  
**Estimate:** 4 hours  
**Priority:** HIGH

**Subtasks:**
- [ ] Conduct peer review of schema design
- [ ] Validate foreign key relationships
- [ ] Review cascade delete implications
- [ ] Check for naming consistency with existing models
- [ ] Verify enum completeness
- [ ] Test schema compatibility with existing queries
- [ ] Address review feedback and make adjustments

**Acceptance Criteria:**
- Schema approved by tech lead
- No breaking changes to existing models
- Documentation updated with final decisions
- All review comments addressed

**Deliverables:**
- Schema review meeting notes
- Approved schema ready for migration

---

## Week 2: Database Migration & Seed Data

### Task 2.1: Create Prisma Migration
**Assignee:** Backend Engineer  
**Estimate:** 6 hours  
**Priority:** HIGH

**Subtasks:**
- [ ] Generate Prisma migration: `npx prisma migrate dev --name add_inspection_system`
- [ ] Review generated SQL migration file
- [ ] Test migration on local database
- [ ] Verify all tables created correctly
- [ ] Verify indexes created
- [ ] Test rollback capability: `npx prisma migrate reset`
- [ ] Document migration process

**Acceptance Criteria:**
- Migration creates all 9 new tables without errors
- All foreign keys properly established
- Indexes created as specified
- Migration can be rolled back cleanly
- No data loss in existing tables

**Deliverables:**
- Migration file: `prisma/migrations/YYYYMMDDHHMMSS_add_inspection_system/migration.sql`
- `docs/MIGRATION_GUIDE.md` - Step-by-step migration instructions

**SQL Verification Queries:**
```sql
-- Verify tables created
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' AND table_name LIKE '%inspection%';

-- Verify indexes
SELECT indexname, tablename FROM pg_indexes 
WHERE tablename LIKE '%inspection%';

-- Verify foreign keys
SELECT conname, conrelid::regclass, confrelid::regclass 
FROM pg_constraint 
WHERE contype = 'f' AND conrelid::regclass::text LIKE '%inspection%';
```

---

### Task 2.2: Update Prisma Client
**Assignee:** Backend Engineer  
**Estimate:** 2 hours  
**Priority:** HIGH

**Subtasks:**
- [ ] Regenerate Prisma Client: `npx prisma generate`
- [ ] Verify new models available in TypeScript
- [ ] Test type inference for new models
- [ ] Update any affected imports in existing services
- [ ] Run existing unit tests to ensure no breakage
- [ ] Fix any TypeScript errors introduced by schema changes

**Acceptance Criteria:**
- Prisma Client regenerated successfully
- TypeScript compilation succeeds
- All existing unit tests pass (141 tests)
- New types available: `UnitInspection`, `InspectionRoom`, etc.

**Deliverables:**
- Updated `node_modules/.prisma/client/`
- No broken imports in existing code

---

### Task 2.3: Create Seed Data for Inspection Templates
**Assignee:** Backend Engineer  
**Estimate:** 8 hours  
**Priority:** MEDIUM

**Subtasks:**
- [ ] Design default checklist templates for common property types
- [ ] Create seed data for residential apartment checklist
- [ ] Create seed data for single-family home checklist
- [ ] Create seed data for commercial property checklist
- [ ] Define standard room types and items per room
- [ ] Add sample inspection for testing purposes
- [ ] Update `prisma/seed.ts` with inspection data
- [ ] Test seed script: `npm run db:seed`

**Acceptance Criteria:**
- Seed script runs without errors
- Templates created for 3 property types
- Each template has 5-10 rooms with 5-20 items each
- Sample inspection created for development testing
- Seed is idempotent (can run multiple times)

**Deliverables:**
- Updated `tenant_portal_backend/prisma/seed.ts`
- `docs/INSPECTION_TEMPLATES.md` - Template specifications

**Template Structure Example:**
```typescript
const apartmentChecklist = {
  rooms: [
    {
      name: 'Kitchen',
      type: 'KITCHEN',
      items: [
        { category: 'Appliances', item: 'Refrigerator', estimatedAge: 0 },
        { category: 'Appliances', item: 'Stove/Oven', estimatedAge: 0 },
        { category: 'Fixtures', item: 'Sink and Faucet', estimatedAge: 0 },
        { category: 'Cabinets', item: 'Upper Cabinets', estimatedAge: 0 },
        { category: 'Cabinets', item: 'Lower Cabinets', estimatedAge: 0 },
        { category: 'Flooring', item: 'Floor Condition', estimatedAge: 0 },
        { category: 'Walls', item: 'Paint/Wallpaper', estimatedAge: 0 },
        { category: 'Lighting', item: 'Light Fixtures', estimatedAge: 0 },
      ],
    },
    {
      name: 'Living Room',
      type: 'LIVING_ROOM',
      items: [
        { category: 'Flooring', item: 'Carpet/Hardwood', estimatedAge: 0 },
        { category: 'Walls', item: 'Paint Condition', estimatedAge: 0 },
        { category: 'Windows', item: 'Window Condition', estimatedAge: 0 },
        { category: 'Doors', item: 'Entry Door', estimatedAge: 0 },
        { category: 'Electrical', item: 'Outlets/Switches', estimatedAge: 0 },
        { category: 'HVAC', item: 'Vents/Registers', estimatedAge: 0 },
      ],
    },
    // ... more rooms
  ],
};
```

---

### Task 2.4: Add MaintenanceRequest Relation to Inspection
**Assignee:** Backend Engineer  
**Estimate:** 3 hours  
**Priority:** MEDIUM

**Subtasks:**
- [ ] Add optional `inspectionId` field to `MaintenanceRequest` model
- [ ] Add relation: `inspection UnitInspection?`
- [ ] Create migration for this change
- [ ] Update existing maintenance services to handle optional inspection link
- [ ] Test backward compatibility with existing maintenance requests

**Acceptance Criteria:**
- `MaintenanceRequest` can optionally link to inspection
- Existing maintenance requests unaffected (null inspectionId)
- Relation properly cascades on delete
- No breaking changes to maintenance API

**Deliverables:**
- Updated schema with relation
- New migration file

---

## Week 3: Data Quality & Testing

### Task 3.1: Database Indexing Optimization
**Assignee:** Backend Engineer  
**Estimate:** 4 hours  
**Priority:** MEDIUM

**Subtasks:**
- [ ] Add composite indexes for common query patterns
- [ ] Index `UnitInspection` on (propertyId, status, createdAt)
- [ ] Index `InspectionChecklistItem` on (roomId, requiresAction)
- [ ] Index `RepairEstimate` on (status, generatedAt)
- [ ] Index `RepairEstimateLineItem` on (estimateId, category)
- [ ] Test query performance with `EXPLAIN ANALYZE`
- [ ] Document indexing strategy

**Acceptance Criteria:**
- All critical queries use indexes (no seq scans)
- Query performance < 50ms for filtered lists
- `EXPLAIN ANALYZE` shows index usage
- Documentation explains index choices

**Deliverables:**
- `docs/INDEXING_STRATEGY.md`
- Performance test results

**Example Performance Tests:**
```sql
-- Test: Get all inspections for property (should use index)
EXPLAIN ANALYZE 
SELECT * FROM "UnitInspection" 
WHERE "propertyId" = 1 AND status = 'IN_PROGRESS';

-- Test: Get all action items for inspection (should use index)
EXPLAIN ANALYZE
SELECT ic.* FROM "InspectionChecklistItem" ic
JOIN "InspectionRoom" ir ON ic."roomId" = ir.id
WHERE ir."inspectionId" = 1 AND ic."requiresAction" = true;
```

---

### Task 3.2: Create Test Factories for New Models
**Assignee:** Backend Engineer  
**Estimate:** 6 hours  
**Priority:** HIGH

**Subtasks:**
- [ ] Add inspection factory to `test/factories/index.ts`
- [ ] Create `createTestInspection()` helper
- [ ] Create `createTestRoom()` helper
- [ ] Create `createTestChecklistItem()` helper
- [ ] Create `createTestEstimate()` helper
- [ ] Create `createTestSignature()` helper
- [ ] Write factory usage examples
- [ ] Test factories in isolation

**Acceptance Criteria:**
- Factories create valid test data
- Factories support customization via options
- Factories handle relations properly
- Examples documented for other developers

**Deliverables:**
- Updated `test/factories/index.ts`
- `test/factories/inspection.factory.ts` (new file)

**Factory Example:**
```typescript
// test/factories/inspection.factory.ts
export async function createTestInspection(
  prisma: PrismaService,
  overrides: Partial<UnitInspection> = {}
) {
  return await prisma.unitInspection.create({
    data: {
      type: 'MOVE_IN',
      status: 'IN_PROGRESS',
      propertyId: 1,
      unitId: 1,
      inspectorId: 1,
      createdById: 1,
      ...overrides,
      rooms: {
        create: [
          {
            name: 'Kitchen',
            roomType: 'KITCHEN',
            checklistItems: {
              create: [
                {
                  category: 'Appliances',
                  itemName: 'Refrigerator',
                  condition: 'GOOD',
                  estimatedAge: 5,
                },
              ],
            },
          },
        ],
      },
    },
    include: { rooms: { include: { checklistItems: true } } },
  });
}
```

---

### Task 3.3: Write Unit Tests for Data Model
**Assignee:** Backend Engineer  
**Estimate:** 6 hours  
**Priority:** HIGH

**Subtasks:**
- [ ] Write tests for inspection creation
- [ ] Write tests for cascade deletes
- [ ] Write tests for required field validation
- [ ] Write tests for enum validation
- [ ] Write tests for unique constraints
- [ ] Write tests for foreign key relationships
- [ ] Write tests for default values
- [ ] Achieve 100% model test coverage

**Acceptance Criteria:**
- All model constraints tested
- Tests pass consistently
- Edge cases covered (null handling, cascade deletes)
- Test coverage report generated

**Deliverables:**
- `test/models/inspection.model.spec.ts` (new file)
- Test coverage report showing model coverage

**Test Example:**
```typescript
// test/models/inspection.model.spec.ts
describe('UnitInspection Model', () => {
  it('should create inspection with required fields', async () => {
    const inspection = await prisma.unitInspection.create({
      data: {
        type: 'MOVE_IN',
        propertyId: 1,
        unitId: 1,
        inspectorId: 1,
        createdById: 1,
      },
    });

    expect(inspection.status).toBe('IN_PROGRESS');
    expect(inspection.reportGenerated).toBe(false);
  });

  it('should enforce foreign key constraints', async () => {
    await expect(
      prisma.unitInspection.create({
        data: {
          type: 'MOVE_IN',
          propertyId: 9999, // Non-existent property
          unitId: 1,
          inspectorId: 1,
          createdById: 1,
        },
      })
    ).rejects.toThrow();
  });

  it('should cascade delete rooms when inspection deleted', async () => {
    const inspection = await createTestInspection(prisma);
    await prisma.unitInspection.delete({ where: { id: inspection.id } });
    
    const roomCount = await prisma.inspectionRoom.count({
      where: { inspectionId: inspection.id },
    });
    expect(roomCount).toBe(0);
  });
});
```

---

### Task 3.4: Create Database Backup Strategy
**Assignee:** Backend Engineer + DevOps  
**Estimate:** 3 hours  
**Priority:** MEDIUM

**Subtasks:**
- [ ] Document backup procedure before migration
- [ ] Create backup script for PostgreSQL
- [ ] Test backup restoration process
- [ ] Document rollback procedure
- [ ] Schedule automated backups (if production)

**Acceptance Criteria:**
- Backup script executes successfully
- Restoration tested and verified
- Rollback procedure documented
- Backup stored securely

**Deliverables:**
- `scripts/backup-database.sh`
- `docs/BACKUP_RESTORE_GUIDE.md`

**Backup Script:**
```bash
#!/bin/bash
# scripts/backup-database.sh

TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_DIR="./backups"
DB_NAME="tenant_portal_back_DB"
BACKUP_FILE="$BACKUP_DIR/backup_${DB_NAME}_${TIMESTAMP}.sql"

mkdir -p $BACKUP_DIR

echo "Creating backup of $DB_NAME..."
pg_dump -U postgres -h localhost $DB_NAME > $BACKUP_FILE

if [ $? -eq 0 ]; then
    echo "Backup successful: $BACKUP_FILE"
    gzip $BACKUP_FILE
    echo "Backup compressed: $BACKUP_FILE.gz"
else
    echo "Backup failed!"
    exit 1
fi
```

---

### Task 3.5: Update Schema Documentation
**Assignee:** Backend Engineer + Technical Writer  
**Estimate:** 4 hours  
**Priority:** LOW

**Subtasks:**
- [ ] Generate Prisma ERD diagram
- [ ] Document all new models with descriptions
- [ ] Document relationships and cardinality
- [ ] Create data dictionary for enums
- [ ] Add examples of common queries
- [ ] Update API documentation placeholder

**Acceptance Criteria:**
- ERD diagram generated (PNG/SVG)
- All models documented with purpose
- Enum values explained
- Query examples provided

**Deliverables:**
- `docs/DATABASE_SCHEMA_ERD.png`
- Updated `docs/DATABASE_DOCUMENTATION.md`

---

## Phase 1 Completion Checklist

### Code Quality Gates
- [ ] All TypeScript compilation successful (no errors)
- [ ] Prisma schema validation passes
- [ ] All migrations execute successfully
- [ ] Seed data loads without errors
- [ ] Test factories create valid data
- [ ] Unit tests for models pass (100% coverage)
- [ ] No breaking changes to existing code
- [ ] All existing tests still pass (141 tests)

### Documentation Gates
- [ ] Schema design decisions documented
- [ ] Migration guide complete
- [ ] Backup/restore procedures documented
- [ ] Indexing strategy documented
- [ ] ERD diagram generated
- [ ] API documentation updated

### Review Gates
- [ ] Code review by tech lead completed
- [ ] Security review of data model (PII handling)
- [ ] Performance review of indexes
- [ ] Documentation review by technical writer

### Deployment Readiness
- [ ] Feature branch merged to develop
- [ ] Migration tested on staging database
- [ ] Rollback plan documented and tested
- [ ] Team trained on new data model

---

## Risk Mitigation

### Risk: Migration Fails in Production
**Mitigation:**
- Test migration on staging database first
- Create full database backup before migration
- Document rollback procedure
- Schedule migration during low-traffic window

### Risk: Performance Issues with New Indexes
**Mitigation:**
- Use `EXPLAIN ANALYZE` on all critical queries
- Monitor query performance in staging
- Add indexes incrementally, test each
- Have index removal plan if needed

### Risk: Data Type Mismatches with KeyCheck
**Mitigation:**
- Create comprehensive mapping document
- Test data import scripts early
- Validate sample data transformations
- Maintain parallel operation capability

---

## Phase 1 Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Migration Success Rate | 100% | No rollbacks needed |
| Schema Validation | Pass | `npx prisma validate` |
| Test Coverage (Models) | 100% | Jest coverage report |
| Query Performance | < 50ms | `EXPLAIN ANALYZE` results |
| Existing Tests Passing | 141/141 | `npm test` output |
| Documentation Complete | 100% | All deliverables present |

---

## Handoff to Phase 2

### Phase 2 Prerequisites
- [ ] All Phase 1 tasks completed
- [ ] Database schema stable and tested
- [ ] Test factories available for use
- [ ] Documentation accessible to team

### Artifacts for Phase 2
- Prisma schema with all inspection models
- Test factories for creating inspection data
- Database indexes optimized
- ERD diagram for reference
- Migration guide for deployment

### Phase 2 Kickoff Requirements
- Backend engineer assigned
- Access to development environment
- Schema documentation reviewed
- Phase 2 tasks estimated and scheduled

---

**Phase 1 Estimated Total Hours:** 62 hours (~1.5 weeks for one engineer)  
**Phase 1 Recommended Duration:** 3 weeks (allows buffer for reviews, testing, documentation)  
**Phase 1 Budget:** $9,300 @ $150/hour blended rate

**Status Tracking:** Update this document as tasks complete. Use GitHub Project Board for day-to-day tracking.
