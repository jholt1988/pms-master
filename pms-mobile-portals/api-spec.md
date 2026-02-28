# PMS API Structure

## Base URL
`https://api.pms.example.com/v1`

## Auth
- JWT Bearer token in Authorization header
- Refresh token rotation
- Token refresh endpoint: `POST /auth/refresh`

## Endpoints

### Auth
```
POST   /auth/login          - Email/password login
POST   /auth/refresh        - Refresh access token
POST   /auth/logout         - Invalidate token
POST   /auth/forgot-password
PUT    /auth/reset-password
```

### Tenants
```
GET    /tenants/me          - Current tenant profile
PUT    /tenants/me          - Update profile
GET    /tenants/me/unit     - Unit details
GET    /tenants/me/leases   - Lease documents
GET    /tenants/me/payments - Payment history
```

### Payments
```
GET    /payments/upcoming   - Upcoming rent amount & due date
POST   /payments           - Submit payment
GET    /payments/:id       - Payment details
GET    /payments/methods   - Saved payment methods
POST   /payments/methods   - Add payment method
DELETE /payments/methods/:id - Remove payment method
```

### Maintenance
```
GET    /maintenance          - List requests
POST   /maintenance          - Create new request
GET    /maintenance/:id      - Request details
PUT    /maintenance/:id      - Update/note
POST   /maintenance/:id/photos - Upload photos
```

### Inspections
```
GET    /inspections          - List (upcoming & past)
GET    /inspections/upcoming - Next scheduled
GET    /inspections/:id      - Details & checklist
PUT    /inspections/:id      - Submit tenant completion
POST   /inspections/:id/photos - Upload item photos
GET    /inspections/:id/report - View report
```

### Messages
```
GET    /conversations        - Message threads
GET    /conversations/:id    - Thread messages
POST   /conversations/:id    - Send message
POST   /conversations/:id/read - Mark read
```

## Tenant Inspection Flow

1. **GET /inspections** → Shows upcoming inspection card
2. Tenant clicks "Start Checklist" → **GET /inspections/:id** loads checklist
3. Tenant completes items → **PUT /inspections/:id** with progress
4. Photos → **POST /inspections/:id/photos** (multipart/form-data)
5. Submit → **PUT /inspections/:id** with `status: "tenant_completed"`

## Inspection Object
```json
{
  "id": "insp_123",
  "type": "annual",
  "scheduled_date": "2026-03-15",
  "scheduled_time": "10:00",
  "duration_minutes": 30,
  "status": "scheduled",
  "unit_id": "unit_4b",
  "unit_number": "4B",
  "property_name": "Riverside Apartments",
  "can_complete": true,
  "available_from": "2026-03-14T00:00:00Z",
  "checklist_rooms": [
    {
      "name": "Living Room",
      "items": [
        {
          "id": "item_1",
          "description": "Smoke detectors functional",
          "status": null,
          "requires_action": false,
          "notes": "",
          "photos": []
        }
      ]
    }
  ]
}
```

## Response Codes
- 200: Success
- 201: Created
- 400: Bad request
- 401: Unauthorized
- 403: Forbidden
- 404: Not found
- 422: Validation error
- 500: Server error

## Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Checklist incomplete",
    "details": [{"field": "checklist", "message": "At least 5 items required"}]
  }
}
```

## WebSocket (Real-time)
`wss://ws.pms.example.com/v1`

Events:
- `message.new` - New message received
- `maintenance.update` - Request status changed
- `inspection.reminder` - Upcoming inspection alert
- `payment.received` - Payment confirmation

## AI Endpoints (Admin)
```
POST   /ai/inspection/analyze   - Photo → work plan
POST   /ai/pricing/recommend    - Rent optimization
POST   /ai/insights/generate    - Property insights
```