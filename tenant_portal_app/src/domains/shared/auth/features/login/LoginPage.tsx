import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card, CardBody, Input } from '@nextui-org/react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../../../AuthContext';
import { AuthLayout } from '../../layouts';
import { baseColors } from '../../../../../design-tokens/colors';
import { spacing } from '../../../../../design-tokens/spacing';
import { fontSize, fontWeight } from '../../../../../design-tokens/typography';
import { elevation } from '../../../../../design-tokens/shadows';

/**
 * Modern login page with NextUI components and design tokens
 * Features: MFA support, password visibility toggle, enhanced error states
 */
export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get the redirect URL from query params (set by RequireAuth guard)
  const redirectUrl = searchParams.get('redirect') || '/';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMfaRequired(false);
    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, mfaCode: mfaCode || undefined }),
      });

      if (!response.ok) {
        let message = 'Login failed';
        try {
          const errorData = await response.json();
          message = errorData.message || message;
        } catch {
          message = await response.text();
        }

        if (message && message.toLowerCase().includes('mfa')) {
          setMfaRequired(true);
        }

        throw new Error(message || 'Login failed');
      }

      const data = await response.json();
      if (data.access_token) {
        login(data.access_token);
        // Redirect to the original destination or dashboard after successful login
        navigate(redirectUrl);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage maintenance, payments, and more"
    >
      <Card shadow="lg" style={{ boxShadow: elevation.card }}>
        <CardBody style={{ padding: spacing[6] }}>
          <form className="space-y-4" onSubmit={handleLogin}>
            {/* Username Input */}
            <Input
              label="Username"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              isRequired
              variant="bordered"
              size="lg"
            />

            {/* Password Input with Toggle */}
            <Input
              label="Password"
              placeholder="Enter your password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              isRequired
              variant="bordered"
              size="lg"
              endContent={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="focus:outline-none"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={20} style={{ color: baseColors.neutral[400] }} />
                  ) : (
                    <Eye size={20} style={{ color: baseColors.neutral[400] }} />
                  )}
                </button>
              }
            />

            {/* MFA Code Input (conditional) */}
            {mfaRequired && (
              <div>
                <Input
                  label="MFA Code"
                  placeholder="Enter 6-digit code"
                  type="text"
                  inputMode="numeric"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value)}
                  autoComplete="one-time-code"
                  isRequired
                  variant="bordered"
                  size="lg"
                  description="Enter the multi-factor authentication code sent to your device"
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                className="flex items-start gap-2 rounded-lg p-3"
                style={{
                  backgroundColor: baseColors.danger[50],
                  border: `1px solid ${baseColors.danger[200]}`,
                }}
              >
                <AlertCircle size={20} style={{ color: baseColors.danger[600], flexShrink: 0 }} />
                <p style={{ fontSize: fontSize.sm, color: baseColors.danger[700] }}>
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              color="primary"
              size="lg"
              fullWidth
              isLoading={submitting}
              style={{
                fontSize: fontSize.sm,
                fontWeight: fontWeight.semibold,
              }}
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* Footer Links */}
          <div
            className="mt-6 space-y-3 text-center"
            style={{ fontSize: fontSize.sm }}
          >
            <div>
              <Link
                to="/forgot-password"
                className="font-medium hover:underline"
                style={{ color: baseColors.primary[600] }}
              >
                Forgot password?
              </Link>
            </div>
            
            <div style={{ color: baseColors.neutral[600] }}>
              New here?{' '}
              <Link
                to="/signup"
                className="font-medium hover:underline"
                style={{ color: baseColors.primary[600] }}
              >
                Create an account
              </Link>
            </div>

            <div style={{ color: baseColors.neutral[600] }}>
              Applying for a unit?{' '}
              <Link
                to="/rental-application"
                className="font-medium hover:underline"
                style={{ color: baseColors.primary[600] }}
              >
                Submit an application
              </Link>
            </div>
          </div>
        </CardBody>
      </Card>
    </AuthLayout>
  );
};

export default LoginPage;
