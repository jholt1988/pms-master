import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Input } from '@nextui-org/react';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../../../../../AuthContext';
import { AuthLayout } from '../../layouts';
import { apiFetch } from "../../../../../services/apiClient";

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
      const data = await apiFetch('/auth/login', {
        method: 'POST',
        body: { username, password, mfaCode: mfaCode || undefined },
      });

      if (data.access_token) {
        login(data.access_token);
        // Wait for auth state to update, then redirect
        // Use a small delay to ensure token is stored and state is updated
        await new Promise(resolve => setTimeout(resolve, 50));
        navigate(redirectUrl || '/dashboard', { replace: true });
      }
    } catch (err: unknown) {
      let message = 'Login failed';
      
      // Extract error message
      if (err instanceof Error) {
        message = err.message;
      } else if (typeof err === 'string') {
        message = err;
      }
      
      // Extract message from error response
      if (typeof message === 'string' && message.includes(' - ')) {
        try {
          const errorText = message.split(' - ')[1];
          const errorData = JSON.parse(errorText);
          message = errorData.message || message;
        } catch {
          // Use original message if parsing fails
        }
      }

      if (message && message.toLowerCase().includes('mfa')) {
        setMfaRequired(true);
      }

      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to manage maintenance, payments, and more"
    >
      <div className="relative overflow-hidden rounded-2xl bg-glass-surface backdrop-blur-xl border border-t-glass-highlight border-b-0 border-r-glass-border border-l-glass-border shadow-[0_0_30px_-5px_rgba(0,240,255,0.3)] border-neon-blue/30">
        {/* Grid pattern overlay */}
        <div className="pointer-events-none absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="relative z-10 p-6">
          <form className="space-y-4" onSubmit={handleLogin}>
            {/* Username Input */}
            <Input
              label=""
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              isRequired
              variant="bordered"
              size="lg"
              classNames={{
                base: "mb-4",
                input: "text-white",
                inputWrapper: "bg-black/20 border-white/10 hover:border-neon-blue/30 focus-within:border-neon-blue/50",
                label: "text-gray-300",
              }}
            />

            {/* Password Input with Toggle */}
            <Input
              label=""
              placeholder="Enter your password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              isRequired
              variant="bordered"
              size="lg"
              classNames={{
                base: "mb-4",
                input: "text-white",
                inputWrapper: "bg-black/20 border-white/10 hover:border-neon-blue/30 focus-within:border-neon-blue/50",
                label: "text-gray-300",
              }}
              endContent={
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="focus:outline-none text-gray-400 hover:text-neon-blue transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              }
            />

            {/* MFA Code Input (conditional) */}
            {mfaRequired && (
              <div className="mb-4">
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
                  classNames={{
                    base: "mb-4",
                    input: "text-white",
                    inputWrapper: "bg-black/20 border-white/10 hover:border-neon-blue/30 focus-within:border-neon-blue/50",
                    label: "text-gray-300",
                    description: "text-gray-400",
                  }}
                />
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 rounded-lg p-3 bg-neon-pink/10 border border-neon-pink/30 mb-4">
                <AlertCircle size={20} className="text-neon-pink shrink-0" />
                <p className="text-sm text-neon-pink">
                  {error}
                </p>
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              size="lg"
              fullWidth
              isLoading={submitting}
              className="bg-neon-blue/20 border border-neon-blue/50 text-neon-blue hover:bg-neon-blue/30 hover:border-neon-blue font-semibold transition-all"
            >
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 space-y-3 text-center text-sm">
            <div>
              <Link
                to="/forgot-password"
                className="font-medium hover:underline text-neon-blue hover:text-neon-blue/80 transition-colors"
              >
                Forgot password?
              </Link>
            </div>
            
            <div className="text-gray-400">
              New here?{' '}
              <Link
                to="/signup"
                className="font-medium hover:underline text-neon-blue hover:text-neon-blue/80 transition-colors"
              >
                Create an account
              </Link>
            </div>

            <div className="text-gray-400">
              Applying for a unit?{' '}
              <Link
                to="/rental-application"
                className="font-medium hover:underline text-neon-blue hover:text-neon-blue/80 transition-colors"
              >
                Submit an application
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
};

export default LoginPage;
