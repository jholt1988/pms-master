# PMS Mobile Portals

Modern, mobile-first web portals for the Property Management Suite. Built with SuperDesign principles using prompt engineering best practices.

## 🎨 Design System

### Color Palette
- **Primary:** Deep Navy (`#1e293b`) — Professional, trustworthy
- **Accent:** Coral Orange (`#f97316`) — Calls to action, AI features
- **Surface:** Pure white cards on off-white background
- **Semantic Colors:** Green (success), Amber (warning), Red (urgent), Blue (info)

### Typography
- **Font Family:** Inter (Google Fonts)
- **Weights:** 400 Regular, 500 Medium, 600 Semibold, 700 Bold
- **Hierarchy:** Clear scale from 10px labels to 24px headlines

### Spacing Scale
| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon gaps |
| sm | 8px | Tight padding |
| md | 16px | Card padding |
| lg | 24px | Section spacing |
| xl | 32px | Page margins |

### Components

#### Cards
- Rounded corners (1rem / 16px)
- Subtle shadow: `0 1px 3px rgba(0,0,0,0.04)`
- Optional 1px border for definition
- Hover: scale(0.98) on press

#### Buttons
| Variant | Style |
|---------|-------|
| Primary | Navy bg, white text, 12px radius |
| Secondary | Transparent, border, dark text |
| Accent | Coral bg, white text (CTAs) |

#### Touch Targets
- Minimum 44x44px for tappable areas
- Row height: 56px minimum
- Button height: 44-52px

---

## 📱 Tenant Portal

**File:** `tenant-portal.html`

### Pages

#### 1. Dashboard (Home)
- **Rent Status Card:** Current balance, due date, quick pay button
- **Quick Actions:** Maintenance, Message, Documents, Events
- **Recent Activity:** Payment history, maintenance updates, messages
- **Upcoming Events:** Inspection schedule display

#### 2. Maintenance
- New request button (FAB)
- Active requests with status badges
- Completed request history
- Photo/document attachment preview

#### 3. Messages
- Conversation list with unread indicators
- Last message preview
- Timestamps
- Contact avatars

#### 4. Profile
- User info display
- Unit information
- Quick links: Documents, Payment Methods, Notifications, Settings
- Emergency contact banner

### Key Features
- One-tap rent payment
- Maintenance request submission
- Direct messaging with property manager
- Document access
- Emergency maintenance hotline

---

## 🔧 Admin/PM Portal

**File:** `admin-portal.html`

### Pages

#### 1. Dashboard
- **Property Selector:** Switch between managed properties
- **Quick Stats:** Occupancy rate, rent collected, late payments
- **AI Insights Card:** Predictive maintenance alerts
- **Priority Tasks:** Urgent maintenance approvals, lease renewals, inspections

#### 2. Units
- Search & filter functionality
- Filter chips: All, Occupied, Vacant, Late Rent
- Unit cards showing:
  - Tenant name & photo
  - Unit number with color-coded status
  - Rent amount & lease info
  - Active maintenance issues
  - Quick action buttons

#### 3. Inspections
- **AI Inspection Card:** Photo upload & AI work plan generation
- **Scheduled Inspections:** Calendar-style cards with actions
- **Completed Inspections:** History with pass/fail status

#### 4. More (Management)
- Grid of quick actions: Tenants, Payments, Vendors, Reports
- Settings menu
- Support access

### Key Features
- At-a-glance property health metrics
- AI-generated maintenance insights
- One-tap maintenance approval
- Rent optimization suggestions
- Unit availability tracking
- Vendor management
- Inspection scheduling with AI checklist

---

## 🧠 AI Features Highlight

### Tenant Portal
- *Coming soon:* Smart maintenance categorization
- *Coming soon:* Rent payment predictions

### Admin Portal
- **AI Insights Panel:** Surface patterns (e.g., "Unit 4B has recurring HVAC filter issues")
- **AI Inspection:** Upload photos → AI generates checklist + work plan + cost estimate
- **Rent Optimization:** Market-based pricing suggestions for renewals

---

## 🛠️ Technical Details

### Stack
- **CSS Framework:** Tailwind CSS (CDN)
- **Icons:** Lucide Icons (CDN)
- **Fonts:** Inter (Google Fonts)
- **No build step required** — pure HTML/CSS/JS

### Mobile Optimizations
- Viewport-fit=cover for iPhone notches
- Safe area insets for bottom navigation
- `-webkit-tap-highlight-color: transparent`
- `touch-feedback` class for press states
- Overscroll-behavior: none to prevent bounce

### Responsive Behaviors
- Max-width: 448px (mobile frame)
- Centered on larger screens
- Full-screen on actual mobile devices

### PWA Ready
- `theme-color` meta tags
- `apple-mobile-web-app-capable`
- Can be saved to home screen

---

## 📁 File Structure

```
pms-mobile-portals/
├── index.html           # Demo landing page with portal previews
├── tenant-portal.html   # Tenant/resident portal
├── admin-portal.html    # Property manager portal
├── design-system.md     # Documentation
└── README.md           # This file
```

---

## 🚀 Usage

### View Demo
Open `index.html` in a browser to see both portals with live previews.

### Tenant Portal Direct
Open `tenant-portal.html` to test the tenant experience.

### Admin Portal Direct  
Open `admin-portal.html` to test the management experience.

---

## 🔮 Future Enhancements

### Phase 2
- [ ] Dark mode toggle
- [ ] Push notifications UI
- [ ] Biometric auth prompts
- [ ] Offline mode indicators

### Phase 3
- [ ] Voice command integration
- [ ] AR inspection overlays
- [ ] Chatbot widget
- [ ] Real-time unit availability map

---

## 📝 Design Decisions

### Why navy + coral?
- Navy conveys trust, professionalism, stability (essential for property management)
- Coral adds warmth and draws attention to actions (pay, approve, alert)

### Why Inter?
- Excellent readability at small sizes
- Modern geometric sans-serif
- Excellent character support for rental addresses

### Why no hamburger menu?
- Bottom navigation is faster for one-handed mobile use
- 4 tabs fits the "magic number" for working memory
- Always visible = always accessible

### Why card-based layouts?
- Scannable information chunks
- Clear tap targets
- Consistent visual rhythm

---

## 🎯 Accessibility

- Semantic HTML where appropriate
- 4.5:1+ color contrast ratios
- Focus-visible states on interactive elements
- Touch targets > 44px
- Reduced motion media query support (template ready)

---

**Created:** 2026-02-23  
**Design System:** SuperDesign v1  
**Built by:** OpenClaw + prompt-engineering-expert skill