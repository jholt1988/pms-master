# AI Leasing Agent - End-to-End Testing Guide

## Prerequisites
- ✅ Frontend running: `npm start` in `tenant_portal_app`
- ✅ Backend running: `npm start` in `tenant_portal_backend`
- ✅ Database migrated: Prisma schema with Lead models

---

## Test 1: Prospect Lead Qualification Flow

### Objective
Verify that a prospective tenant can interact with the bot and provide all necessary information.

### Steps

1. **Access Public Landing Page**
   - Navigate to: http://localhost:3000/lease
   - Verify page loads with hero section, features, and property showcase
   - ✅ Check: Floating chat button appears in bottom-right corner

2. **Open Chat Bot**
   - Click the blue floating chat button
   - ✅ Check: Chat window opens with welcome message
   - ✅ Check: Welcome message mentions "AI Leasing Agent"
   - ✅ Check: Quick action buttons appear (Browse, Tour, Apply, Contact)

3. **Introduce Yourself**
   - Type: "Hi, I'm John Smith"
   - Press Enter or click Send
   - ✅ Check: User message appears on right (blue bubble)
   - ✅ Check: Bot responds asking for more details
   - ✅ Check: Console logs show "Extracted name: John Smith"

4. **Provide Contact Information**
   - Type: "My email is john.smith@example.com and phone is 555-123-4567"
   - ✅ Check: Console logs show extracted email and phone
   - ✅ Check: Bot acknowledges and asks about requirements

5. **State Property Requirements**
   - Type: "Looking for a 2 bedroom apartment with parking"
   - ✅ Check: Console logs show "Extracted bedrooms: 2"
   - ✅ Check: Console logs show "Extracted preference: parking"
   - ✅ Check: Bot asks about budget

6. **Provide Budget**
   - Type: "My budget is $1800 per month"
   - ✅ Check: Console logs show "Extracted budget: 1800"
   - ✅ Check: Bot acknowledges and may offer to search

7. **Specify Move-in Date**
   - Type: "Need to move in by January 15th"
   - ✅ Check: Console logs show extracted move-in date
   - ✅ Check: Bot confirms timeline

8. **Mention Pets**
   - Type: "I have a dog"
   - ✅ Check: Console logs show "Extracted pet preference: Yes"
   - ✅ Check: Bot asks if pet-friendly is required

9. **Request Property Search**
   - Type: "Show me available properties"
   - ✅ Check: Bot searches for matching properties
   - ✅ Check: Property results shown with details (or mock data if backend not connected)

10. **Schedule Tour**
    - Type: "I'd like to schedule a tour for the first property"
    - ✅ Check: Bot responds with tour scheduling information
    - ✅ Check: Bot asks for preferred date/time

11. **Verify Lead Info**
    - Open browser console (F12)
    - Look for "Current lead info:" log
    - ✅ Check: All information captured correctly:
      - Name: John Smith
      - Email: john.smith@example.com
      - Phone: 555-123-4567
      - Bedrooms: 2
      - Budget: 1800
      - Move-in Date: January 15th
      - Pet Friendly: true
      - Preferences: ['parking']

---

## Test 2: Quick Actions Flow

### Objective
Test the quick action buttons for streamlined interactions.

### Steps

1. **Open Bot Fresh**
   - Refresh page and open bot
   - ✅ Check: Welcome message and 4 quick action buttons appear

2. **Click "Browse Properties"**
   - Click the "Browse Properties" button
   - ✅ Check: Message sent automatically
   - ✅ Check: Bot responds with property browsing information

3. **Click "Schedule Tour"**
   - Click "Schedule Tour" button
   - ✅ Check: Bot responds with tour scheduling process

4. **Click "Apply Now"**
   - Click "Apply Now" button
   - ✅ Check: Bot provides application instructions

5. **Click "Contact Info"**
   - Click "Contact Info" button
   - ✅ Check: Bot asks for contact details

---

## Test 3: Property Manager Dashboard

### Objective
Verify property managers can view and manage leads.

### Steps

1. **Login as Property Manager**
   - Navigate to: http://localhost:3000/login
   - Login with property manager credentials
   - ✅ Check: Redirected to Property Manager Dashboard

2. **Access Lead Management**
   - Click "Lead Management" button (green) in Quick Actions
   - OR navigate to: http://localhost:3000/lead-management
   - ✅ Check: Lead Management page loads

3. **View Dashboard Stats**
   - ✅ Check: Four stat cards display:
     - Total Leads
     - New Leads
     - Qualified Leads
     - Conversion Rate
   - ✅ Check: Numbers are visible (mock data if backend not connected)

4. **Browse Lead List**
   - ✅ Check: Table shows leads with columns:
     - Lead (name/avatar)
     - Details (bedrooms/budget)
     - Status (colored badge)
     - Activity (message/tour/app counts)
     - Actions (eye icon)

5. **Search Leads**
   - Type a name in search box
   - ✅ Check: Table filters in real-time

6. **Filter by Status**
   - Select "QUALIFIED" from status dropdown
   - ✅ Check: Only qualified leads shown

7. **Select a Lead**
   - Click on any lead row
   - ✅ Check: Right sidebar shows lead details:
     - Avatar and name
     - Created date
     - Status dropdown
     - Contact info (email/phone)
     - Preferences (bedrooms, budget, move-in)
     - Amenities tags
     - Action buttons

8. **Update Lead Status**
   - Change status dropdown from "NEW" to "CONTACTED"
   - ✅ Check: Status updates (API call made if backend connected)
   - ✅ Check: Stats refresh

9. **View Conversation**
   - Click "View Conversation" button
   - ✅ Check: Modal opens with full chat transcript
   - ✅ Check: Messages color-coded (blue = user, gray = bot)
   - ✅ Check: Timestamps visible
   - ✅ Check: Download button present

10. **Take Over Conversation**
    - In conversation modal, type a message in input field
    - ✅ Check: Input field accepts text
    - ✅ Check: Send button present
    - Note: "This allows PM to respond manually"

11. **Contact Lead**
    - Click "Send Email" button
    - ✅ Check: Button triggers email action (or shows alert if not implemented)
    - Click "Call Lead" button
    - ✅ Check: Button triggers call action

---

## Test 4: Information Extraction Accuracy

### Objective
Verify the bot accurately extracts various information formats.

### Test Cases

| Input | Expected Extraction | Verify |
|-------|-------------------|--------|
| "I'm Sarah Johnson" | Name: Sarah Johnson | ✅ |
| "My name is Mike Chen" | Name: Mike Chen | ✅ |
| "Email: test@example.com" | Email: test@example.com | ✅ |
| "Call me at 555-9876" | Phone: 555-9876 | ✅ |
| "Phone: (555) 123-4567" | Phone: (555) 123-4567 | ✅ |
| "2 bedroom apartment" | Bedrooms: 2 | ✅ |
| "3br needed" | Bedrooms: 3 | ✅ |
| "Studio apartment" | Bedrooms: 0 | ✅ |
| "$1500 per month" | Budget: 1500 | ✅ |
| "Budget is $2,000/mo" | Budget: 2000 | ✅ |
| "Can afford 1800" | Budget: 1800 | ✅ |
| "Under $2000" | Budget: 2000 | ✅ |
| "December 1st" | Move-in: December 1st | ✅ |
| "ASAP" | Move-in: ASAP | ✅ |
| "I have a dog" | Pet Friendly: true | ✅ |
| "No pets" | Pet Friendly: false | ✅ |
| "Need parking" | Preferences: ['parking'] | ✅ |
| "Gym and pool" | Preferences: ['gym', 'pool'] | ✅ |
| "Washer/dryer in unit" | Preferences: ['laundry'] | ✅ |

### Steps
1. Start fresh conversation for each test case
2. Send the input message
3. Check browser console for extraction logs
4. Verify extracted values match expected

---

## Test 5: Backend Integration (API Endpoints)

### Objective
Test backend API endpoints are working correctly.

### Prerequisites
- Backend server running
- Database connected
- Prisma client generated

### API Tests (Using curl or Postman)

#### 1. Create/Update Lead
```bash
curl -X POST http://localhost:3001/api/leads \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-123",
    "name": "Test User",
    "email": "test@example.com",
    "phone": "555-1234",
    "bedrooms": 2,
    "budget": 1800
  }'
```
✅ Check: Returns lead object with ID

#### 2. Get Lead by Session
```bash
curl http://localhost:3001/api/leads/session/test-session-123
```
✅ Check: Returns lead with all data

#### 3. Search Properties
```bash
curl "http://localhost:3001/api/leads/properties/search?bedrooms=2&maxRent=2000"
```
✅ Check: Returns array of matching properties

#### 4. Add Message
```bash
curl -X POST http://localhost:3001/api/leads/{leadId}/messages \
  -H "Content-Type: application/json" \
  -d '{
    "role": "USER",
    "content": "Hello, I need an apartment"
  }'
```
✅ Check: Message saved, returns message object

#### 5. Get Conversation History
```bash
curl http://localhost:3001/api/leads/{leadId}/messages
```
✅ Check: Returns array of messages in order

#### 6. Schedule Tour
```bash
curl -X POST http://localhost:3001/api/tours/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "{leadId}",
    "propertyId": "{propertyId}",
    "preferredDate": "2025-12-01",
    "preferredTime": "14:00"
  }'
```
✅ Check: Tour created successfully

#### 7. Get Dashboard Stats
```bash
curl http://localhost:3001/api/leads/stats/dashboard
```
✅ Check: Returns stats object with totals and conversion rate

---

## Test 6: Error Handling

### Objective
Verify graceful error handling.

### Tests

1. **Empty Message**
   - Send empty message
   - ✅ Check: No crash, bot responds or ignores

2. **Special Characters**
   - Type: "Looking @#$%^&*()"
   - ✅ Check: Bot handles gracefully

3. **Very Long Message**
   - Type 1000+ character message
   - ✅ Check: Bot processes without crashing

4. **Rapid Messages**
   - Send 5 messages quickly
   - ✅ Check: All processed in order

5. **Backend Down**
   - Stop backend server
   - Send message
   - ✅ Check: Falls back to mock data
   - ✅ Check: User sees error message or mock response

6. **Invalid Data**
   - Type: "Budget is $5" (unrealistic)
   - ✅ Check: Not extracted as budget

---

## Test 7: Mobile Responsiveness

### Objective
Verify bot works on mobile devices.

### Steps

1. **Open Developer Tools**
   - Press F12
   - Click device toolbar (or Ctrl+Shift+M)
   - Select iPhone or Android device

2. **Test Landing Page**
   - ✅ Check: Layout adjusts for mobile
   - ✅ Check: Floating button accessible
   - ✅ Check: All sections readable

3. **Test Chat Bot**
   - Open chat
   - ✅ Check: Bot fills appropriate space
   - ✅ Check: Input field accessible
   - ✅ Check: Messages readable
   - ✅ Check: Quick actions stack properly
   - ✅ Check: Minimize/maximize works

4. **Test Dashboard**
   - Login as PM on mobile
   - ✅ Check: Stats cards stack vertically
   - ✅ Check: Table is scrollable
   - ✅ Check: Lead details panel works

---

## Test 8: Complete User Journey

### Scenario: Sarah is looking for an apartment

1. **Discovery** (2 mins)
   - Sarah googles "apartments for rent"
   - Finds your property website
   - Clicks "Find Your Home" button
   - Lands on /lease page

2. **Initial Contact** (3 mins)
   - Sees AI assistant offer
   - Clicks floating chat button
   - Introduces herself: "Hi, I'm Sarah Johnson"
   - Provides email: sarah.j@example.com
   - Provides phone: 555-8765

3. **Requirements** (5 mins)
   - States needs: "2 bedroom, pet-friendly"
   - Mentions: "Have a small dog"
   - Budget: "$1800 per month"
   - Move-in: "Need to move by January 1st"
   - Amenities: "Would love in-unit laundry and parking"

4. **Property Search** (3 mins)
   - Asks: "Show me what you have available"
   - Reviews property suggestions
   - Likes Property A

5. **Tour Scheduling** (2 mins)
   - Says: "I'd like to tour Property A"
   - Provides availability: "This Saturday morning"
   - Confirms tour: "Saturday at 10am works great"

6. **Application Intent** (2 mins)
   - Asks: "What's the application process?"
   - Reviews requirements
   - Says: "I'd like to start the application"

7. **Property Manager View** (PM side)
   - PM logs into dashboard
   - Sees new lead "Sarah Johnson - QUALIFIED"
   - Opens lead details
   - Reviews conversation history
   - Sees tour scheduled for Saturday 10am
   - Updates status to "TOURING"
   - Sends email: "Looking forward to showing you Property A!"

**Total Time: ~17 minutes from discovery to scheduled tour**

✅ Verify each step completes successfully
✅ Verify no errors in console
✅ Verify all data captured correctly

---

## Success Criteria

### Frontend
- ✅ Chat widget loads and opens
- ✅ Messages send and display correctly
- ✅ Information extraction works (check console)
- ✅ Quick actions trigger appropriate flows
- ✅ Lead progress indicator updates
- ✅ No JavaScript errors in console

### Backend (if connected)
- ✅ All 23 API endpoints respond
- ✅ Leads save to database
- ✅ Messages persist
- ✅ Status updates work
- ✅ Search returns results

### Property Manager Dashboard
- ✅ Stats display correctly
- ✅ Lead list populates
- ✅ Search and filters work
- ✅ Lead details show
- ✅ Conversation modal works
- ✅ Status updates persist

### User Experience
- ✅ Responses feel natural and helpful
- ✅ Information extraction is accurate
- ✅ Loading states show appropriately
- ✅ Error handling is graceful
- ✅ Mobile experience is usable

---

## Known Issues / Future Enhancements

### Current Limitations
- Backend integration uses mock data fallback
- Property search needs real estate data
- Tour scheduling needs calendar integration
- Application submission needs form integration
- Email/SMS notifications not implemented

### Enhancement Opportunities
- Add ML-powered rent pricing
- Integrate with Rentcast for market data
- Add property photos to search results
- Implement video tours
- Add payment processing for application fees
- SMS notifications for tour reminders
- Email templates for automated follow-ups

---

## Automated Test Execution

### Run Jest Tests
```bash
cd tenant_portal_app
npm test -- LeasingAgentService.test.ts
```

### Expected Results
- All test suites pass
- Information extraction tests: 100% pass
- Conversation flow tests: 100% pass
- State management tests: 100% pass
- Edge case tests: 100% pass

---

## Test Report Template

```
Test Date: __________
Tester: __________
Environment: Local / Staging / Production

| Test # | Test Name | Status | Notes |
|--------|-----------|--------|-------|
| 1 | Lead Qualification Flow | ☐ Pass ☐ Fail | |
| 2 | Quick Actions | ☐ Pass ☐ Fail | |
| 3 | PM Dashboard | ☐ Pass ☐ Fail | |
| 4 | Information Extraction | ☐ Pass ☐ Fail | |
| 5 | Backend Integration | ☐ Pass ☐ Fail | |
| 6 | Error Handling | ☐ Pass ☐ Fail | |
| 7 | Mobile Responsive | ☐ Pass ☐ Fail | |
| 8 | Complete Journey | ☐ Pass ☐ Fail | |

Issues Found:
1. __________________________________________________
2. __________________________________________________
3. __________________________________________________

Overall Status: ☐ Ready for Production ☐ Needs Work
```

---

**Next Steps After Testing:**
1. Document any bugs found
2. Fix critical issues
3. Connect to real backend (remove mock data fallback)
4. Add property data to database
5. Test with real users
6. Deploy to staging environment
