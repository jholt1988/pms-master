# P0-3 — Maintenance photo upload (multipart)

## Scope delivered
Implemented maintenance photo upload as multipart file upload end-to-end:
- Backend: `POST /api/maintenance/:id/photos` now accepts uploaded image files (`files[]`) using Nest `FilesInterceptor` + `multer` memory storage and persists each uploaded photo as `MaintenancePhoto`.
- Frontend: tenant maintenance request form now supports file picker, client-side previews, and basic upload progress indicator.

## Backend changes

### 1) Endpoint upgrade to multipart upload
**File:** `tenant_portal_backend/src/maintenance/maintenance.controller.ts`

- Updated `@Post(':id/photos')` to use:
  - `@UseInterceptors(FilesInterceptor('files', 10, ...))`
  - `memoryStorage()`
  - size limit: `10MB` per file
  - file type validation via `fileFilter`
- Allowed mime types:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/heic`
  - `image/heif`
- Saves each file to: `uploads/maintenance/` using random hex filename + original extension.
- Persists DB row through `maintenanceService.addPhotoScoped(...)` for each file.
- Returns response shape:

```json
{
  "uploaded": [
    {
      "id": 123,
      "url": "/uploads/maintenance/<generated-file>",
      "caption": "optional",
      "createdAt": "2026-03-06T03:00:00.000Z",
      "mimeType": "image/jpeg",
      "size": 123456,
      "originalName": "kitchen-leak.jpg"
    }
  ],
  "count": 1
}
```

### 2) DTO compatibility update
**File:** `tenant_portal_backend/src/maintenance/dto/add-maintenance-photo.dto.ts`

- `caption` remains optional.
- `url` changed to optional for backward compatibility with older JSON callers.

### 3) Service support for uploaded URL override
**File:** `tenant_portal_backend/src/maintenance/maintenance.service.ts`

- `addPhoto(...)` now accepts optional `uploadedUrl?: string`.
- Uses `uploadedUrl ?? dto.url` and validates URL exists.
- `addPhotoScoped(...)` now also accepts optional `uploadedUrl` and forwards it.

This preserves legacy call paths while supporting new multipart upload flow.

## Frontend changes

### 1) File upload UI + preview + basic progress
**File:** `tenant_portal_app/src/domains/tenant/features/maintenance/MaintenancePage.tsx`

- Replaced “Photo URLs” textarea with:
  - file picker (`multiple`, accepts common image mime types)
  - optional caption input
  - preview grid for selected images
  - basic per-file progress text (0/20/100 style progression)
- During submit:
  - create maintenance request first
  - if files selected, send `FormData` to `/maintenance/:id/photos`
    - append all files under `files`
    - append caption if provided

### 2) Relative media URL handling
- Added helper to resolve relative upload paths like `/uploads/maintenance/...` into browser-safe URLs for links.

### 3) FormData support in API client
**File:** `tenant_portal_app/src/services/apiClient.ts`

- `apiFetch` now detects `FormData` body and does **not** set JSON `Content-Type` header for multipart requests.

## Endpoint contract (final)

### `POST /api/maintenance/:id/photos`
- **Auth:** JWT + existing role/org guards (same as maintenance controller)
- **Content-Type:** `multipart/form-data`
- **Fields:**
  - `files` (required, repeatable, max 10 files)
  - `caption` (optional string)
- **Validation:**
  - file required
  - max file size 10MB per file
  - mime type must be one of allowed image types above
- **Response:**
  - `uploaded[]` with persisted photo metadata + upload metadata
  - `count`

## Build/test evidence

### Backend build
Command:
```bash
cd tenant_portal_backend && npm run build
```
Result: ✅ pass (`tsc` exit code 0)

### Frontend build
Command:
```bash
cd tenant_portal_app && npm run build
```
Result: ✅ pass (Vite build completed)

### Note on existing test baseline
Command:
```bash
cd tenant_portal_backend && npm test -- src/maintenance/maintenance.service.spec.ts
```
Result: ❌ fails due to pre-existing spec assumptions using non-UUID request ids (`Invalid maintenance request id: 1`), unrelated to this P0-3 upload implementation.

---

## Changed files
- `tenant_portal_backend/src/maintenance/maintenance.controller.ts`
- `tenant_portal_backend/src/maintenance/maintenance.service.ts`
- `tenant_portal_backend/src/maintenance/dto/add-maintenance-photo.dto.ts`
- `tenant_portal_app/src/domains/tenant/features/maintenance/MaintenancePage.tsx`
- `tenant_portal_app/src/services/apiClient.ts`
