# Authentication

The Property Management Suite application has a robust authentication system that supports multiple user roles with JWT token-based authentication, MFA support, and intelligent redirect handling.

## User Roles

The system supports three primary roles with different access levels:

*   **TENANT:** Tenants have access to features such as submitting maintenance requests, viewing their lease and payment history, and communicating with property managers.
*   **PROPERTY_MANAGER:** Property managers have access to all tenant features, as well as features for managing properties, leases, rental applications, and expenses.
*   **ADMIN:** Administrators have full system access including user management and audit logs.

## Signing Up

To create a new account:

1. Navigate to the signup page (`/signup`)
2. Enter required information:
   - Username
   - Email address
   - Password (must meet security requirements)
   - Confirm password
3. Select your role (if applicable)
4. Accept terms and conditions
5. Click "Sign Up"

After successful registration:
- A new user account is created with the selected role (default: `TENANT`)
- You are automatically logged in
- Redirected to your role-specific dashboard

## Logging In

### Standard Login Flow

1. Navigate to the login page (`/login`)
2. Enter your username and password
3. Complete MFA if enabled (see Multi-Factor Authentication below)
4. Click "Sign In"

**On Success:**
- JWT access token is stored securely
- User is redirected to their dashboard (`/dashboard`)
- Session timeout is configured (token expiration)

### Login with Redirect (New Feature)

When you attempt to access a protected page while not logged in, the system now preserves your intended destination:

**Example Flow:**
1. You click a link to `/my-lease` (protected route)
2. `RequireAuth` guard detects you're not logged in
3. You're redirected to `/login?redirect=/my-lease`
4. You complete the login process
5. **You're automatically taken to `/my-lease`** (your original destination)

**Benefits:**
- No need to navigate back to where you were going
- Seamless user experience
- Preserves workflow continuity

**Technical Implementation:**
```tsx
// RequireAuth guard adds redirect parameter
const params = new URLSearchParams({ redirect: location.pathname });
return <Navigate to={`/login?${params}`} replace />;

// LoginPage reads and honors the parameter
const [searchParams] = useSearchParams();
const redirectUrl = searchParams.get('redirect') || '/';
// After successful login:
navigate(redirectUrl);
```

## Multi-Factor Authentication (MFA)

MFA provides an additional layer of security for your account.

### Enabling MFA
1. Navigate to your account settings
2. Click "Enable Two-Factor Authentication"
3. Scan the QR code with your authenticator app (Google Authenticator, Authy, etc.)
4. Enter the 6-digit code to verify
5. Save your backup codes in a safe place

### Logging In with MFA
When MFA is enabled, the login process includes an additional step:
1. Enter username and password
2. **MFA prompt appears**
3. Open your authenticator app
4. Enter the current 6-digit code
5. Click "Verify"

**Backup Codes:**
If you lose access to your authenticator app, use one of your backup codes instead of the 6-digit code.

## Route Guards

The authentication system uses two types of route guards to protect pages:

### RequireAuth Guard
Ensures user is authenticated (has valid JWT token).

**What it does:**
- Checks if JWT token exists in AuthContext
- Validates token hasn't expired
- Adds `?redirect=` parameter for login flow
- Redirects to `/login` if not authenticated

**Example:**
```tsx
<Route element={<RequireAuth />}>
  <Route path="/my-lease" element={<MyLeasePage />} />
</Route>
```

### RequireRole Guard
Ensures authenticated user has required role(s).

**What it does:**
- Checks user's role against allowed roles
- Redirects to `/unauthorized` if role doesn't match
- Preserves location state for error messaging

**Example:**
```tsx
<Route element={<RequireRole allowedRoles={['tenant']} />}>
  <Route path="/my-lease" element={<MyLeasePage />} />
</Route>
```

## Token Management

### JWT Token Lifecycle

**Token Storage:**
- Stored in AuthContext (React Context API)
- Not persisted to localStorage for security
- Token includes: user ID, role, expiration time

**Token Expiration:**
- Default expiration: 24 hours
- Auto-logout when token expires
- Redirect to login with original destination preserved

**Token Refresh:**
(Future enhancement)
- Automatic token refresh before expiration
- Seamless session extension
- Configurable refresh window

### Automatic Logout

The system automatically logs you out when:
1. **Token Expires**: After the configured expiration time
2. **Manual Logout**: You click "Logout"
3. **Security Event**: Suspicious activity detected (future enhancement)

**Logout Behavior:**
```tsx
const logout = () => {
  setToken(null);
  setUser(null);
  navigate('/login');
};
```

## Password Management

### Password Requirements
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character (@, $, !, %, *, ?, &)

### Forgot Password Flow

1. Navigate to login page
2. Click "Forgot Password?"
3. Enter your email address
4. Click "Send Reset Link"
5. Check your email for password reset link
6. Click the link (valid for 1 hour)
7. Enter new password
8. Confirm new password
9. Click "Reset Password"
10. Redirected to login page

**Security Features:**
- Reset tokens expire after 1 hour
- One-time use tokens
- Email verification required
- Password strength validation

## Session Management

### Session Duration
- Default: 24 hours (token expiration)
- Configurable per environment
- Extended sessions for "Remember Me" (future enhancement)

### Session Security
- HTTPS required in production
- Secure cookie flags
- CSRF protection
- XSS prevention through content security policy

## Protected Routes by Role

### Tenant Routes
Require authentication + `role: 'tenant'`
- `/dashboard` - Tenant dashboard
- `/my-lease` - Lease details
- `/maintenance` - Maintenance requests
- `/payments` - Payment history
- `/messages` - Messaging
- `/inspections` - Inspection schedule

### Property Manager Routes
Require authentication + `role: 'property_manager'` or `'admin'`
- `/dashboard` - Property manager dashboard
- `/properties` - Property management
- `/leases` - Lease management
- `/maintenance-dashboard` - Maintenance queue
- `/rental-applications-management` - Application review
- `/expense-tracker` - Expense tracking
- `/documents` - Document management
- `/reports` - Analytics and reports

### Admin Routes
Require authentication + `role: 'admin'`
- `/user-management` - User administration
- `/audit-log` - System audit trail

## Error Handling

### Unauthorized Access (403)
When you try to access a page your role doesn't permit:
- Redirected to `/unauthorized`
- Shows your current role
- Shows the required role(s)
- Provides link to dashboard
- Contact support option

### Authentication Required (401)
When you try to access a protected page without logging in:
- Redirected to `/login?redirect=/original-path`
- Login form displays
- After login, automatically returned to original destination

### Token Expired
When your session expires:
- Automatic logout triggered
- Redirected to `/login`
- Message: "Your session has expired. Please log in again."
- Original destination preserved in redirect parameter

## Security Best Practices

### For Users
1. **Use Strong Passwords**: Follow password requirements
2. **Enable MFA**: Add extra security layer
3. **Don't Share Credentials**: Keep login information private
4. **Log Out on Shared Devices**: Always log out when finished
5. **Keep Backup Codes Safe**: Store MFA backup codes securely

### For Developers
1. **Never Store Tokens in localStorage**: Use memory/context only
2. **Validate on Server Side**: Don't trust client-side validation
3. **Use HTTPS**: Encrypt all traffic
4. **Implement Rate Limiting**: Prevent brute force attacks
5. **Log Security Events**: Track authentication attempts

## API Endpoints

```typescript
// Login
POST /api/auth/login
Body: { username: string, password: string, mfaCode?: string }
Response: { access_token: string, user: User }

// Signup
POST /api/auth/signup
Body: { username: string, email: string, password: string }
Response: { access_token: string, user: User }

// Logout
POST /api/auth/logout
Response: { success: boolean }

// Forgot Password
POST /api/auth/forgot-password
Body: { email: string }
Response: { message: string }

// Reset Password
POST /api/auth/reset-password
Body: { token: string, password: string }
Response: { success: boolean }

// Verify Token
GET /api/auth/verify
Headers: { Authorization: 'Bearer <token>' }
Response: { valid: boolean, user: User }
```

## Troubleshooting

### "Invalid credentials" error
- Double-check username and password
- Ensure Caps Lock is off
- Try password reset if forgotten

### MFA code not working
- Ensure device time is synchronized
- Try the next code that appears
- Use a backup code if available
- Contact support to reset MFA

### Stuck in redirect loop
- Clear browser cache and cookies
- Ensure JavaScript is enabled
- Try incognito/private browsing mode
- Check browser console for errors

### Session expires too quickly
- Token expiration is configured server-side
- Contact administrator to adjust session duration
- Use "Remember Me" when available (future enhancement)

## Related Documentation
- [Routing System](Routing-System.md) - Route guards and navigation
- [User Management](User-Management.md) - Admin user management (future)
- [Security](Security.md) - Security policies and compliance (future)
