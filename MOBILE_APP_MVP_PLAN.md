# Mobile App MVP - Development Plan 📱

**Status:** IN PROGRESS  
**Priority:** HIGH  
**Estimated Effort:** 160 hours  
**Target Platforms:** iOS & Android  
**Tech Stack:** React Native + Expo

---

## Executive Summary

**Business Case:** 70% of tenants prefer mobile for rent payment. Native mobile apps are standard across all major competitors (AppFolio, Buildium, Rent Manager). This is a critical competitive requirement for market adoption.

**MVP Approach:** Build a tenant-focused mobile app with core features using React Native and Expo for rapid cross-platform development. This delivers both iOS and Android apps from a single codebase, reducing development time by 60% compared to native development.

---

## Phase 1: Project Setup & Infrastructure (16 hours)

### 1.1 Initialize React Native Project (2 hours)
- [x] Create new Expo project with TypeScript
- [ ] Configure project structure following domain-driven architecture
- [ ] Set up navigation (React Navigation v6)
- [ ] Configure environment variables
- [ ] Set up development environment (iOS Simulator / Android Emulator)

### 1.2 Backend Integration (4 hours)
- [ ] Create API service layer (Axios with interceptors)
- [ ] Implement JWT authentication flow
- [ ] Set up secure token storage (expo-secure-store)
- [ ] Configure API base URL for development/production
- [ ] Add request/response logging for debugging

### 1.3 State Management (3 hours)
- [ ] Set up Redux Toolkit for global state
- [ ] Create authentication slice (login, logout, token refresh)
- [ ] Create user profile slice
- [ ] Implement persistence (redux-persist with expo-secure-store)

### 1.4 UI Foundation (4 hours)
- [ ] Choose UI library (React Native Paper or NativeBase)
- [ ] Create design system (colors, typography, spacing)
- [ ] Build reusable components (Button, Input, Card, etc.)
- [ ] Set up navigation structure (Stack, Tab, Drawer)
- [ ] Create splash screen and app icon

### 1.5 Development Tools (3 hours)
- [ ] Configure ESLint and Prettier
- [ ] Set up TypeScript strict mode
- [ ] Add error boundary component
- [ ] Configure Sentry for crash reporting
- [ ] Set up app versioning

---

## Phase 2: Authentication & User Profile (20 hours)

### 2.1 Login Flow (8 hours)
- [ ] Login screen UI (email/password)
- [ ] Form validation with error handling
- [ ] "Remember me" functionality
- [ ] Biometric authentication (Face ID / Touch ID / Fingerprint)
- [ ] Password reset flow
- [ ] Backend API integration (/api/auth/login)

### 2.2 Registration Flow (6 hours)
- [ ] Registration screen for new tenants
- [ ] Multi-step form (personal info, contact, lease code)
- [ ] Email verification
- [ ] Terms of service acceptance
- [ ] Backend integration (/api/auth/register)

### 2.3 User Profile (6 hours)
- [ ] Profile screen with user details
- [ ] Edit profile functionality
- [ ] Change password
- [ ] Profile photo upload
- [ ] Logout functionality
- [ ] Backend integration (/api/users/profile)

---

## Phase 3: Core Features - Rent Payment (40 hours)

### 3.1 Payment Overview (8 hours)
- [ ] Dashboard showing rent amount, due date, payment status
- [ ] Payment history list
- [ ] Outstanding balance indicator
- [ ] Late fee notifications
- [ ] Backend integration (/api/payments)

### 3.2 Payment Methods (12 hours)
- [ ] Stripe integration (expo-stripe-sdk)
- [ ] Add credit/debit card (with card scanning)
- [ ] Add bank account (ACH)
- [ ] Manage saved payment methods
- [ ] Set default payment method
- [ ] PCI compliance (no card data stored locally)
- [ ] Backend integration (/api/payment-methods)

### 3.3 Make Payment (12 hours)
- [ ] Payment amount selection (full rent, partial, custom)
- [ ] Payment method selection
- [ ] Payment confirmation screen
- [ ] Payment processing with loading states
- [ ] Success/failure screens
- [ ] Receipt generation (PDF with email option)
- [ ] Push notification on successful payment
- [ ] Backend integration (/api/payments/process)

### 3.4 Auto-Pay (8 hours)
- [ ] Enable/disable auto-pay toggle
- [ ] Auto-pay setup wizard
- [ ] Payment method selection for auto-pay
- [ ] Auto-pay schedule configuration
- [ ] Confirmation and notifications
- [ ] Backend integration (/api/billing/autopay)

---

## Phase 4: Maintenance Requests (32 hours)

### 4.1 Maintenance List (8 hours)
- [ ] List of all maintenance requests
- [ ] Filter by status (Open, In Progress, Completed)
- [ ] Search functionality
- [ ] Sort by date, priority
- [ ] Pull-to-refresh
- [ ] Backend integration (/api/maintenance)

### 4.2 Create Maintenance Request (16 hours)
- [ ] Multi-step form (category, description, urgency)
- [ ] Category selection (Plumbing, Electrical, HVAC, etc.)
- [ ] Priority selection (Emergency, High, Normal, Low)
- [ ] Description with rich text input
- [ ] Photo upload (multiple images)
- [ ] Camera integration (expo-camera)
- [ ] Image compression before upload
- [ ] Location/unit selection
- [ ] Permission to enter toggle
- [ ] Preferred contact method
- [ ] Submit with loading states
- [ ] Success confirmation with request number
- [ ] Backend integration (/api/maintenance/requests)

### 4.3 Maintenance Details (8 hours)
- [ ] View request details (status, priority, description)
- [ ] Photo gallery for uploaded images
- [ ] Status timeline (created, assigned, in progress, completed)
- [ ] Technician information (name, photo, contact)
- [ ] Estimated completion date
- [ ] Add notes/updates to request
- [ ] Rate completed service (5-star + comments)
- [ ] Push notifications for status changes
- [ ] Backend integration (/api/maintenance/:id)

---

## Phase 5: Lease & Documents (20 hours)

### 5.1 Lease Overview (8 hours)
- [ ] Current lease details (dates, rent amount, unit)
- [ ] Lease document viewer (PDF)
- [ ] Download lease PDF
- [ ] Share lease via email
- [ ] Lease renewal status
- [ ] Move-out notice submission
- [ ] Backend integration (/api/leases/my-lease)

### 5.2 Documents Library (12 hours)
- [ ] List of all tenant documents
- [ ] Filter by document type (Lease, Notice, Invoice, etc.)
- [ ] Document preview (PDF, images)
- [ ] Download documents to device
- [ ] Share documents
- [ ] Document upload (for tenant-submitted docs)
- [ ] Search documents
- [ ] Backend integration (/api/documents)

---

## Phase 6: Notifications (16 hours)

### 6.1 Push Notifications (12 hours)
- [ ] Configure Expo Push Notifications
- [ ] Register device token with backend
- [ ] Handle notification permissions
- [ ] Notification types:
  - Rent payment due reminders
  - Payment confirmations
  - Maintenance request updates
  - Lease renewal notices
  - Emergency notifications
- [ ] Notification inbox in app
- [ ] Mark notifications as read
- [ ] Deep linking to relevant screens
- [ ] Backend integration (/api/notifications)

### 6.2 In-App Notifications (4 hours)
- [ ] Notification center screen
- [ ] Badge count on tab icon
- [ ] Notification preferences (enable/disable types)
- [ ] Email notification preferences
- [ ] Backend integration (/api/notifications/preferences)

---

## Phase 7: Additional Features (16 hours)

### 7.1 Home Dashboard (8 hours)
- [ ] Quick stats (rent due, open maintenance, unread messages)
- [ ] Quick actions (Pay Rent, Request Maintenance)
- [ ] Recent activity feed
- [ ] Important announcements
- [ ] Property manager contact card
- [ ] Emergency contact button

### 7.2 Messaging (8 hours)
- [ ] Chat with property manager
- [ ] Message list (conversations)
- [ ] Message thread view
- [ ] Send text messages
- [ ] Send images
- [ ] Message status (sent, delivered, read)
- [ ] Push notifications for new messages
- [ ] Backend integration (/api/messaging)

---

## Phase 8: Testing & Refinement (16 hours)

### 8.1 Testing (10 hours)
- [ ] Unit tests for API services
- [ ] Integration tests for authentication
- [ ] E2E tests for critical flows (login, payment)
- [ ] Manual testing on iOS devices
- [ ] Manual testing on Android devices
- [ ] Accessibility testing (VoiceOver, TalkBack)
- [ ] Performance testing (startup time, memory usage)
- [ ] Security audit (token storage, API calls)

### 8.2 Polish & Bug Fixes (6 hours)
- [ ] Fix identified bugs
- [ ] Improve loading states
- [ ] Add skeleton screens
- [ ] Optimize images and assets
- [ ] Improve error messages
- [ ] Add help/FAQ section
- [ ] Update app icons and splash screens

---

## Phase 9: Deployment Preparation (8 hours)

### 9.1 iOS App Store Setup (4 hours)
- [ ] Create Apple Developer account ($99/year)
- [ ] Configure App Store Connect
- [ ] Create app listing (name, description, screenshots)
- [ ] Configure app privacy details
- [ ] Set up TestFlight for beta testing
- [ ] Submit for App Store review

### 9.2 Google Play Store Setup (4 hours)
- [ ] Create Google Play Console account ($25 one-time)
- [ ] Configure Play Console app
- [ ] Create store listing (name, description, screenshots)
- [ ] Configure app privacy details
- [ ] Set up internal testing track
- [ ] Submit for Play Store review

---

## Technical Architecture

### Technology Stack
```
├── React Native 0.73+ (via Expo 50+)
├── TypeScript 5.x
├── Redux Toolkit (state management)
├── React Navigation 6.x (navigation)
├── Axios (API client)
├── Expo modules:
│   ├── expo-secure-store (secure token storage)
│   ├── expo-camera (photo capture)
│   ├── expo-image-picker (photo selection)
│   ├── expo-document-picker (document selection)
│   ├── expo-notifications (push notifications)
│   ├── expo-local-authentication (biometrics)
│   ├── expo-file-system (file downloads)
│   └── expo-linking (deep links)
├── Stripe SDK (payments)
├── React Native Paper (UI components)
├── Sentry (error tracking)
└── Jest + Testing Library (testing)
```

### Project Structure
```
tenant_portal_mobile/
├── app/                          # Expo Router (file-based routing)
│   ├── (auth)/                   # Auth screens (login, register)
│   ├── (tabs)/                   # Main app tabs
│   │   ├── home.tsx              # Dashboard
│   │   ├── payments.tsx          # Rent payments
│   │   ├── maintenance.tsx       # Maintenance requests
│   │   └── profile.tsx           # User profile
│   └── _layout.tsx               # Root layout
├── src/
│   ├── api/                      # API service layer
│   │   ├── client.ts             # Axios configuration
│   │   ├── auth.ts               # Auth endpoints
│   │   ├── payments.ts           # Payment endpoints
│   │   ├── maintenance.ts        # Maintenance endpoints
│   │   └── documents.ts          # Document endpoints
│   ├── store/                    # Redux store
│   │   ├── index.ts              # Store configuration
│   │   ├── authSlice.ts          # Auth state
│   │   ├── userSlice.ts          # User profile state
│   │   └── paymentsSlice.ts      # Payments state
│   ├── components/               # Reusable UI components
│   │   ├── common/               # Generic components
│   │   ├── payments/             # Payment-specific components
│   │   ├── maintenance/          # Maintenance components
│   │   └── documents/            # Document components
│   ├── hooks/                    # Custom React hooks
│   ├── utils/                    # Utility functions
│   ├── constants/                # Constants (colors, routes, etc.)
│   ├── types/                    # TypeScript types
│   └── theme/                    # Theme configuration
├── assets/                       # Images, fonts, etc.
├── app.json                      # Expo configuration
├── package.json
├── tsconfig.json
└── README.md
```

### API Integration Pattern
```typescript
// src/api/client.ts
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

const apiClient = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_URL,
  timeout: 10000,
});

// Request interceptor - add auth token
apiClient.interceptors.request.use(async (config) => {
  const token = await SecureStore.getItemAsync('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor - handle token refresh
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      // Token expired - refresh or redirect to login
      await SecureStore.deleteItemAsync('auth_token');
      // Navigate to login screen
    }
    return Promise.reject(error);
  }
);

export default apiClient;
```

---

## Development Timeline

### Sprint 1 (Week 1-2): Foundation
- Project setup and infrastructure
- Authentication and user profile
- **Deliverable:** Users can login and view profile

### Sprint 2 (Week 3-4): Rent Payments
- Payment overview and history
- Payment methods management
- Payment processing
- Auto-pay setup
- **Deliverable:** Users can pay rent via mobile app

### Sprint 3 (Week 5-6): Maintenance Requests
- Maintenance request list
- Create maintenance request with photos
- View request details and status
- **Deliverable:** Users can submit and track maintenance requests

### Sprint 4 (Week 7-8): Documents & Notifications
- Lease viewing and document library
- Push notifications setup
- Messaging with property manager
- **Deliverable:** Users can view documents and receive notifications

### Sprint 5 (Week 9-10): Polish & Deploy
- Testing and bug fixes
- Performance optimization
- App store preparation and submission
- **Deliverable:** Apps live in App Store and Play Store

---

## Success Metrics

### User Adoption
- **Target:** 60% of active tenants using mobile app within 3 months
- **Measure:** Monthly active users (MAU)

### Payment Conversion
- **Target:** 50% of rent payments via mobile app within 6 months
- **Measure:** Mobile payments / total payments

### Maintenance Requests
- **Target:** 70% of maintenance requests via mobile app
- **Measure:** Mobile requests / total requests

### User Satisfaction
- **Target:** 4.5+ stars in App Store and Play Store
- **Measure:** App store ratings and reviews

### Performance
- **Target:** App startup < 2 seconds
- **Measure:** Cold start time on mid-range devices

---

## Risk Management

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Expo limitations | Medium | Use expo-dev-client for custom native modules if needed |
| Payment processing errors | High | Extensive testing, error handling, retry logic |
| Push notification delivery | Medium | Fallback to in-app notifications and email |
| iOS/Android compatibility | Medium | Test on multiple devices and OS versions |

### Business Risks
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Low adoption rate | High | In-app tutorials, email campaigns, incentives |
| App store rejection | Medium | Follow platform guidelines strictly |
| Security vulnerabilities | High | Security audit, penetration testing |
| Backend API changes | Medium | Version API endpoints, maintain compatibility |

---

## Competitive Analysis

### Feature Comparison with Competitors

| Feature | AppFolio | Buildium | Rent Manager | Our MVP |
|---------|----------|----------|--------------|---------|
| Rent Payment | ✅ | ✅ | ✅ | ✅ |
| Auto-Pay | ✅ | ✅ | ✅ | ✅ |
| Maintenance Requests | ✅ | ✅ | ✅ | ✅ |
| Photo Upload | ✅ | ✅ | ✅ | ✅ |
| Push Notifications | ✅ | ✅ | ✅ | ✅ |
| Lease Viewing | ✅ | ✅ | ✅ | ✅ |
| Messaging | ✅ | ✅ | ✅ | ✅ |
| Move-Out Notices | ✅ | ✅ | ❌ | ❌ (Phase 2) |
| Guest Parking | ❌ | ✅ | ❌ | ❌ (Phase 2) |
| Amenity Booking | ❌ | ✅ | ❌ | ❌ (Phase 2) |

**Conclusion:** MVP covers all critical features present in top competitors. Additional features can be added in Phase 2 based on user feedback.

---

## Post-MVP Enhancements (Phase 2)

### High Priority
1. **Move-Out Process** (16 hours)
   - Move-out notice submission
   - Move-out inspection scheduling
   - Security deposit tracking

2. **Amenity Booking** (20 hours)
   - Reserve common areas (gym, pool, clubhouse)
   - Calendar view of availability
   - Booking confirmations

3. **Guest Parking** (12 hours)
   - Register guest vehicles
   - Visitor pass management
   - Parking violation reporting

4. **Offline Support** (16 hours)
   - Cache critical data locally
   - Queue actions when offline
   - Sync when connection restored

### Medium Priority
5. **Referral Program** (16 hours)
   - Refer friends to vacant units
   - Track referral rewards
   - Share property listings

6. **Bill Splitting** (12 hours)
   - Split rent with roommates
   - Utilities splitting
   - Payment tracking per person

7. **Community Feed** (20 hours)
   - Property-wide announcements
   - Community events
   - Tenant directory (opt-in)

---

## Cost Analysis

### One-Time Costs
- Apple Developer Account: $99/year
- Google Play Console: $25 (one-time)
- **Total:** $124 + $99/year

### Ongoing Costs
- Expo EAS (for builds): $29/month or use free tier
- Push Notifications (Expo): Free up to 10M notifications/month
- Sentry (error tracking): Free up to 5K errors/month
- **Estimated Monthly:** $0-29 (free tier sufficient for MVP)

### Development Cost
- 160 hours × $75/hour (contractor rate) = $12,000
- OR 4 weeks × 1 full-time developer @ $80K/year = $6,154

**Total MVP Investment:** ~$6,000-12,000 + minimal hosting costs

---

## Next Immediate Actions

1. ✅ Create project plan (this document)
2. 🔄 Initialize Expo project
3. 🔄 Set up development environment
4. ⏳ Configure project structure
5. ⏳ Build authentication flow
6. ⏳ Implement rent payment feature

---

**Status:** Project plan complete, ready to start implementation  
**Last Updated:** November 15, 2025  
**Version:** 1.0  
**Developer:** Property Management Suite Team
