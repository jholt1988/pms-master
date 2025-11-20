# Tenant Portal Mobile - Quick Start Guide

## Prerequisites

- **Node.js**: 18.x or higher
- **npm**: 9.x or higher
- **Expo CLI**: Latest version
- **iOS Development**: macOS with Xcode (optional)
- **Android Development**: Android Studio (optional)
- **Physical Device**: iOS or Android device with Expo Go app

## Installation

```bash
# Navigate to mobile app directory
cd tenant_portal_mobile

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm start
```

## Running the App

### Option 1: Expo Go (Fastest)
1. Install Expo Go on your device:
   - iOS: [App Store](https://apps.apple.com/app/expo-go/id982107779)
   - Android: [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent)
2. Run `npm start`
3. Scan QR code with:
   - iOS: Camera app
   - Android: Expo Go app

### Option 2: iOS Simulator (macOS only)
```bash
npm run ios
```

### Option 3: Android Emulator
```bash
npm run android
```

## Default Credentials

**Test User:**
- Email: `tenant@example.com`
- Password: `Password123!`

**Admin User:**
- Email: `admin@example.com`
- Password: `Admin123!@#`

## Available Scripts

```bash
npm start          # Start Expo dev server
npm run ios        # Run on iOS simulator
npm run android    # Run on Android emulator
npm run web        # Run in web browser
npm test           # Run tests (when implemented)
npm run lint       # Run ESLint (when configured)
```

## Project Structure

```
src/
├── api/           # API service layer (7 services)
├── store/         # Redux store (7 slices)
├── screens/       # UI screens (30+ screens)
├── navigation/    # Navigation configuration
├── types/         # TypeScript type definitions
├── services/      # Business logic services
├── hooks/         # Custom React hooks
├── components/    # Reusable UI components
└── theme/         # Design system (colors, spacing, typography)
```

## Key Features

### 1. Authentication
- Email/password login with validation
- Registration with password strength indicator
- Session persistence with Redux Persist
- JWT token management

### 2. Rent Payments
- Payment history with filters
- Make full/partial payments
- Stripe integration
- Auto-pay setup
- Receipt generation

### 3. Maintenance Requests
- Create requests with photo upload (up to 3 images)
- Priority levels (LOW/MEDIUM/HIGH/URGENT)
- Status tracking
- Technician assignment
- Update history

### 4. Lease Management
- View lease details
- Document access and download
- Renewal requests with rent negotiation
- Move-out notice with date validation

### 5. Notifications
- Push notifications with badge counts
- 6 categories (Payment/Maintenance/Lease/Document/System/Announcement)
- Deep linking to relevant screens
- Email/push preferences per category
- Search and filter

### 6. Messages
- Thread list with participant avatars
- Unread count badges
- Status filters (Active/Archived/Closed)
- Search functionality
- Archive threads

## Development Tips

### Hot Reloading
- Press `r` in terminal to reload
- Press `m` to toggle menu on device
- Shake device to open developer menu

### Debugging
- Press `j` in terminal to open Chrome DevTools
- Use React DevTools browser extension
- Add `console.log()` statements (appear in terminal)

### Redux DevTools
```bash
# Install Redux DevTools Extension
# Available for Chrome/Firefox/Edge
```

### Common Issues

**Issue: Metro bundler won't start**
```bash
# Clear Metro cache
npm start -- --clear
```

**Issue: Dependencies not installing**
```bash
# Use legacy peer deps flag
npm install --legacy-peer-deps
```

**Issue: iOS build errors**
```bash
# Clear iOS build folder (macOS)
cd ios && pod install && cd ..
npm run ios
```

**Issue: Android build errors**
```bash
# Clean Android build
cd android && ./gradlew clean && cd ..
npm run android
```

## Environment Variables

Create `.env.local` file in root:

```env
# Backend API
EXPO_PUBLIC_API_URL=http://localhost:3001/api

# Stripe (Payment Processing)
EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here

# Feature Flags
EXPO_PUBLIC_ENABLE_PUSH_NOTIFICATIONS=true
```

## Push Notifications Setup

### Development
1. Push notifications work in Expo Go automatically
2. No additional configuration needed for testing

### Production
1. Create EAS project: `eas build:configure`
2. Get project ID from app.json
3. Configure push notification credentials:
   - iOS: APNs key/certificate
   - Android: FCM server key
4. Update app.json with EAS project ID

## Testing

### Manual Testing Checklist
- [ ] Login/Register/Logout flow
- [ ] Payment creation and history
- [ ] Maintenance request with photos
- [ ] Lease document viewing
- [ ] Push notifications receipt
- [ ] Message thread list
- [ ] Profile editing

### Automated Tests (To Be Implemented)
```bash
# Unit tests
npm test

# E2E tests (Detox)
npm run test:e2e
```

## Building for Production

### Configure App Details
Edit `app.json`:
```json
{
  "expo": {
    "name": "Tenant Portal",
    "slug": "tenant-portal-mobile",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.yourcompany.tenantportal",
      "buildNumber": "1"
    },
    "android": {
      "package": "com.yourcompany.tenantportal",
      "versionCode": 1
    }
  }
}
```

### Build with EAS
```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo account
eas login

# Configure build
eas build:configure

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for both
eas build --platform all
```

### Submit to App Stores
```bash
# iOS (requires Apple Developer account)
eas submit --platform ios

# Android (requires Google Play Developer account)
eas submit --platform android
```

## Performance Optimization

### Image Optimization
- Use `expo-image` for better performance
- Implement lazy loading for large lists
- Cache images with expo-file-system

### Bundle Size
- Analyze bundle: `npx react-native-bundle-visualizer`
- Remove unused dependencies
- Use dynamic imports for large features

### Memory Management
- Unsubscribe from listeners in useEffect cleanup
- Use React.memo for expensive components
- Implement FlatList windowing for large lists

## Troubleshooting

### App Crashes on Startup
1. Check console for error messages
2. Verify all dependencies installed
3. Clear Metro cache: `npm start -- --clear`
4. Delete node_modules and reinstall: `rm -rf node_modules && npm install --legacy-peer-deps`

### API Connection Issues
1. Verify backend is running (port 3001)
2. Check EXPO_PUBLIC_API_URL in .env.local
3. Use correct IP address (not localhost) for physical devices
4. Test API endpoints with Postman/Insomnia

### Push Notifications Not Working
1. Verify device permissions granted
2. Check EAS project ID in app.json
3. Test on physical device (simulators have limitations)
4. Review push notification service logs

### Stripe Payment Errors
1. Verify Stripe publishable key in .env.local
2. Check key format (starts with pk_test_ or pk_live_)
3. Ensure backend has matching secret key
4. Test with Stripe test cards

## Best Practices

### Code Style
- Use TypeScript strict mode
- Follow React hooks rules
- Implement error boundaries
- Add PropTypes or TypeScript interfaces

### State Management
- Use Redux for global state
- Use local state for UI-only data
- Implement selectors for derived state
- Avoid prop drilling with Redux

### Navigation
- Use TypeScript for navigation types
- Implement deep linking for notifications
- Handle back button on Android
- Add loading states for screen transitions

### API Calls
- Always handle loading states
- Implement proper error handling
- Use try/catch in async thunks
- Show user-friendly error messages

## Resources

### Documentation
- [Expo Documentation](https://docs.expo.dev/)
- [React Native Documentation](https://reactnative.dev/)
- [Redux Toolkit Documentation](https://redux-toolkit.js.org/)
- [React Navigation Documentation](https://reactnavigation.org/)

### Community
- [Expo Discord](https://discord.gg/expo)
- [React Native Community](https://reactnative.dev/community/overview)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/react-native)

### Tools
- [React DevTools](https://github.com/facebook/react-devtools)
- [Redux DevTools](https://github.com/reduxjs/redux-devtools)
- [Reactotron](https://github.com/infinitered/reactotron)

## Support

For issues or questions:
1. Check this documentation
2. Review error messages in console
3. Search existing GitHub issues
4. Create new issue with reproduction steps

## Next Steps

After getting the app running:
1. ✅ Explore all screens and features
2. ✅ Test authentication flow
3. ✅ Try payment processing (test mode)
4. ✅ Create maintenance requests
5. ✅ Review notification preferences
6. ⏭️ Implement backend API integration
7. ⏭️ Add automated tests
8. ⏭️ Configure for production deployment

---

**Version:** 1.0  
**Last Updated:** November 15, 2025  
**For Questions:** See MVP_COMPLETION_SUMMARY.md
