
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from './services/apiClient';

const SignupPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'TENANT' | 'PROPERTY_MANAGER'>('TENANT');
  const [policy, setPolicy] = useState<{
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumber: boolean;
    requireSymbol: boolean;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchPolicy = async () => {
      try {
        const data = await apiFetch('/auth/password-policy');
        setPolicy(data);
      } catch {
        // ignore policy fetch errors
      }
    };
    fetchPolicy();
  }, []);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await apiFetch('/auth/register', {
        method: 'POST',
        body: { username, password, role },
      });
      navigate('/login');
    } catch (err: any) {
      // apiFetch throws errors with message, extract it if it's a structured error
      let message = err.message || 'Signup failed';
      if (typeof err.message === 'string' && err.message.includes('{')) {
        try {
          const errorData = JSON.parse(err.message.split(' - ')[1] || '{}');
          if (Array.isArray(errorData?.errors)) {
            message = errorData.errors.join(' ');
          } else if (errorData.message) {
            message = errorData.message;
          }
        } catch {
          // Use original message if parsing fails
        }
      }
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-gray-900">Create your account</h1>
          <p className="mt-2 text-sm text-gray-600">
            Access tenant services, payments, applications, and more.
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-lg ring-1 ring-gray-100">
          <form className="space-y-4" onSubmit={handleSignup}>
            <div>
              <input
                id="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="Username"
                aria-label="Username"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <select
                id="role"
                value={role}
                onChange={(event) => setRole(event.target.value as 'TENANT' | 'PROPERTY_MANAGER')}
                aria-label="Account Type"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              >
                <option value="TENANT">Tenant - Access rental applications, lease info, and payments</option>
                <option value="PROPERTY_MANAGER">Property Manager - Manage properties, tenants, and maintenance</option>
              </select>
            </div>
            <div>
              <input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                aria-label="Password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            {policy && (
              <div className="rounded-md border border-indigo-100 bg-indigo-50 px-3 py-2 text-xs text-indigo-700">
                <p className="font-semibold text-indigo-800">Password requirements</p>
                <ul className="mt-2 space-y-1">
                  <li>• Minimum length of {policy.minLength} characters</li>
                  <li>• {policy.requireUppercase ? 'At least one uppercase letter' : 'Uppercase letters optional'}</li>
                  <li>• {policy.requireLowercase ? 'At least one lowercase letter' : 'Lowercase letters optional'}</li>
                  <li>• {policy.requireNumber ? 'At least one number' : 'Numbers optional'}</li>
                  <li>• {policy.requireSymbol ? 'At least one symbol' : 'Symbols optional'}</li>
                </ul>
              </div>
            )}

            {error && (
              <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:bg-indigo-300"
            >
              {submitting ? 'Creating account…' : 'Create account'}
            </button>
          </form>
          <div className="mt-6 text-center text-sm text-gray-600">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              Sign in
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignupPage;
