# AI Leasing Agent Bot - Quick Start Guide

## 🚀 Getting Started

### Testing the Leasing Agent (Public Access)

1. **Start the frontend server** (if not already running):
   ```bash
   cd tenant_portal_app
   npm start
   ```

2. **Navigate to the leasing page**:
   - Open your browser: `http://localhost:3000/lease`
   - Or use the alias: `http://localhost:3000/apply`

3. **Interact with the bot**:
   - Click the floating 💬 button in the bottom-right
   - Or click any "Chat with AI Agent" button on the page
   - Start asking questions!

---

## 💬 Sample Conversations

### Example 1: Property Search
```
You: I'm looking for a 2-bedroom apartment under $2000
Bot: [Shows matching properties with details]

You: Do you have parking?
Bot: [Explains parking amenities]

You: I want to see the property on Main Street
Bot: [Offers to schedule a tour]
```

### Example 2: Tour Scheduling
```
You: I want to schedule a tour
Bot: What days and times work best for you?

You: Saturday afternoon
Bot: [Confirms tour and provides details]
```

### Example 3: Application Process
```
You: How do I apply?
Bot: [Explains requirements and process]

You: What documents do I need?
Bot: [Lists required documents]
```

---

## 🎯 Quick Actions Available

The bot provides these quick action buttons:
- **🏠 Browse Properties** - See available units
- **📅 Schedule Tour** - Book a property viewing
- **📝 Apply Now** - Start your application
- **📞 Contact Info** - Get in touch

---

## 🧪 Testing Checklist

### Basic Functionality:
- [ ] Page loads at `/lease`
- [ ] Bot opens when clicking floating button
- [ ] Can send and receive messages
- [ ] Quick action buttons work
- [ ] Bot extracts your information (name, email, phone)
- [ ] Property recommendations appear
- [ ] Tour scheduling flow works
- [ ] Application process explained clearly

### Mobile Testing:
- [ ] Page responsive on mobile
- [ ] Bot usable on small screens
- [ ] Touch interactions work
- [ ] Scrolling smooth

### Edge Cases:
- [ ] Bot handles unclear questions gracefully
- [ ] Works without providing all information
- [ ] Can resume after page refresh (new session)
- [ ] Error handling when API unavailable

---

## 🎨 Customization Options

### Changing Bot Position:
```typescript
<LeasingAgentBot
  position="bottom-left"  // or "center"
  initialOpen={true}      // Start in open state
/>
```

### Custom Session ID:
```typescript
<LeasingAgentBot
  sessionId="custom-session-123"
/>
```

---

## 🐛 Troubleshooting

### Bot not appearing?
- Check browser console for errors
- Verify npm start is running
- Clear browser cache
- Check that the route is correct (`/lease` or `/apply`)

### Bot not responding?
- Check network tab for API calls
- Bot works in demo mode even without backend
- Verify LeasingAgentService is imported correctly

### Properties not showing?
- Mock data should work by default
- Check console for errors in property matching
- Verify search parameters are being extracted

---

## 📊 Demo Data

The system includes mock properties:
1. **Modern Downtown Studio** - $1,200/month
2. **Spacious 2BR with Balcony** - $1,800/month
3. **Luxury 3BR Penthouse** - $2,800/month

These appear when searching for properties in demo mode.

---

## 🔄 Next Steps

### For Full Functionality:
1. Implement backend API endpoints
2. Connect to property database
3. Add email notifications
4. Configure tour scheduling system
5. Integrate application processing

### For Property Managers:
1. Access lead dashboard (future feature)
2. Monitor conversations (future feature)
3. Take over chats when needed (future feature)
4. Review applications (future feature)

---

## 📞 Key Features to Test

### Information Extraction:
Try providing this info naturally in conversation:
- Your name: "I'm John Smith"
- Email: "my email is john@example.com"
- Phone: "you can call me at 555-1234"
- Bedrooms: "I need 2 bedrooms"
- Budget: "my budget is $1800 per month"
- Move-in: "moving in January 15th"
- Pets: "I have a small dog"

The bot should extract and use this information!

### Conversation Flow:
The bot progresses through these stages:
1. **Welcome** - Initial greeting
2. **Qualification** - Gathering requirements
3. **Property Matching** - Showing options
4. **Tour Scheduling** - Booking visits
5. **Application** - Starting the process

### Progress Indicator:
Watch the blue progress bar at the top:
- **Step 1:** Contact Info collected
- **Step 2:** Preferences gathered
- **Step 3:** Lead qualified

---

## 🎓 Tips for Best Results

### Ask Natural Questions:
- ✅ "Do you have any 2-bedroom apartments available?"
- ✅ "What's included in the rent?"
- ✅ "Can I bring my dog?"

### Provide Information Naturally:
- ✅ "I'm looking for a place under $2000"
- ✅ "My name is Sarah and I need to move in next month"
- ✅ "You can email me at sarah@email.com"

### Use Quick Actions:
- Click buttons for common requests
- Faster than typing
- Ensures correct phrasing

---

## 🌟 Current Status

### ✅ Fully Working:
- Public landing page
- AI chatbot conversation
- Lead qualification
- Property matching (demo mode)
- Tour scheduling (demo mode)
- Application guidance
- Mobile responsive design

### ⏳ Needs Backend:
- Real property data
- Actual tour booking
- Application submission
- Lead persistence
- Email notifications
- Property manager dashboard

---

## 📱 Access Points

### Public (No Login):
- `/lease` - Main leasing page
- `/apply` - Same as above
- Bot accessible on these pages

### Future (Property Manager):
- Dashboard integration
- Lead monitoring
- Conversation history
- Application tracking

---

## 🎉 Ready to Test!

Your AI Leasing Agent is now live and ready for testing. Navigate to:

```
http://localhost:3000/lease
```

Click the chat button and start exploring! The bot is intelligent, conversational, and ready to help prospective tenants find their perfect home.

---

**Need Help?** Check the main documentation: `AI_LEASING_AGENT_IMPLEMENTATION.md`
