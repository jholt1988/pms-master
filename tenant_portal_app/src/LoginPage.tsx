
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { apiFetch } from './services/apiClient';

/**
 * The login page component.
 * It provides a form for users to enter their credentials and log in to the application.
 * It also includes links to the signup and rental application pages.
 */
export default function LoginPage(): React.ReactElement {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaRequired, setMfaRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setMfaRequired(false);
    setSubmitting(true);

    try {
      const data = await apiFetch(`auth/login`, {
        method: 'POST',
        body: { username, password, mfaCode: mfaCode || undefined },
      });

      if (data.access_token) {
        login(data.access_token);
      }
    } catch (err: any) {
      if (err.message && err.message.toLowerCase().includes('mfa')) {
        setMfaRequired(true);
      }
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to manage maintenance, payments, and more.
          </p>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-lg ring-1 ring-gray-100">
          <form className="space-y-4" onSubmit={handleLogin}>
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
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                aria-label="Password"
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            {mfaRequired && (
              <div>
                <input
                  id="mfa"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  value={mfaCode}
                  onChange={(event) => setMfaCode(event.target.value)}
                  placeholder="MFA code"
                  aria-label="MFA code"
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Enter the multi-factor authentication code sent to your device.
                </p>
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
              aria-label={submitting ? 'Signing in' : 'Sign in'}
            >
              {submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <div className="mt-6 space-y-2 text-center text-sm text-gray-600">
            <p>
              <Link to="/forgot-password" className="font-medium text-indigo-600 hover:text-indigo-500">
                Forgot password?
              </Link>
            </p>
            <p>
              New here?{' '}
              <Link to="/signup" className="font-medium text-indigo-600 hover:text-indigo-500">
                Create an account
              </Link>
            </p>
            <p>
              Applying for a unit?{' '}
              <Link to="/rental-application" className="font-medium text-indigo-600 hover:text-indigo-500">
                Submit an application
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
