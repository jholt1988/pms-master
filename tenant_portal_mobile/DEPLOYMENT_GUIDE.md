# Deployment Guide - Tenant Portal Mobile App

**Version:** 1.0.0  
**Platform:** React Native (Expo)  
**Target:** iOS App Store & Google Play Store  
**Last Updated:** November 15, 2025

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Environment Configuration](#environment-configuration)
3. [App Configuration](#app-configuration)
4. [Assets Preparation](#assets-preparation)
5. [EAS Build Setup](#eas-build-setup)
6. [iOS Deployment](#ios-deployment)
7. [Android Deployment](#android-deployment)
8. [CI/CD Pipeline](#cicd-pipeline)
9. [Post-Deployment](#post-deployment)
10. [Troubleshooting](#troubleshooting)

---

## Pre-Deployment Checklist

### Code Quality
- [ ] All features tested manually on iOS and Android
- [ ] Zero TypeScript errors (`npm run type-check`)
- [ ] No console warnings in production build
- [ ] Performance profiled (no memory leaks, optimized renders)
- [ ] Accessibility audit completed
- [ ] Error boundaries implemented
- [ ] Analytics integration configured
- [ ] Crash reporting setup (Sentry recommended)

### Backend Integration
- [ ] Production API endpoints configured
- [ ] API authentication working (JWT tokens)
- [ ] Stripe production keys configured
- [ ] Push notification server keys configured
- [ ] SSL certificates valid
- [ ] API rate limiting tested
- [ ] Error handling for all API failures

### Security
- [ ] API keys stored securely (environment variables, not code)
- [ ] Sensitive data not logged
- [ ] HTTPS enforced for all API calls
- [ ] JWT refresh token flow working
- [ ] Session timeout implemented
- [ ] Biometric authentication (optional)

### Legal & Compliance
- [ ] Privacy policy created and accessible
- [ ] Terms of service created and accessible
- [ ] Data collection consent flow
- [ ] GDPR compliance (if applicable)
- [ ] Copyright notices
- [ ] Third-party licenses documented

---

## Environment Configuration

### Production Environment Variables

Create `.env.production` file:

```env
# Production API
EXPO_PUBLIC_API_URL=https://api.yourcompany.com/v1

# Stripe Production Keys
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_your_production_key_here

# Feature Flags
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
EXPO_PUBLIC_ENABLE_ANALYTICS=true
EXPO_PUBLIC_ENABLE_CRASH_REPORTING=true

# Analytics
EXPO_PUBLIC_GOOGLE_ANALYTICS_ID=UA-XXXXXXXXX-X

# Sentry
EXPO_PUBLIC_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Environment
EXPO_PUBLIC_ENVIRONMENT=production
```

### Environment File Management

```bash
# Development
.env.local          # Local development (not committed)

# Staging
.env.staging        # Staging environment (committed)

# Production
.env.production     # Production environment (committed, no secrets)
```

**CRITICAL:** Never commit actual API keys or secrets. Use Expo Secrets or EAS Secrets for sensitive values.

---

## App Configuration

### app.json Configuration

Update `app.json` with production values:

```json
{
  "expo": {
    "name": "Tenant Portal",
    "slug": "tenant-portal-mobile",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "userInterfaceStyle": "automatic",
    "splash": {
      "image": "./assets/splash.png",
      "resizeMode": "contain",
      "backgroundColor": "#6200EE"
    },
    "assetBundlePatterns": [
      "**/*"
    ],
    "ios": {
      "supportsTablet": true,
      "bundleIdentifier": "com.yourcompany.tenantportal",
      "buildNumber": "1",
      "infoPlist": {
        "NSCameraUsageDescription": "Upload photos for maintenance requests",
        "NSPhotoLibraryUsageDescription": "Select photos for maintenance requests",
        "NSPhotoLibraryAddUsageDescription": "Save receipts and documents",
        "NSUserTrackingUsageDescription": "This identifier will be used to deliver personalized notifications to you."
      },
      "associatedDomains": [
        "applinks:yourcompany.com"
      ],
      "config": {
        "usesNonExemptEncryption": false
      }
    },
    "android": {
      "adaptiveIcon": {
        "foregroundImage": "./assets/adaptive-icon.png",
        "backgroundColor": "#6200EE"
      },
      "package": "com.yourcompany.tenantportal",
      "versionCode": 1,
      "permissions": [
        "CAMERA",
        "READ_EXTERNAL_STORAGE",
        "WRITE_EXTERNAL_STORAGE",
        "NOTIFICATIONS"
      ],
      "intentFilters": [
        {
          "action": "VIEW",
          "data": [
            {
              "scheme": "https",
              "host": "yourcompany.com",
              "pathPrefix": "/app"
            }
          ],
          "category": [
            "BROWSABLE",
            "DEFAULT"
          ]
        }
      ]
    },
    "web": {
      "favicon": "./assets/favicon.png"
    },
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#6200EE",
          "sounds": [
            "./assets/notification-sound.wav"
          ]
        }
      ],
      [
        "expo-image-picker",
        {
          "photosPermission": "Allow Tenant Portal to access your photos for maintenance requests"
        }
      ]
    ],
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id-here"
      }
    },
    "owner": "your-expo-username",
    "updates": {
      "fallbackToCacheTimeout": 0,
      "url": "https://u.expo.dev/your-eas-project-id"
    },
    "runtimeVersion": {
      "policy": "sdkVersion"
    }
  }
}
```

### Key Configuration Fields

**Bundle Identifiers:**
- iOS: `com.yourcompany.tenantportal` (must be unique in App Store)
- Android: `com.yourcompany.tenantportal` (must be unique in Play Store)

**Version Management:**
- `version`: User-facing version (1.0.0, 1.1.0, 2.0.0)
- iOS `buildNumber`: Incremental build number (1, 2, 3...)
- Android `versionCode`: Incremental version code (1, 2, 3...)

**Permissions:**
- Camera: For maintenance request photos
- Photo Library: For selecting images
- Notifications: For push notifications

---

## Assets Preparation

### Required Assets

1. **App Icon** (1024x1024 PNG, no transparency)
   - Location: `./assets/icon.png`
   - Used for: App stores, home screen
   - Tools: Sketch, Figma, Adobe Illustrator

2. **Adaptive Icon** (Android, 1024x1024 PNG)
   - Location: `./assets/adaptive-icon.png`
   - Foreground layer (icon), background color in app.json

3. **Splash Screen** (1284x2778 PNG)
   - Location: `./assets/splash.png`
   - Used for: App launch screen
   - Background color: Match brand color

4. **Notification Icon** (Android, 96x96 PNG, white with transparency)
   - Location: `./assets/notification-icon.png`
   - Must be monochrome

5. **Favicon** (Web, 48x48 PNG)
   - Location: `./assets/favicon.png`

### Screenshot Requirements

**iOS Screenshots (Required Sizes):**
- 6.5" (iPhone 14 Pro Max): 1284x2778 pixels
- 5.5" (iPhone 8 Plus): 1242x2208 pixels
- 12.9" iPad Pro: 2048x2732 pixels (if supporting iPad)

**Android Screenshots:**
- Phone: 1080x1920 pixels minimum
- 7" Tablet: 1920x1200 pixels (optional)
- 10" Tablet: 2560x1600 pixels (optional)

**Screenshot Guidelines:**
- 5-8 screenshots showcasing key features
- High quality, actual app screens (no mockups)
- Show: Login, Payments, Maintenance, Lease, Notifications
- Add captions explaining features (optional)

### App Store Descriptions

**Short Description (80 chars max):**
```
Manage your rental: pay rent, submit maintenance, view lease, and more.
```

**Full Description:**
```
Tenant Portal makes rental management simple and convenient.

KEY FEATURES:
• Pay Rent - Securely pay rent online with Stripe, view payment history
• Maintenance Requests - Submit requests with photos, track status
• Lease Management - View lease details, request renewals, download documents
• Push Notifications - Stay updated on payments, maintenance, and important notices
• Messages - Communicate with your property manager
• Profile Management - Update personal information and preferences

BENEFITS:
✓ 24/7 access from anywhere
✓ Secure payment processing
✓ Real-time request tracking
✓ Digital document storage
✓ Instant notifications
✓ Direct communication channel

SECURITY:
Your data is protected with industry-standard encryption. Payments are processed securely through Stripe.

SUPPORT:
Need help? Contact us at support@yourcompany.com

Download today and simplify your rental experience!
```

**Keywords (iOS, 100 chars max):**
```
rent,rental,tenant,property,maintenance,lease,payment,apartment,housing,landlord
```

---

## EAS Build Setup

### Install EAS CLI

```bash
npm install -g eas-cli
```

### Login to Expo Account

```bash
eas login
```

If you don't have an Expo account:
```bash
# Create account at https://expo.dev
eas register
```

### Initialize EAS Build

```bash
cd tenant_portal_mobile
eas build:configure
```

This creates `eas.json` file:

```json
{
  "cli": {
    "version": ">= 5.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false,
        "resourceClass": "m-medium"
      },
      "android": {
        "buildType": "apk",
        "resourceClass": "medium"
      }
    },
    "production": {
      "ios": {
        "resourceClass": "m-medium",
        "simulator": false
      },
      "android": {
        "buildType": "app-bundle",
        "resourceClass": "medium"
      },
      "env": {
        "EXPO_PUBLIC_API_URL": "https://api.yourcompany.com/v1"
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your-apple-id@email.com",
        "ascAppId": "1234567890",
        "appleTeamId": "XXXXXXXXXX"
      },
      "android": {
        "serviceAccountKeyPath": "./service-account-key.json",
        "track": "internal"
      }
    }
  }
}
```

### Configure Secrets

Store sensitive values with EAS Secrets:

```bash
# Stripe production key
eas secret:create --scope project --name STRIPE_PUBLISHABLE_KEY --value pk_live_xxxxx

# API production URL
eas secret:create --scope project --name API_URL --value https://api.yourcompany.com/v1

# Sentry DSN
eas secret:create --scope project --name SENTRY_DSN --value https://xxxxx@sentry.io/xxxxx
```

---

## iOS Deployment

### Prerequisites

1. **Apple Developer Account** ($99/year)
   - Sign up at https://developer.apple.com
   - Enroll in Apple Developer Program

2. **App Store Connect Setup**
   - Create new app at https://appstoreconnect.apple.com
   - Set bundle ID: `com.yourcompany.tenantportal`
   - Note down Apple ID (10-digit number)

### Step 1: Configure iOS Certificates

EAS handles certificate management automatically:

```bash
eas build --platform ios --profile production
```

When prompted:
- Select "Yes" to generate new certificates
- Choose "Let EAS handle signing"
- Enter Apple ID credentials
- Enable two-factor authentication if prompted

### Step 2: Build iOS App

```bash
# Production build for App Store
eas build --platform ios --profile production

# Preview build for TestFlight (testing)
eas build --platform ios --profile preview
```

Build process takes 15-30 minutes. Monitor at https://expo.dev.

### Step 3: Download IPA File

```bash
# After build completes
eas build:list

# Download specific build
eas build:download --id <build-id>
```

### Step 4: Submit to App Store

#### Automatic Submission:
```bash
eas submit --platform ios --profile production
```

When prompted:
- Enter Apple ID
- Enter app-specific password
- Select latest build

#### Manual Submission:
1. Open Xcode
2. Window → Organizer
3. Drag .ipa file to Archives
4. Click "Distribute App"
5. Select "App Store Connect"
6. Follow prompts

### Step 5: App Store Listing

In App Store Connect:

1. **App Information:**
   - Name: Tenant Portal
   - Subtitle: Manage Your Rental
   - Category: Primary: Lifestyle, Secondary: Productivity
   - Age Rating: 4+ (Low Maturity)

2. **Pricing:**
   - Price: Free
   - Availability: All countries

3. **Version Information:**
   - Version: 1.0.0
   - Screenshots: Upload 5-8 screenshots
   - Description: Use prepared description
   - Keywords: Use prepared keywords
   - Support URL: https://yourcompany.com/support
   - Marketing URL: https://yourcompany.com (optional)

4. **App Review Information:**
   - Contact: your-email@yourcompany.com
   - Phone: +1-XXX-XXX-XXXX
   - Demo Account: tenant@example.com / Password123!
   - Notes: "Test app with provided credentials"

5. **Submit for Review**
   - Click "Submit for Review"
   - Review typically takes 24-48 hours

---

## Android Deployment

### Prerequisites

1. **Google Play Console Account** ($25 one-time fee)
   - Sign up at https://play.google.com/console
   - Pay registration fee

2. **Create App in Play Console**
   - Click "Create app"
   - App name: Tenant Portal
   - Language: English (United States)
   - App/Game: App
   - Free/Paid: Free
   - Accept declarations

### Step 1: Configure Android Keystore

EAS handles keystore management:

```bash
eas build --platform android --profile production
```

When prompted:
- Select "Yes" to generate new keystore
- EAS will securely store and reuse for updates

### Step 2: Build Android App

```bash
# Production build (.aab for Play Store)
eas build --platform android --profile production

# Preview build (.apk for testing)
eas build --platform android --profile preview
```

Build process takes 10-20 minutes.

### Step 3: Download AAB File

```bash
eas build:download --id <build-id>
```

### Step 4: Submit to Google Play

#### Automatic Submission:
```bash
# First, create service account key in Google Cloud Console
eas submit --platform android --profile production
```

#### Manual Submission:
1. Go to Google Play Console
2. Select your app
3. Release → Production
4. Create new release
5. Upload AAB file
6. Fill out release notes
7. Review and roll out

### Step 5: Play Store Listing

In Google Play Console:

1. **Main Store Listing:**
   - App name: Tenant Portal
   - Short description: Use prepared short description (80 chars)
   - Full description: Use prepared full description (4000 chars max)
   - Screenshots: Phone (2-8), 7" Tablet (optional), 10" Tablet (optional)
   - Feature graphic: 1024x500 PNG
   - App icon: 512x512 PNG (uploaded automatically)
   - Category: Lifestyle or House & Home
   - Content rating: Everyone

2. **Content Rating:**
   - Complete questionnaire (no violence, mature content, etc.)
   - Rating: Everyone or PEGI 3

3. **Target Audience:**
   - Age: 18 and older (rental contracts)

4. **Privacy Policy:**
   - URL: https://yourcompany.com/privacy

5. **App Access:**
   - All functionality available without login: No
   - Provide test account: tenant@example.com / Password123!

6. **Ads:**
   - Does app contain ads? No

7. **Countries/Regions:**
   - Select all available countries

8. **Submit for Review**
   - Review typically takes 1-3 days

---

## CI/CD Pipeline

### GitHub Actions Workflow

Create `.github/workflows/build.yml`:

```yaml
name: EAS Build

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: 🏗 Setup repo
        uses: actions/checkout@v3

      - name: 🏗 Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: npm

      - name: 🏗 Setup EAS
        uses: expo/expo-github-action@v8
        with:
          eas-version: latest
          token: ${{ secrets.EXPO_TOKEN }}

      - name: 📦 Install dependencies
        run: npm ci --legacy-peer-deps

      - name: 🚀 Type check
        run: npm run type-check

      - name: 🚀 Lint
        run: npm run lint

      - name: 🚀 Build on EAS (iOS)
        run: eas build --platform ios --profile preview --non-interactive
        if: github.ref == 'refs/heads/main'

      - name: 🚀 Build on EAS (Android)
        run: eas build --platform android --profile preview --non-interactive
        if: github.ref == 'refs/heads/main'
```

### Required Secrets

In GitHub repository settings → Secrets:

```
EXPO_TOKEN: Get from https://expo.dev/accounts/[account]/settings/access-tokens
```

### Automated Deployment

For automatic submission on tag:

```yaml
on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      # ... build steps ...
      
      - name: 🚀 Submit to iOS
        run: eas submit --platform ios --profile production --non-interactive
      
      - name: 🚀 Submit to Android
        run: eas submit --platform android --profile production --non-interactive
```

---

## Post-Deployment

### Monitoring

1. **Crash Reporting:**
   - Set up Sentry: https://sentry.io
   - Add Sentry DSN to app.json
   - Monitor crashes in real-time

2. **Analytics:**
   - Google Analytics for Firebase
   - Track key events: login, payment, maintenance request
   - Monitor user retention

3. **Performance:**
   - Firebase Performance Monitoring
   - Track app startup time
   - Monitor API response times

### App Store Optimization (ASO)

**Track Metrics:**
- Impressions
- Downloads
- Conversion rate
- User ratings
- Search rankings

**Optimize:**
- Update screenshots based on user feedback
- Refine keywords quarterly
- Respond to reviews (within 24 hours)
- Update description with new features

### Version Updates

**Increment Version Numbers:**
```json
// app.json
{
  "version": "1.0.1",  // User-facing (bug fixes)
  "ios": {
    "buildNumber": "2"  // Increment for each submission
  },
  "android": {
    "versionCode": 2  // Increment for each submission
  }
}
```

**Release Notes Best Practices:**
```
What's New in Version 1.0.1:

• Fixed payment confirmation screen crash
• Improved maintenance photo upload reliability
• Added better error messages
• Performance improvements and bug fixes

Need help? Contact support@yourcompany.com
```

### OTA Updates (Over-The-Air)

For non-native changes (JS/assets), use EAS Update:

```bash
# Publish update without app store review
eas update --branch production --message "Fix payment button styling"
```

Users receive updates on next app launch.

---

## Troubleshooting

### Build Failures

**"Bundle identifier already exists"**
- Solution: Choose unique bundle ID in app.json

**"Certificates expired"**
- Solution: Run `eas credentials` and regenerate

**"Build timed out"**
- Solution: Upgrade EAS plan for more build time

### Submission Errors

**iOS: "App uses encryption"**
- Solution: Set `usesNonExemptEncryption: false` in app.json if not using custom encryption

**iOS: "Missing compliance information"**
- Solution: Fill out export compliance in App Store Connect

**Android: "App not tested on enough devices"**
- Solution: Use internal testing track first, then promote

### App Rejections

**Common iOS Rejection Reasons:**
1. Crash on launch → Fix and resubmit
2. Incomplete information → Add demo account
3. Privacy policy missing → Add URL
4. Misleading screenshots → Use actual app screens

**Common Android Rejection Reasons:**
1. Privacy policy not accessible → Add URL in Play Console
2. Permissions not justified → Explain in app description
3. Content rating incorrect → Redo questionnaire

### Performance Issues

**Large bundle size:**
```bash
# Analyze bundle
npx react-native-bundle-visualizer

# Remove unused dependencies
npm uninstall <unused-package>

# Use dynamic imports
const Component = lazy(() => import('./Component'));
```

**Slow startup:**
- Enable Hermes engine (enabled by default in Expo)
- Minimize initial Redux state
- Lazy load screens

---

## Deployment Checklist

### Pre-Submission
- [ ] Version numbers incremented
- [ ] Build successful on EAS
- [ ] Tested on physical devices (iOS and Android)
- [ ] All required screenshots prepared
- [ ] App descriptions finalized
- [ ] Privacy policy URL working
- [ ] Demo account credentials ready

### iOS Submission
- [ ] Apple Developer account active
- [ ] App created in App Store Connect
- [ ] Certificates configured
- [ ] Production build completed
- [ ] App metadata filled
- [ ] Screenshots uploaded
- [ ] Submitted for review

### Android Submission
- [ ] Google Play Console account active
- [ ] App created in Play Console
- [ ] Keystore configured
- [ ] Production build completed
- [ ] Store listing filled
- [ ] Screenshots uploaded
- [ ] Content rating completed
- [ ] Submitted for review

### Post-Launch
- [ ] Crash reporting configured
- [ ] Analytics tracking verified
- [ ] Push notifications tested
- [ ] Monitoring dashboards set up
- [ ] Support email monitored
- [ ] App Store reviews monitored
- [ ] Update plan established

---

## Support Resources

- **Expo Documentation:** https://docs.expo.dev/
- **EAS Build:** https://docs.expo.dev/build/introduction/
- **EAS Submit:** https://docs.expo.dev/submit/introduction/
- **App Store Guidelines:** https://developer.apple.com/app-store/review/guidelines/
- **Play Store Guidelines:** https://play.google.com/console/about/guides/

---

**Document Version:** 1.0  
**Last Updated:** November 15, 2025  
**Maintainer:** Development Team
