# Delinquency Priority Config — Admin UI Contract

## Purpose
Enable org admins to configure collection-priority scoring weights used by `/payments/delinquency/queue`.

---

## Endpoints

### 1) Get effective config
**GET** `/payments/delinquency/priority-config`

**Auth / Role**
- `PROPERTY_MANAGER` or `ADMIN`

**Response 200**
```json
{
  "orgId": "org-uuid",
  "daysWeight": 1,
  "amountWeight": 1,
  "source": "env_default"
}
```

`source` values:
- `env_default` → no org override saved
- `org_override` → org-level weights are active

---

### 2) Update org override
**POST** `/payments/delinquency/priority-config`

**Auth / Role**
- `ADMIN` only

**Body**
```json
{
  "daysWeight": 2,
  "amountWeight": 3
}
```

Validation:
- both required
- numeric
- `>= 0`

**Response 201/200**
```json
{
  "orgId": "org-uuid",
  "daysWeight": 2,
  "amountWeight": 3,
  "source": "org_override"
}
```

---

## UI surfaces

### Screen
`Settings > Payments > Delinquency Priority`

### Fields
- **Days Past Due Weight** (number input, step `0.1`, min `0`)
- **Amount Due Weight** (number input, step `0.1`, min `0`)

### Read-only metadata
- **Active Source**: `Default` or `Organization Override`
- **Preview formula**: `(daysPastDue * daysWeight) * (amountDueCents * amountWeight)`

---

## UX states

### Load state
- skeleton placeholders for two inputs + source badge

### Success state
- toast: `Delinquency priority settings updated.`
- keep updated values in form

### Error states
- 400: inline field validation message
- 403: show `Only admins can update these settings.` and disable Save
- 401: redirect/login flow
- 5xx/network: non-blocking banner + retry button

---

## Suggested frontend behavior

1. On page load: call GET endpoint.
2. Populate form with effective values.
3. If user role != ADMIN:
   - render fields read-only
   - hide Save button
4. On Save:
   - client-validate numeric + min 0
   - POST payload
   - refresh view from response

---

## Example queue query using updated config
`GET /payments/delinquency/queue?sortBy=priorityScore&sortOrder=desc&limit=100`

UI should display:
- item-level `priorityScore`
- response-level `priorityWeights` to confirm active scoring policy.
