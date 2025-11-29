# Backend Connection Test for AI Leasing Agent

## Quick Test Script

Run this in your browser console (F12) on the `/lease` page after opening the chat bot:

```javascript
// Test 1: Check if backend is running
fetch('http://localhost:3001/api/leads/stats/dashboard')
  .then(res => res.json())
  .then(data => console.log('✅ Backend connected:', data))
  .catch(err => console.error('❌ Backend not available:', err));

// Test 2: Create a test lead
const testLead = {
  sessionId: 'test-' + Date.now(),
  name: 'Test User',
  email: 'test@example.com',
  phone: '555-1234',
  bedrooms: 2,
  budget: 1800,
  status: 'NEW',
  source: 'website'
};

fetch('http://localhost:3001/api/leads', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(testLead)
})
  .then(res => res.json())
  .then(data => console.log('✅ Lead created:', data))
  .catch(err => console.error('❌ Failed to create lead:', err));

// Test 3: Search properties
fetch('http://localhost:3001/api/leads/properties/search?bedrooms=2&maxRent=2000')
  .then(res => res.json())
  .then(data => console.log('✅ Properties found:', data))
  .catch(err => console.error('❌ Property search failed:', err));
```

## Expected Results

### If Backend is Running:
```
✅ Backend connected: { total: 0, new: 0, qualified: 0, ... }
✅ Lead created: { id: "...", sessionId: "...", ... }
✅ Properties found: [ {...}, {...} ] or []
```

### If Backend is NOT Running:
```
❌ Backend not available: Failed to fetch
❌ Failed to create lead: Failed to fetch
❌ Property search failed: Failed to fetch
```

## Conversation Flow Test

1. **Open Chat Bot**
   - Go to http://localhost:3000/lease
   - Click floating chat button
   - Check console for "Initializing leasing agent conversation..."

2. **Send First Message**
   - Type: "Hi, I'm John Smith"
   - Press Enter
   - Check console for:
     - "Sending message: Hi, I'm John Smith"
     - "Calling leasingAgentService.sendMessage..."
     - "Extracted name: John Smith"
     - "Lead saved to backend with ID: ..." (if backend connected)
     - "user message saved to backend" (if backend connected)
     - "assistant message saved to backend" (if backend connected)

3. **Provide Full Info**
   - Type: "Looking for a 2 bedroom apartment, budget $1800, email: john@example.com, phone: 555-1234"
   - Check console for all extractions
   - Check console for backend save confirmations

4. **Verify in Backend**
   - If backend is connected, check database:
   ```sql
   SELECT * FROM "Lead" ORDER BY "createdAt" DESC LIMIT 5;
   SELECT * FROM "LeadMessage" ORDER BY "createdAt" DESC LIMIT 10;
   ```

## Backend Status Indicators

### Console Logs You Should See:

**When Backend IS Connected:**
```
Initializing leasing agent conversation...
Welcome message received: {role: 'assistant', ...}
Sending message: Hi, I'm John Smith
Calling leasingAgentService.sendMessage...
Extracted name: John Smith
Current lead info: {name: 'John Smith', ...}
Response received: {...}
Lead info updated: {...}
Lead saved to backend with ID: clxy...
USER message saved to backend
ASSISTANT message saved to backend
```

**When Backend is NOT Connected:**
```
Initializing leasing agent conversation...
Welcome message received: {role: 'assistant', ...}
Sending message: Hi, I'm John Smith
Calling leasingAgentService.sendMessage...
Extracted name: John Smith
Current lead info: {name: 'John Smith', ...}
Response received: {...}
Lead info updated: {...}
Error saving to backend: Failed to fetch
```

## Troubleshooting

### Backend Not Running?

**Start Backend:**
```bash
cd tenant_portal_backend
npm start
```

**Check if Backend Starts:**
- Should see: "Nest application successfully started"
- Should be listening on: http://localhost:3001

### Database Not Connected?

**Check Prisma:**
```bash
cd tenant_portal_backend
npx prisma studio
```

Opens Prisma Studio at http://localhost:5555 to view database

### CORS Issues?

**Verify backend has CORS enabled** in `src/index.ts`:
```typescript
app.enableCors();
```

## Success Criteria

✅ **Frontend to Backend Connection Working When:**
1. No CORS errors in console
2. Console logs show "Lead saved to backend with ID: ..."
3. Console logs show "message saved to backend"
4. Can see leads in Prisma Studio
5. Property Manager dashboard shows new leads

❌ **Not Working If:**
1. Console shows "Error saving to backend: Failed to fetch"
2. Console shows CORS errors
3. No data in database
4. Property Manager dashboard shows empty/mock data only

## Manual Verification Steps

### Step 1: Start Both Servers
```bash
# Terminal 1 - Backend
cd tenant_portal_backend
npm start

# Terminal 2 - Frontend
cd tenant_portal_app
npm start
```

### Step 2: Test Conversation
1. Navigate to http://localhost:3000/lease
2. Open browser console (F12)
3. Open chat bot
4. Send message: "Hi, I'm Test User, email: test@example.com, looking for 2 bedroom, budget $1800"
5. Watch console logs

### Step 3: Check Backend
1. Open new terminal
2. Check backend logs for POST requests:
   - `POST /api/leads` - Lead creation
   - `POST /api/leads/:id/messages` - Message saves

### Step 4: Verify Database
1. Open Prisma Studio: `npx prisma studio`
2. Go to `Lead` table
3. Should see new lead with:
   - sessionId
   - name: "Test User"
   - email: "test@example.com"
   - bedrooms: 2
   - budget: 1800
4. Go to `LeadMessage` table
5. Should see messages for that lead

### Step 5: Check Property Manager Dashboard
1. Login as Property Manager
2. Navigate to http://localhost:3000/lead-management
3. Should see new lead in table
4. Click on lead
5. Click "View Conversation"
6. Should see full chat history

## Connection Status Summary

| Component | Check | Expected Result |
|-----------|-------|----------------|
| Backend Server | http://localhost:3001 | 404 page (shows it's running) |
| Backend API | http://localhost:3001/api/leads/stats/dashboard | JSON stats object |
| Frontend | http://localhost:3000/lease | Landing page loads |
| Chat Bot | Click button | Opens with welcome message |
| Message Send | Type & send | Console shows extraction logs |
| Backend Save | After message | Console shows "saved to backend" |
| Database | Prisma Studio | Shows new Lead & LeadMessage records |
| PM Dashboard | /lead-management | Shows new leads |

## Next Steps After Connection Verified

1. ✅ Remove mock data fallbacks (optional - currently it gracefully degrades)
2. ✅ Add real property data to database
3. ✅ Test tour scheduling flow
4. ✅ Test application submission flow
5. ✅ Add email notifications
6. ✅ Deploy to staging environment

---

**Current Status:**
- Frontend: ✅ Ready
- Backend: ✅ APIs ready (23 endpoints)
- Database: ✅ Schema migrated
- Connection: 🔄 To be tested

**Test Date:** __________
**Tested By:** __________
**Result:** ☐ Connected ☐ Issues Found
