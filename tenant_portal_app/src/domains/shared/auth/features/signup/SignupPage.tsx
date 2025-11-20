import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Card, CardBody, Input, Progress } from '@nextui-org/react';
import { Eye, EyeOff, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { AuthLayout } from '../../layouts';
import { baseColors } from '../../../../../design-tokens/colors';
import { spacing } from '../../../../../design-tokens/spacing';
import { fontSize, fontWeight } from '../../../../../design-tokens/typography';
import { elevation } from '../../../../../design-tokens/shadows';

interface PasswordPolicy {
  minLength: number;
  requireUppercase: boolean;
  requireLowercase: boolean;
  requireNumber: boolean;
  requireSymbol: boolean;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
}

/**
 * Modern signup page with NextUI components and real-time password validation
 * Features: Password strength indicator, requirement checklist, policy fetching
 */
export const SignupPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role] = useState<'TENANT' | 'PROPERTY_MANAGER'>('TENANT');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [policy, setPolicy] = useState<PasswordPolicy | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const res = await fetch('/api/auth/password-policy');
        if (res.ok) {
          setPolicy(await res.json());
        }
      } catch {
        // Use default policy if fetch fails
        setPolicy({
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumber: true,
          requireSymbol: true,
        });
      }
    };
    fetchPolicy();
  }, []);

  const calculatePasswordStrength = (): number => {
    if (!password) return 0;
    let strength = 0;
    const requirements = getPasswordRequirements();
    const metCount = requirements.filter((r) => r.met).length;
    strength = (metCount / requirements.length) * 100;
    return Math.round(strength);
  };

  const getPasswordRequirements = (): PasswordRequirement[] => {
    if (!policy) return [];

    return [
      {
        label: `At least ${policy.minLength} characters`,
        met: password.length >= policy.minLength,
      },
      {
        label: 'One uppercase letter',
        met: !policy.requireUppercase || /[A-Z]/.test(password),
      },
      {
        label: 'One lowercase letter',
        met: !policy.requireLowercase || /[a-z]/.test(password),
      },
      {
        label: 'One number',
        met: !policy.requireNumber || /\d/.test(password),
      },
      {
        label: 'One special character',
        met: !policy.requireSymbol || /[!@#$%^&*(),.?":{}|<>]/.test(password),
      },
    ].filter((req) => {
      // Only show required checks
      if (req.label.includes('uppercase')) return policy.requireUppercase;
      if (req.label.includes('lowercase')) return policy.requireLowercase;
      if (req.label.includes('number')) return policy.requireNumber;
      if (req.label.includes('special')) return policy.requireSymbol;
      return true; // Always show length requirement
    });
  };

  const getStrengthColor = (strength: number): string => {
    if (strength < 40) return baseColors.danger[500];
    if (strength < 70) return baseColors.warning[500];
    return baseColors.success[500];
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    const requirements = getPasswordRequirements();
    if (!requirements.every((r) => r.met)) {
      setError('Please meet all password requirements');
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password, role }),
      });

      if (!response.ok) {
        let message = 'Signup failed';
        try {
          const errorData = await response.json();
          if (Array.isArray(errorData?.errors)) {
            message = errorData.errors.join(' ');
          } else {
            message = errorData.message || message;
          }
        } catch {
          message = await response.text();
        }
        throw new Error(message || 'Signup failed');
      }

      navigate('/login');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const passwordStrength = calculatePasswordStrength();
  const requirements = getPasswordRequirements();

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Access tenant services, payments, applications, and more"
    >
      <Card shadow="lg" style={{ boxShadow: elevation.card }}>
        <CardBody style={{ padding: spacing[6] }}>
          <form className="space-y-4" onSubmit={handleSignup}>
            {/* Username Input */}
            <Input
              label="Username"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              isRequired
              variant="bordered"
              size="lg"
            />

            {/* Password Input with Strength Indicator */}
            <div className="space-y-2">
              <Input
                label="Password"
                placeholder="Create a strong password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
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

              {/* Password Strength Bar */}
              {password && (
                <div className="space-y-1">
                  <Progress
                    size="sm"
                    value={passwordStrength}
                    color={
                      passwordStrength < 40
                        ? 'danger'
                        : passwordStrength < 70
                        ? 'warning'
                        : 'success'
                    }
                    aria-label="Password strength"
                  />
                  <p
                    style={{
                      fontSize: fontSize.xs,
                      color: getStrengthColor(passwordStrength),
                      fontWeight: fontWeight.medium,
                    }}
                  >
                    {passwordStrength < 40
                      ? 'Weak password'
                      : passwordStrength < 70
                      ? 'Medium strength'
                      : 'Strong password'}
                  </p>
                </div>
              )}
            </div>

            {/* Confirm Password */}
            <Input
              label="Confirm Password"
              placeholder="Re-enter your password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              isRequired
              variant="bordered"
              size="lg"
              endContent={
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="focus:outline-none"
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} style={{ color: baseColors.neutral[400] }} />
                  ) : (
                    <Eye size={20} style={{ color: baseColors.neutral[400] }} />
                  )}
                </button>
              }
            />

            {/* Password Requirements Checklist */}
            {policy && password && (
              <div
                className="rounded-lg p-3"
                style={{
                  backgroundColor: baseColors.primary[50],
                  border: `1px solid ${baseColors.primary[100]}`,
                }}
              >
                <p
                  style={{
                    fontSize: fontSize.sm,
                    fontWeight: fontWeight.semibold,
                    color: baseColors.primary[900],
                    marginBottom: spacing[2],
                  }}
                >
                  Password requirements:
                </p>
                <ul className="space-y-1">
                  {requirements.map((req, index) => (
                    <li key={index} className="flex items-center gap-2">
                      {req.met ? (
                        <CheckCircle2 size={16} style={{ color: baseColors.success[600] }} />
                      ) : (
                        <XCircle size={16} style={{ color: baseColors.neutral[400] }} />
                      )}
                      <span
                        style={{
                          fontSize: fontSize.xs,
                          color: req.met ? baseColors.success[700] : baseColors.neutral[600],
                        }}
                      >
                        {req.label}
                      </span>
                    </li>
                  ))}
                </ul>
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
              {submitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          {/* Footer Link */}
          <div
            className="mt-6 text-center"
            style={{ fontSize: fontSize.sm, color: baseColors.neutral[600] }}
          >
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-medium hover:underline"
              style={{ color: baseColors.primary[600] }}
            >
              Sign in
            </button>
          </div>
        </CardBody>
      </Card>
    </AuthLayout>
  );
};

export default SignupPage;
