# Leasing Agent API Endpoints Reference

## 🎯 Base URL
```
http://localhost:3001/api
```

## 📋 Lead Management Endpoints

### Create/Update Lead
```http
POST /api/leads
Content-Type: application/json

{
  "sessionId": "session-123456",
  "name": "John Doe",
  "email": "john@example.com",
  "phone": "555-1234",
  "bedrooms": 2,
  "budget": 1800,
  "moveInDate": "2025-02-01",
  "petFriendly": true,
  "preferences": ["parking", "gym", "pool"]
}

Response:
{
  "success": true,
  "leadId": "uuid",
  "message": "Lead saved successfully"
}
```

### Get Lead by Session ID
```http
GET /api/leads/session/:sessionId

Response:
{
  "success": true,
  "lead": {
    "id": "uuid",
    "sessionId": "session-123456",
    "name": "John Doe",
    ...
    "messages": [...],
    "tours": [...],
    "applications": [...]
  }
}
```

### Get All Leads (Filtered)
```http
GET /api/leads?status=NEW&search=john&limit=20&offset=0

Response:
{
  "success": true,
  "leads": [...],
  "total": 45
}
```

### Add Message to Conversation
```http
POST /api/leads/:id/messages
Content-Type: application/json

{
  "role": "USER",  // or "ASSISTANT", "SYSTEM"
  "content": "I'm looking for a 2-bedroom apartment",
  "metadata": { ... }
}

Response:
{
  "success": true,
  "message": { ... }
}
```

### Search Properties
```http
GET /api/leads/properties/search?bedrooms=2&maxRent=2000&petFriendly=true&limit=10

Response:
{
  "success": true,
  "properties": [
    {
      "propertyId": "1",
      "unitId": "5",
      "address": "123 Main St",
      "bedrooms": 2,
      "bathrooms": 2,
      "rent": 1800,
      "available": true,
      "amenities": ["Parking", "Pool", "Gym"],
      "matchScore": 0.95
    }
  ]
}
```

### Record Property Inquiry
```http
POST /api/leads/:id/inquiries
Content-Type: application/json

{
  "propertyId": 1,
  "unitId": 5,
  "interest": "HIGH"  // LOW, MEDIUM, HIGH
}

Response:
{
  "success": true,
  "inquiry": { ... }
}
```

### Update Lead Status
```http
POST /api/leads/:id/status
Content-Type: application/json

{
  "status": "QUALIFIED"  // NEW, CONTACTED, QUALIFIED, TOURING, APPLYING, etc.
}

Response:
{
  "success": true,
  "lead": { ... }
}
```

### Get Lead Statistics
```http
GET /api/leads/stats/dashboard?dateFrom=2025-01-01&dateTo=2025-01-31

Response:
{
  "success": true,
  "stats": {
    "totalLeads": 150,
    "newLeads": 45,
    "qualifiedLeads": 60,
    "touringLeads": 25,
    "convertedLeads": 15,
    "lostLeads": 5,
    "conversionRate": 10.0
  }
}
```

---

## 📅 Tour Management Endpoints

### Schedule a Tour
```http
POST /api/tours/schedule
Content-Type: application/json

{
  "leadId": "uuid",
  "propertyId": 1,
  "unitId": 5,
  "preferredDate": "2025-01-15",
  "preferredTime": "2:00 PM",
  "notes": "Interested in parking space"
}

Response:
{
  "success": true,
  "tourId": "uuid",
  "message": "Tour scheduled successfully for 2025-01-15 at 2:00 PM!",
  "tour": { ... }
}
```

### Get Tour by ID
```http
GET /api/tours/:id

Response:
{
  "success": true,
  "tour": {
    "id": "uuid",
    "lead": { ... },
    "property": { ... },
    "scheduledDate": "2025-01-15T14:00:00Z",
    "status": "SCHEDULED"
  }
}
```

### Get Tours for Lead
```http
GET /api/tours/lead/:leadId

Response:
{
  "success": true,
  "tours": [ ... ]
}
```

### Get All Tours (Filtered)
```http
GET /api/tours?propertyId=1&status=SCHEDULED&dateFrom=2025-01-01&limit=50

Response:
{
  "success": true,
  "tours": [ ... ],
  "total": 25
}
```

### Update Tour Status
```http
PATCH /api/tours/:id/status
Content-Type: application/json

{
  "status": "COMPLETED",  // SCHEDULED, CONFIRMED, COMPLETED, CANCELLED, etc.
  "feedback": "Great tour, very interested!"
}

Response:
{
  "success": true,
  "tour": { ... }
}
```

### Assign Tour to Property Manager
```http
PATCH /api/tours/:id/assign
Content-Type: application/json

{
  "userId": 5
}

Response:
{
  "success": true,
  "tour": { ... }
}
```

### Reschedule Tour
```http
PATCH /api/tours/:id/reschedule
Content-Type: application/json

{
  "scheduledDate": "2025-01-20",
  "scheduledTime": "3:00 PM"
}

Response:
{
  "success": true,
  "tour": { ... },
  "message": "Tour rescheduled successfully"
}
```

---

## 📝 Application Management Endpoints

### Submit Application
```http
POST /api/applications/submit
Content-Type: application/json

{
  "leadId": "uuid",
  "propertyId": 1,
  "unitId": 5,
  "firstName": "John",
  "lastName": "Doe",
  "dateOfBirth": "1990-01-15",
  "currentStreet": "456 Oak Ave",
  "currentCity": "Springfield",
  "currentState": "IL",
  "currentZip": "62701",
  "employer": "Tech Corp",
  "position": "Software Engineer",
  "annualIncome": 85000,
  "emergencyName": "Jane Doe",
  "emergencyRelation": "Sister",
  "emergencyPhone": "555-5678",
  "numberOfOccupants": 2,
  "hasPets": true,
  "petDetails": [
    {
      "type": "dog",
      "breed": "Golden Retriever",
      "weight": 65
    }
  ],
  "references": [
    {
      "name": "Previous Landlord",
      "relationship": "landlord",
      "phone": "555-9012"
    }
  ]
}

Response:
{
  "success": true,
  "applicationId": "uuid",
  "message": "Application submitted successfully! We'll review it within 24-48 hours.",
  "application": { ... }
}
```

### Get Application by ID
```http
GET /api/applications/:id

Response:
{
  "success": true,
  "application": { ... }
}
```

### Get Applications for Lead
```http
GET /api/applications/lead/:leadId

Response:
{
  "success": true,
  "applications": [ ... ]
}
```

### Get All Applications (Filtered)
```http
GET /api/applications?propertyId=1&status=SUBMITTED&limit=50

Response:
{
  "success": true,
  "applications": [ ... ],
  "total": 12
}
```

### Update Application Status
```http
PATCH /api/applications/:id/status
Content-Type: application/json

{
  "status": "APPROVED",  // DRAFT, SUBMITTED, UNDER_REVIEW, APPROVED, DENIED, etc.
  "reviewedById": 5,
  "reviewNotes": "Strong candidate, good credit score"
}

Response:
{
  "success": true,
  "application": { ... }
}
```

### Update Screening Results
```http
PATCH /api/applications/:id/screening
Content-Type: application/json

{
  "creditScore": 750,
  "backgroundCheckStatus": "PASSED",
  "creditCheckStatus": "APPROVED"
}

Response:
{
  "success": true,
  "application": { ... }
}
```

### Record Application Fee Payment
```http
POST /api/applications/:id/payment
Content-Type: application/json

{
  "amount": 50.00
}

Response:
{
  "success": true,
  "application": { ... },
  "message": "Payment recorded successfully"
}
```

---

## 🔐 Authentication

Most endpoints (except public search/inquiry) require authentication. Include JWT token in headers:

```http
Authorization: Bearer <your-jwt-token>
```

---

## 📊 Status Enums

### Lead Status
- `NEW` - Initial contact
- `CONTACTED` - Follow-up made
- `QUALIFIED` - Meets basic criteria
- `TOURING` - Scheduled/attended tours
- `APPLYING` - Application in progress
- `APPROVED` - Application approved
- `DENIED` - Application denied
- `CONVERTED` - Became a tenant
- `LOST` - Chose another property
- `ARCHIVED` - Old/inactive lead

### Tour Status
- `SCHEDULED` - Tour booked
- `CONFIRMED` - Tour confirmed with lead
- `IN_PROGRESS` - Currently happening
- `COMPLETED` - Tour finished
- `CANCELLED` - Tour cancelled
- `NO_SHOW` - Lead didn't show up
- `RESCHEDULED` - Moved to different time

### Application Status
- `DRAFT` - Not yet submitted
- `SUBMITTED` - Awaiting review
- `UNDER_REVIEW` - Being reviewed
- `SCREENING_IN_PROGRESS` - Background/credit checks
- `APPROVED` - Application approved
- `CONDITIONALLY_APPROVED` - Approved with conditions
- `DENIED` - Application rejected
- `WITHDRAWN` - Applicant withdrew
- `EXPIRED` - Application expired

### Message Role
- `USER` - Message from prospect
- `ASSISTANT` - Message from AI
- `SYSTEM` - System message

### Interest Level
- `LOW` - Casual interest
- `MEDIUM` - Moderate interest
- `HIGH` - Strong interest

---

## 🧪 Testing Examples

### Test Lead Creation Flow
```bash
# 1. Create a lead
curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test-123","name":"Test User","email":"test@example.com"}'

# 2. Add a message
curl -X POST http://localhost:3001/api/leads/[leadId]/messages \
  -H "Content-Type: application/json" \
  -d '{"role":"USER","content":"Looking for 2BR apartment"}'

# 3. Search properties
curl "http://localhost:3001/api/leads/properties/search?bedrooms=2&maxRent=2000"

# 4. Schedule a tour
curl -X POST http://localhost:3001/api/tours/schedule \
  -H "Content-Type: application/json" \
  -d '{"leadId":"[leadId]","propertyId":1,"preferredDate":"2025-01-15","preferredTime":"2:00 PM"}'
```

---

## 📝 Notes

- All dates should be in ISO 8601 format: `YYYY-MM-DD` or `YYYY-MM-DDTHH:MM:SSZ`
- Currency amounts are in decimal format: `1234.56`
- Phone numbers can be in any format, stored as strings
- Session IDs should be unique per user session
- Property/Unit IDs are integers
- Lead/Tour/Application IDs are UUIDs

---

## 🔗 Frontend Integration

The frontend `LeasingAgentService` already has these endpoints configured:
- Property search: `${API_BASE_URL}/properties/search`
- Tour scheduling: `${API_BASE_URL}/tours/schedule`
- Application submission: `${API_BASE_URL}/applications/submit`
- Lead capture: `${API_BASE_URL}/leads`

Update `API_BASE_URL` in the service to point to `http://localhost:3001/api` for development.

---

**Backend Integration Complete!** 🎉

All endpoints are now live and ready to handle real data from the AI Leasing Agent bot.
