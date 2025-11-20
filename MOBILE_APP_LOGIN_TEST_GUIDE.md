# Mobile App Login Screen - Testing Guide 📱

**Status:** Ready for Testing  
**Date:** November 15, 2025  
**Servers:** Backend ✅ Running on port 3001 | Mobile ✅ Running on Expo

---

## 🚀 Quick Start

### Servers Status
- ✅ **Backend API:** Running on `http://localhost:3001`
- ✅ **Expo Dev Server:** Running with QR code displayed
- ✅ **Environment:** `.env` configured correctly

### Test Credentials
Use existing backend user:
- **Username:** `admin`
- **Password:** `Admin123!@#`

---

## 📱 Testing Options

### Option 1: Expo Go (Recommended for Quick Testing)
1. **Install Expo Go:**
   - iOS: Download from App Store
   - Android: Download from Google Play Store

2. **Connect to Dev Server:**
   - Open Expo Go app
   - Scan the QR code from terminal
   - OR enter URL: `exp://192.168.0.28:8081`

3. **Wait for App to Load:**
   - Metro bundler will compile JavaScript
   - First load takes 30-60 seconds
   - App will reload automatically

### Option 2: iOS Simulator (Mac Only)
Press `i` in the Expo terminal

### Option 3: Android Emulator
1. Start Android Studio AVD
2. Press `a` in the Expo terminal

### Option 4: Web Browser (Limited Testing)
Press `w` in the Expo terminal  
⚠️ Note: Some native features won't work

---

## ✅ Test Scenarios

### Test 1: Visual Verification
**Goal:** Verify UI renders correctly

**Steps:**
1. App loads and displays login screen
2. Check visual elements:
   - ✅ "Tenant Portal" title centered
   - ✅ "Welcome Back" subtitle
   - ✅ Username input field with icon
   - ✅ Password input field with icon
   - ✅ "Show/Hide" password button
   - ✅ "Remember Me" checkbox
   - ✅ "Sign In" button (blue, prominent)
   - ✅ "Forgot Password?" link
   - ✅ "Don't have an account? Sign Up" link

**Expected Result:** All elements visible and properly styled

---

### Test 2: Form Validation (Client-Side)
**Goal:** Test client-side validation without backend

**Steps:**
1. Click "Sign In" button WITHOUT entering anything
   - **Expected:** Error messages appear:
     - "Username is required"
     - "Password is required"

2. Enter username: `testuser`
3. Enter password: `123` (less than 6 characters)
4. Click "Sign In"
   - **Expected:** "Password must be at least 6 characters"

5. Enter password: `123456` (valid length)
6. Click "Sign In"
   - **Expected:** Loading spinner appears, then backend error

**Expected Result:** All validation errors display correctly

---

### Test 3: Password Visibility Toggle
**Goal:** Test show/hide password functionality

**Steps:**
1. Enter password: `Admin123!@#`
2. Password field shows dots: `•••••••••••`
3. Click "Show" button (eye icon)
   - **Expected:** Password becomes visible: `Admin123!@#`
   - Button changes to "Hide"
4. Click "Hide" button
   - **Expected:** Password becomes dots again

**Expected Result:** Toggle works smoothly

---

### Test 4: Remember Me Functionality
**Goal:** Test checkbox state management

**Steps:**
1. Click "Remember Me" checkbox
   - **Expected:** Checkbox becomes checked (blue checkmark)
2. Click again
   - **Expected:** Checkbox becomes unchecked
3. Check the box and attempt login
   - **Expected:** Redux state stores `rememberMe: true`

**Expected Result:** Checkbox state changes correctly

---

### Test 5: Successful Login (MAIN TEST)
**Goal:** Test full authentication flow with backend

**Steps:**
1. Enter username: `admin`
2. Enter password: `Admin123!@#`
3. Check "Remember Me" (optional)
4. Click "Sign In" button

**Expected Behavior:**
1. Button shows loading spinner
2. Username/password fields disabled
3. API request sent to `http://localhost:3001/api/auth/login`
4. Backend returns JWT token
5. Token saved to secure storage
6. Redux state updates:
   - `isAuthenticated: true`
   - `user: { username: 'admin', ... }`
7. Loading stops

**⚠️ Current Limitation:**
Since navigation is not implemented yet, you'll stay on the login screen. Check the terminal output for success messages.

**Verification:**
- Check Expo terminal for API logs (if debug logging enabled)
- Check backend terminal for `POST /api/auth/login 200`
- No error alerts displayed

---

### Test 6: Failed Login (Invalid Credentials)
**Goal:** Test error handling

**Steps:**
1. Enter username: `wronguser`
2. Enter password: `wrongpassword`
3. Click "Sign In"

**Expected Behavior:**
1. Loading spinner appears
2. API request sent
3. Backend returns 401 error
4. Alert dialog appears: "Login Failed - Invalid credentials"
5. Form fields remain filled
6. Can try again

**Expected Result:** Error message displayed clearly

---

### Test 7: Network Error
**Goal:** Test offline/connection error handling

**Steps:**
1. Stop the backend server (Ctrl+C in backend terminal)
2. Enter valid credentials: `admin` / `Admin123!@#`
3. Click "Sign In"

**Expected Behavior:**
1. Loading spinner appears
2. API request fails (connection refused)
3. Alert dialog: "Login Failed - Network error. Please try again."
4. Can retry when backend is back online

**Expected Result:** Network error handled gracefully

---

### Test 8: Forgot Password Link
**Goal:** Test navigation placeholder

**Steps:**
1. Click "Forgot Password?" link

**Expected Behavior:**
Alert dialog: "Forgot password functionality coming soon!"

**Expected Result:** Alert displays (placeholder working)

---

### Test 9: Sign Up Link
**Goal:** Test navigation placeholder

**Steps:**
1. Click "Don't have an account? Sign Up" text

**Expected Behavior:**
Alert dialog: "Registration screen coming soon!"

**Expected Result:** Alert displays (placeholder working)

---

### Test 10: Keyboard Handling
**Goal:** Test keyboard interactions on mobile

**Steps:**
1. Tap username field
   - **Expected:** Keyboard appears, field focused
2. Type username
3. Tap "Next" or "Return" on keyboard
   - **Expected:** Moves to password field
4. Type password
5. Tap "Done" on keyboard
   - **Expected:** Keyboard dismisses
6. Can still scroll form if keyboard is large

**Expected Result:** Smooth keyboard experience

---

## 🐛 Debugging Tips

### Check Terminal Outputs

**Expo Terminal:**
```bash
# Look for Metro bundler errors
# JavaScript errors appear here
# console.log outputs appear here
```

**Backend Terminal:**
```bash
# API request logs
POST /api/auth/login 200 45ms  # Success
POST /api/auth/login 401 12ms  # Unauthorized
```

### Enable Debug Logging
Already enabled in `.env`:
```
EXPO_PUBLIC_ENABLE_DEBUG_LOGGING=true
```

This logs:
- API requests/responses
- Redux actions
- State changes

### React Native Debugger
Press `j` in Expo terminal to open debugger  
View:
- Console logs
- Network requests
- Redux state tree

### Redux DevTools
1. Shake device (or press `Cmd+D` / `Ctrl+M`)
2. Select "Debug" from menu
3. Open Chrome DevTools
4. View Redux actions and state

---

## 📊 What to Verify

### Redux State (Check with debugger)
After successful login, Redux state should be:
```typescript
{
  auth: {
    isAuthenticated: true,
    isLoading: false,
    error: null,
    user: {
      id: 1,
      username: "admin",
      email: "admin@example.com",
      role: "ADMIN",
      firstName: "Admin",
      lastName: "User"
    },
    rememberMe: true // if checked
  },
  user: {
    profile: {
      id: 1,
      username: "admin",
      email: "admin@example.com",
      // ... other profile data
    },
    isLoading: false,
    error: null
  }
}
```

### Secure Storage
Token should be saved to expo-secure-store  
Key: `auth_token`  
Value: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (JWT token)

### AsyncStorage (Persisted Redux State)
Redux state persisted to AsyncStorage  
Should survive app restart

---

## ✅ Success Criteria

**All tests passing means:**
1. ✅ UI renders correctly on device/simulator
2. ✅ Client-side validation works
3. ✅ Password visibility toggles
4. ✅ Remember me checkbox works
5. ✅ Successful login with valid credentials
6. ✅ Error handling for invalid credentials
7. ✅ Network error handling
8. ✅ Placeholders for forgot password / sign up
9. ✅ Keyboard interactions smooth
10. ✅ Redux state updates correctly
11. ✅ Token saved to secure storage
12. ✅ State persists across app restarts

---

## 🚨 Known Issues/Limitations

### Expected Limitations (Not Bugs)
- ⚠️ **No navigation after login** - Will stay on login screen
  - *Why:* Navigation not implemented yet (Phase 2.8)
  - *Fix:* Coming in next session

- ⚠️ **Forgot password shows alert** - No actual reset flow
  - *Why:* Placeholder until Phase 2.7
  - *Fix:* Will implement forgot password screen

- ⚠️ **Sign up shows alert** - No registration screen
  - *Why:* Registration screen is Phase 2.5
  - *Fix:* Coming next (6 hours work)

- ⚠️ **Package version warnings** - Expo shows version mismatches
  - *Why:* Used specific versions for compatibility
  - *Impact:* App works fine, can ignore for now

### If You Encounter Errors

**"Network Error" even with backend running:**
- Check `.env` has correct URL: `http://localhost:3001/api`
- For physical device, use your computer's IP: `http://192.168.0.28:3001/api`
- Restart Expo dev server: Press `r` or `Ctrl+C` and `npm start`

**"Unable to resolve module":**
- Clear Metro cache: Press `Shift+M` → "Clear Metro bundler cache"
- Restart: `npm start --clear`

**"Redux state not updating":**
- Check Redux DevTools
- Verify backend returned 200 status
- Check console for errors

**"Token not saved":**
- expo-secure-store may not work on web
- Use iOS/Android simulator or physical device

---

## 📸 Screenshots to Capture

If reporting issues, please capture:
1. Login screen (initial state)
2. Validation errors
3. Loading state
4. Success state (if navigation was working, would show home screen)
5. Error alert dialog
6. Terminal output (both Expo and backend)

---

## 🎯 Next Steps After Testing

Once login is verified working:
1. ✅ **Add Navigation** (4 hours)
   - React Navigation setup
   - Auth flow vs Main app flow
   - Proper routing after login

2. ✅ **Build Registration Screen** (6 hours)
   - Multi-step form
   - Validation
   - Terms acceptance

3. ✅ **Add Biometric Auth** (4 hours)
   - Face ID / Touch ID
   - Settings integration

---

## 📞 Support

**Common Questions:**

Q: How do I restart the app?  
A: Press `r` in Expo terminal or shake device → "Reload"

Q: How do I see console logs?  
A: Press `j` to open debugger or check Expo terminal

Q: Can I test on multiple devices?  
A: Yes! Scan QR code on any device on same WiFi network

Q: Does this work offline?  
A: Redux state persists, but login requires backend connection

---

**Testing Started:** November 15, 2025  
**Estimated Testing Time:** 15-30 minutes  
**Backend Status:** ✅ Running  
**Mobile Dev Server:** ✅ Running  

**Ready to test! Follow Test Scenarios 1-10 above.** 🚀
