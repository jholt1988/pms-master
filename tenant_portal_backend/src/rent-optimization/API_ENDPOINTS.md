# Rent Recommendations API Endpoints

Complete API reference for the rent recommendations microservice.

## Authentication

All endpoints require JWT authentication and PROPERTY_MANAGER role.

**Headers:**
```
Authorization: Bearer <jwt_token>
```

---

## Endpoints

### 1. Get All Recommendations

Get all rent recommendations with full details.

**GET** `/api/rent-recommendations`

**Response:**
```json
[
  {
    "id": "uuid",
    "unitId": 1,
    "currentRent": 1500,
    "recommendedRent": 1650,
    "confidenceIntervalLow": 1600,
    "confidenceIntervalHigh": 1700,
    "confidenceScore": 0.85,
    "status": "PENDING",
    "generatedAt": "2025-11-06T10:00:00Z",
    "unit": { ... },
    "factors": [ ... ],
    "marketComparables": [ ... ],
    "reasoning": "...",
    "modelVersion": "1.0.0"
  }
]
```

---

### 2. Get Statistics

Get aggregated statistics about all recommendations.

**GET** `/api/rent-recommendations/stats`

**Response:**
```json
{
  "total": 45,
  "pending": 15,
  "accepted": 25,
  "rejected": 5,
  "avgConfidence": 0.87,
  "avgIncrease": 8.5,
  "totalPotentialIncrease": 12500.00
}
```

**Fields:**
- `total` - Total number of recommendations
- `pending` - Recommendations awaiting review
- `accepted` - Accepted recommendations
- `rejected` - Rejected recommendations
- `avgConfidence` - Average confidence score (0-1)
- `avgIncrease` - Average rent increase percentage
- `totalPotentialIncrease` - Total potential revenue increase ($)

---

### 3. Get Recent Recommendations

Get the N most recent recommendations.

**GET** `/api/rent-recommendations/recent?limit=10`

**Query Parameters:**
- `limit` (optional) - Number of recommendations to return (default: 10)

**Response:**
```json
[
  {
    "id": "uuid",
    "unitId": 1,
    "recommendedRent": 1650,
    "generatedAt": "2025-11-06T10:00:00Z",
    ...
  }
]
```

---

### 4. Get Pending Recommendations

Get all recommendations with PENDING status.

**GET** `/api/rent-recommendations/pending`

**Response:** Same as "Get All Recommendations" but filtered to PENDING status.

---

### 5. Get Accepted Recommendations

Get all recommendations with ACCEPTED status.

**GET** `/api/rent-recommendations/accepted`

**Response:** Same as "Get All Recommendations" but filtered to ACCEPTED status.

---

### 6. Get Rejected Recommendations

Get all recommendations with REJECTED status.

**GET** `/api/rent-recommendations/rejected`

**Response:** Same as "Get All Recommendations" but filtered to REJECTED status.

---

### 7. Get Recommendations by Property

Get all recommendations for units in a specific property.

**GET** `/api/rent-recommendations/property/:propertyId`

**Parameters:**
- `propertyId` - Property ID (number)

**Example:** `/api/rent-recommendations/property/1`

**Response:** Array of recommendations for all units in the property.

---

### 8. Get Comparison

Get detailed comparison of current vs recommended rent with historical data.

**GET** `/api/rent-recommendations/comparison/:unitId`

**Parameters:**
- `unitId` - Unit ID (number)

**Example:** `/api/rent-recommendations/comparison/1`

**Response:**
```json
{
  "unit": {
    "id": 1,
    "unitNumber": "101",
    "bedrooms": 2,
    "bathrooms": 2,
    "squareFeet": 1000,
    "property": {
      "id": 1,
      "name": "Sunset Apartments",
      "address": "123 Main St",
      "city": "Austin",
      "state": "TX"
    }
  },
  "currentRent": 1500,
  "latestRecommendation": {
    "recommendedRent": 1650,
    "difference": 150,
    "percentageChange": 10.0,
    "confidenceScore": 0.85,
    "generatedAt": "2025-11-06T10:00:00Z",
    "status": "PENDING"
  },
  "rentHistory": [
    {
      "startDate": "2024-01-01",
      "endDate": "2024-12-31",
      "rent": 1500
    },
    {
      "startDate": "2023-01-01",
      "endDate": "2023-12-31",
      "rent": 1400
    }
  ],
  "recommendationHistory": [
    {
      "generatedAt": "2025-11-06T10:00:00Z",
      "currentRent": 1500,
      "recommendedRent": 1650,
      "status": "PENDING",
      "confidenceScore": 0.85
    }
  ]
}
```

---

### 9. Get Recommendation by Unit

Get the most recent recommendation for a specific unit.

**GET** `/api/rent-recommendations/unit/:unitId`

**Parameters:**
- `unitId` - Unit ID (number)

**Example:** `/api/rent-recommendations/unit/1`

**Response:** Single recommendation object or empty array if none found.

---

### 10. Get Single Recommendation

Get a specific recommendation by ID.

**GET** `/api/rent-recommendations/:id`

**Parameters:**
- `id` - Recommendation UUID

**Example:** `/api/rent-recommendations/550e8400-e29b-41d4-a716-446655440000`

**Response:** Single recommendation object with full details.

---

### 11. Generate Recommendations

Generate new rent recommendations for specified units.

**POST** `/api/rent-recommendations/generate`

**Request Body:**
```json
{
  "unitIds": [1, 2, 3]
}
```

**Response:**
```json
[
  {
    "id": "uuid",
    "unitId": 1,
    "recommendedRent": 1650,
    "status": "PENDING",
    ...
  },
  {
    "id": "uuid",
    "unitId": 2,
    "recommendedRent": 1800,
    "status": "PENDING",
    ...
  }
]
```

**Note:** Calls the ML service if `USE_ML_SERVICE=true`, otherwise uses mock data.

---

### 12. Bulk Generate by Property

Generate recommendations for all units in a property.

**POST** `/api/rent-recommendations/bulk-generate/property/:propertyId`

**Parameters:**
- `propertyId` - Property ID (number)

**Example:** `/api/rent-recommendations/bulk-generate/property/1`

**Response:** Array of generated recommendations for all units in the property.

---

### 13. Bulk Generate All

Generate recommendations for ALL units in the system.

**POST** `/api/rent-recommendations/bulk-generate/all`

**⚠️ Warning:** This can be a long-running operation if you have many units.

**Response:** Array of generated recommendations for all units.

---

### 14. Accept Recommendation

Accept a recommendation and mark it as approved.

**POST** `/api/rent-recommendations/:id/accept`

**Parameters:**
- `id` - Recommendation UUID

**Example:** `/api/rent-recommendations/550e8400-e29b-41d4-a716-446655440000/accept`

**Response:**
```json
{
  "id": "uuid",
  "status": "ACCEPTED",
  "acceptedAt": "2025-11-06T11:00:00Z",
  "acceptedBy": {
    "id": 1,
    "username": "admin_pm"
  },
  ...
}
```

**Business Logic:**
- Only PENDING recommendations can be accepted
- Records who accepted it and when
- Prevents re-acceptance of already processed recommendations

---

### 15. Reject Recommendation

Reject a recommendation.

**POST** `/api/rent-recommendations/:id/reject`

**Parameters:**
- `id` - Recommendation UUID

**Example:** `/api/rent-recommendations/550e8400-e29b-41d4-a716-446655440000/reject`

**Response:**
```json
{
  "id": "uuid",
  "status": "REJECTED",
  "rejectedAt": "2025-11-06T11:00:00Z",
  "rejectedBy": {
    "id": 1,
    "username": "admin_pm"
  },
  ...
}
```

**Business Logic:**
- Only PENDING recommendations can be rejected
- Records who rejected it and when

---

### 16. Apply Recommendation

Apply an accepted recommendation by updating the actual lease rent.

**POST** `/api/rent-recommendations/:id/apply`

**Parameters:**
- `id` - Recommendation UUID

**Example:** `/api/rent-recommendations/550e8400-e29b-41d4-a716-446655440000/apply`

**Response:**
```json
{
  "success": true,
  "message": "Recommendation applied successfully",
  "previousRent": 1500,
  "newRent": 1650,
  "difference": 150,
  "leaseId": 5,
  "unitId": 1
}
```

**Business Logic:**
- Only ACCEPTED recommendations can be applied
- Updates the current lease's rentAmount
- Requires an active lease
- Permanent action - updates actual rent in system

**⚠️ Important:** This is a critical operation that changes actual rent data. Ensure the recommendation is correct before applying.

---

### 17. Update Recommendation

Manually update the recommended rent for a pending recommendation.

**PUT** `/api/rent-recommendations/:id/update`

**Parameters:**
- `id` - Recommendation UUID

**Request Body:**
```json
{
  "recommendedRent": 1700,
  "reasoning": "Adjusted based on local market manager input"
}
```

**Fields:**
- `recommendedRent` (required) - New recommended rent amount
- `reasoning` (optional) - Updated reasoning text

**Response:**
```json
{
  "id": "uuid",
  "recommendedRent": 1700,
  "confidenceIntervalLow": 1649,
  "confidenceIntervalHigh": 1751,
  "reasoning": "Adjusted based on local market manager input",
  ...
}
```

**Business Logic:**
- Only PENDING recommendations can be updated
- Automatically recalculates confidence intervals (±3%)
- Rent must be > 0

---

### 18. Delete Recommendation

Delete a recommendation.

**DELETE** `/api/rent-recommendations/:id`

**Parameters:**
- `id` - Recommendation UUID

**Example:** `/api/rent-recommendations/550e8400-e29b-41d4-a716-446655440000`

**Response:**
```json
{
  "success": true,
  "message": "Recommendation deleted successfully",
  "deletedId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Business Logic:**
- Cannot delete ACCEPTED recommendations
- Can delete PENDING or REJECTED recommendations
- Permanent action - cannot be undone

---

## Status Flow

```
PENDING → ACCEPTED → (optional) Apply to Lease
   ↓
REJECTED
```

**States:**
- `PENDING` - Awaiting review
- `ACCEPTED` - Approved by property manager
- `REJECTED` - Rejected by property manager

---

## Error Responses

All endpoints return standard error responses:

**400 Bad Request:**
```json
{
  "statusCode": 400,
  "message": "Only pending recommendations can be updated",
  "error": "Bad Request"
}
```

**404 Not Found:**
```json
{
  "statusCode": 404,
  "message": "Recommendation with ID {id} not found",
  "error": "Not Found"
}
```

**401 Unauthorized:**
```json
{
  "statusCode": 401,
  "message": "Unauthorized"
}
```

**403 Forbidden:**
```json
{
  "statusCode": 403,
  "message": "Forbidden resource",
  "error": "Forbidden"
}
```

---

## Usage Examples

### Complete Workflow Example

```bash
# 1. Generate recommendations for units 1, 2, 3
curl -X POST http://localhost:3001/api/rent-recommendations/generate \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"unitIds": [1, 2, 3]}'

# 2. Get statistics
curl -X GET http://localhost:3001/api/rent-recommendations/stats \
  -H "Authorization: Bearer ${TOKEN}"

# 3. Get pending recommendations
curl -X GET http://localhost:3001/api/rent-recommendations/pending \
  -H "Authorization: Bearer ${TOKEN}"

# 4. Get comparison for unit 1
curl -X GET http://localhost:3001/api/rent-recommendations/comparison/1 \
  -H "Authorization: Bearer ${TOKEN}"

# 5. Update recommendation (manual adjustment)
curl -X PUT http://localhost:3001/api/rent-recommendations/{id}/update \
  -H "Authorization: Bearer ${TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"recommendedRent": 1700, "reasoning": "Local market insights"}'

# 6. Accept recommendation
curl -X POST http://localhost:3001/api/rent-recommendations/{id}/accept \
  -H "Authorization: Bearer ${TOKEN}"

# 7. Apply to lease (update actual rent)
curl -X POST http://localhost:3001/api/rent-recommendations/{id}/apply \
  -H "Authorization: Bearer ${TOKEN}"
```

---

## Integration with ML Service

When `USE_ML_SERVICE=true` in `.env`, the `/generate` endpoints call the Python ML microservice:

**ML Service Flow:**
1. Backend fetches unit data from database
2. Transforms to ML request format
3. Calls `POST http://localhost:8000/predict`
4. ML service returns prediction with confidence, factors, comparables
5. Backend saves recommendation to database

**Fallback:** If ML service is unavailable, uses mock data generation.

---

## Frontend Integration

Example React hook usage:

```typescript
import { RentOptimizationService } from '@/domains/shared/ai-services/rent-optimization/RentOptimizationService';

// Get statistics
const stats = await RentOptimizationService.getStats();

// Generate recommendations
const recommendations = await RentOptimizationService.generateRecommendations([1, 2, 3]);

// Accept recommendation
await RentOptimizationService.acceptRecommendation(recommendationId);

// Apply to lease
await RentOptimizationService.applyRecommendation(recommendationId);
```

---

## Rate Limiting

Currently no rate limiting implemented. Consider adding for production:
- 100 requests per minute per user
- 10 bulk operations per hour
- Exponential backoff for ML service calls

---

## Monitoring

Key metrics to track:
- Average confidence score
- Acceptance rate (accepted / total generated)
- Average rent increase recommended
- ML service response time
- Error rate by endpoint

---

## Future Enhancements

Potential additions:
- `GET /rent-recommendations/export` - Export to CSV/Excel
- `POST /rent-recommendations/:id/schedule` - Schedule future application
- `GET /rent-recommendations/analytics` - Advanced analytics dashboard
- `POST /rent-recommendations/bulk-accept` - Accept multiple at once
- WebSocket support for real-time updates
- Batch processing queue for large properties
