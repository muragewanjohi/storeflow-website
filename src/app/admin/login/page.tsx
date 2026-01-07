/**
 * Landlord Login Page
 * 
 * Login page for landlord (admin) users
 */

'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LandlordLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tempSession, setTempSession] = useState<any>(null);
  const [mfaCode, setMfaCode] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // If 2FA is required, verify the code
      if (requiresMFA && userId) {
        const response = await fetch('/api/auth/landlord/mfa/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId, 
            code: mfaCode,
            tempSession, // Pass the temporary session from initial login
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || data.error || 'Invalid code. Please try again.');
          setMfaCode(''); // Clear code on error
          return;
        }

        // If session is returned, set it in Supabase client
        if (data.session && data.session.access_token) {
          // Set the session in Supabase
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token || '',
          });
        }

        // 2FA verified - redirect to dashboard
        router.push('/admin/dashboard');
        router.refresh();
        return;
      }

      // Initial login (password only)
      const response = await fetch('/api/auth/landlord/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || data.error || 'Login failed');
        return;
      }

      // 2FA is ALWAYS required for landlord accounts
      // The API will always return requiresMFA: true for landlords
      if (data.requiresMFA && data.userId) {
        setRequiresMFA(true);
        setUserId(data.userId);
        setTempSession(data.tempSession); // Store temporary session
        setError(null); // Clear any previous errors
        return;
      }

      // This should never happen for landlords (2FA is mandatory)
      // But handle it gracefully just in case
      router.push('/admin/dashboard');
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Landlord Login
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in to your admin account
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {!requiresMFA ? (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                    Email address
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                    Password
                  </label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              </>
            ) : (
              <div className="space-y-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5 mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-semibold text-blue-900 mb-1">Two-Factor Authentication Required</h3>
                      <p className="text-sm text-blue-800">
                        Enter the 6-digit code sent to your email to complete login.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="mfaCode" className="block text-sm font-medium text-gray-700 mb-2">
                    Authentication Code
                  </label>
                  <input
                    id="mfaCode"
                    name="mfaCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                    value={mfaCode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setMfaCode(value);
                    }}
                    className="block w-full rounded-md border border-gray-300 px-3 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none focus:ring-blue-500 text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-gray-500">
                    Check your email inbox for the 6-digit code. It may take a few moments to arrive.
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setRequiresMFA(false);
                      setUserId(null);
                      setTempSession(null);
                      setMfaCode('');
                      setError(null);
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    ← Back to password
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!userId) return;
                      try {
                        const response = await fetch('/api/auth/landlord/mfa/send-code', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId, email }),
                        });
                        const data = await response.json();
                        if (response.ok) {
                          setError(null);
                          // Show success message
                          alert('A new code has been sent to your email.');
                        } else {
                          setError(data.message || 'Failed to resend code');
                        }
                      } catch (err) {
                        setError('Failed to resend code');
                      }
                    }}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Resend code
                  </button>
                </div>
              </div>
            )}
          </div>

          <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
            )}
            {isLoading ? 'Signing in...' : 'Sign in'}
          </button>
          </div>

        </form>
      </div>
    </div>
  );
}

