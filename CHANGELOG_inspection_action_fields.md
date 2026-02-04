# Inspection action fields (Severity / Issue Type / Measurement)

## Goal
Tighten repair/replace bid ranges by collecting **structured inputs** during inspections, without adding “flashy” UI or heavy maintenance burden.

## What changed

### Database / Prisma
- Added enums:
  - `InspectionIssueType`: `INVESTIGATE | REPAIR | REPLACE`
  - `MeasurementUnit`: `COUNT | LINEAR_FT | SQFT | INCH | FOOT`
- Extended `InspectionChecklistItem` with optional fields:
  - `issueType` (enum)
  - `severity` (reuses existing `SeverityLevel` enum)
  - `measurementValue` (float)
  - `measurementUnit` (enum)
  - `measurementNotes` (string)
- Added SQL migration (manual) at:
  - `tenant_portal_backend/prisma/migrations/20260204105000_inspection_item_action_fields/migration.sql`

**Why:** These fields give the estimator concrete scope/urgency signals (e.g., “12 LINEAR_FT of baseboard repair”) and reduce hallucinated pricing ranges.

### Backend
- DTO updates (`simple-inspection.dto.ts`):
  - `InspectionCondition` now includes `DAMAGED` and `NON_FUNCTIONAL` to match Prisma.
  - Added DTO enums for `SeverityLevel`, `InspectionIssueType`, `MeasurementUnit`.
  - Extended room batch update payload (`UpdateChecklistItemBatchEntryDto`) to accept the new fields.
- Room batch update service (`inspection.service.ts`):
  - Transactional per-room update now persists `severity`, `issueType`, and measurement fields.
- Estimate generation mapping (`estimate.service.ts`):
  - When `issueType` is present on a checklist item, it is used to set `action_needed` (including `investigate`).
  - Severity and measurement data are passed through to the AI estimator.
- AI prompt (`enhanced-estimate-agent.ts`):
  - User prompt now includes severity + issue type + measurement.

**Why:** Preserve the “all-or-nothing per room” save behavior while giving the estimator higher quality inputs.

### Frontend
- Inspection detail checklist UI (`InspectionDetailPage.tsx`):
  - When **Requires action** is enabled, the editor now shows **optional** fields:
    - Severity
    - Issue type (Investigate / Repair / Replace)
    - Measurement value + unit
    - Measurement notes
  - These fields are saved via the existing per-room atomic save endpoint.

**Why:** Subtle UX upgrade—more power when needed, without cluttering the default workflow.

## Commit
- `5e3b014` Add severity/issue type/measurement fields for inspection action items

## Notes / Follow-ups
- Prisma migration was authored manually because `DATABASE_URL` wasn’t available in this environment to run `prisma migrate dev`.
- Next high-ROI step: add a simple labor-rate table (by trade + region) to ground bid ranges.
