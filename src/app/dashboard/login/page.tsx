/**
 * Tenant Admin Login Page
 * 
 * Login page for tenant store admins and staff
 * Accessible via tenant subdomain at /dashboard/login
 * 
 * This is separate from customer login (/customer-login) to clearly differentiate
 * between store admin access and customer access.
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function TenantAdminLoginPage() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tempSession, setTempSession] = useState<any>(null);
  const [mfaCode, setMfaCode] = useState('');

  // Only fetch tenant name after component mounts to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
    
    async function fetchTenantName() {
      try {
        const response = await fetch('/api/tenant/current');
        if (response.ok) {
          const data = await response.json();
          setTenantName(data.tenant?.name || null);
        }
      } catch (err) {
        // Ignore errors - tenant name is optional for login page
      }
    }
    fetchTenantName();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // If 2FA is required, verify the code
      if (requiresMFA && userId) {
        console.log('[Login Client] ========================================');
        console.log('[Login Client] Starting MFA verification');
        console.log('[Login Client] userId:', userId);
        console.log('[Login Client] tempSession exists:', !!tempSession);
        console.log('[Login Client] tempSession.access_token exists:', !!tempSession?.access_token);
        console.log('[Login Client] tempSession.refresh_token exists:', !!tempSession?.refresh_token);
        console.log('[Login Client] tempSession.expires_at:', tempSession?.expires_at);
        
        // Check if temp session might be expired
        if (tempSession?.expires_at) {
          const expiresAt = new Date(tempSession.expires_at * 1000);
          const now = new Date();
          console.log('[Login Client] Token expires at:', expiresAt.toISOString());
          console.log('[Login Client] Current time:', now.toISOString());
          console.log('[Login Client] Token expired:', now > expiresAt);
          if (now > expiresAt) {
            console.warn('[Login Client] ⚠️ Token appears to be expired!');
          }
        }

        // Use redirect: 'manual' to handle 302 redirects ourselves
        // This ensures cookies are properly set before navigation
        const response = await fetch('/api/auth/tenant/mfa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          redirect: 'manual', // Don't auto-follow redirects
          body: JSON.stringify({
            userId,
            code: mfaCode,
            tempSession,
          }),
        });

        console.log('[Login Client] MFA verify response received');
        console.log('[Login Client] response.type:', response.type);
        console.log('[Login Client] response.status:', response.status);
        console.log('[Login Client] response.ok:', response.ok);
        console.log('[Login Client] response.url:', response.url);
        console.log('[Login Client] response.redirected:', response.redirected);

        // Handle 302 redirect response (opaque redirect with redirect: 'manual')
        // Status 0 with type 'opaqueredirect' means redirect was returned
        if (response.type === 'opaqueredirect') {
          console.log('[Login Client] ✅ Received opaque redirect - MFA successful');
          console.log('[Login Client] Waiting 150ms for cookie processing...');
          // Cookies should be set from the 302 response
          // Small delay to ensure cookies are processed by the browser
          await new Promise(resolve => setTimeout(resolve, 150));
          console.log('[Login Client] Navigating to /dashboard');
          setIsLoading(false);
          window.location.href = '/dashboard';
          return;
        }

        // Parse response body for all other cases
        console.log('[Login Client] Parsing response body...');
        const data = await response.json().catch((err) => {
          console.error('[Login Client] Failed to parse response as JSON:', err);
          return {};
        });
        console.log('[Login Client] Response data:', JSON.stringify(data, null, 2));

        // If server returned success JSON (fallback path without redirect)
        if (response.ok && data.success) {
          console.log('[Login Client] ✅ Success response (JSON path) - navigating to dashboard');
          setIsLoading(false);
          window.location.href = '/dashboard';
          return;
        }

        // Handle error responses
        if (!response.ok || data.error) {
          console.error('[Login Client] ❌ Error response received');
          console.error('[Login Client] Status:', response.status);
          console.error('[Login Client] Error:', data.error);
          console.error('[Login Client] Message:', data.message);
          
          const errorMsg = data.message || data.error || 'Invalid code. Please try again.';
          // Check for session expiry hints
          if (errorMsg.includes('session') || errorMsg.includes('expired') || errorMsg.includes('try logging in again')) {
            console.error('[Login Client] Session expired - resetting MFA state');
            setError('Your session has expired. Please log in again.');
            // Reset MFA state to go back to password entry
            setRequiresMFA(false);
            setUserId(null);
            setTempSession(null);
          } else {
            setError(errorMsg);
          }
          setMfaCode('');
          setIsLoading(false);
          return;
        }
        
        console.log('[Login Client] ========================================');
      }

      // Initial login (password only)
      const response = await fetch('/api/auth/tenant/login', {
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

      // 2FA is ALWAYS required for tenant admin accounts
      // The API will always return requiresMFA: true for tenant admins
      if (data.requiresMFA && data.userId) {
        console.log('[Login Client] ========================================');
        console.log('[Login Client] Password verified, MFA required');
        console.log('[Login Client] userId:', data.userId);
        console.log('[Login Client] tempSession received:', !!data.tempSession);
        if (data.tempSession) {
          console.log('[Login Client] tempSession.access_token:', data.tempSession.access_token ? `${data.tempSession.access_token.substring(0, 20)}...` : 'MISSING');
          console.log('[Login Client] tempSession.refresh_token:', data.tempSession.refresh_token ? 'present' : 'MISSING');
          console.log('[Login Client] tempSession.expires_at:', data.tempSession.expires_at);
          if (data.tempSession.expires_at) {
            const expiresAt = new Date(data.tempSession.expires_at * 1000);
            console.log('[Login Client] Token expires at:', expiresAt.toISOString());
            console.log('[Login Client] Time until expiry:', Math.round((expiresAt.getTime() - Date.now()) / 1000 / 60), 'minutes');
          }
        } else {
          console.error('[Login Client] ⚠️ NO TEMP SESSION RECEIVED - MFA will fail!');
        }
        console.log('[Login Client] ========================================');
        
        setRequiresMFA(true);
        setUserId(data.userId);
        setTempSession(data.tempSession); // Store temporary session
        setError(null); // Clear any previous errors
        return;
      }

      // This should never happen for tenant admins (2FA is mandatory)
      // But handle it gracefully just in case
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Show consistent content on initial render to prevent hydration issues
  if (!isMounted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Store Admin Login
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Sign in to access your store dashboard
            </p>
          </div>

          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-4">
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
                {isLoading ? 'Signing in...' : 'Sign in to Dashboard'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Store Admin Dashboard
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {tenantName 
              ? `Sign in to manage ${tenantName}` 
              : 'Sign in to access your store dashboard'}
          </p>
          <p className="mt-1 text-center text-xs text-gray-500">
            For store owners and staff only
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
                        const response = await fetch('/api/auth/tenant/mfa/send-code', {
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
              {isLoading ? 'Signing in...' : 'Sign in to Dashboard'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Are you a customer?{' '}
            <Link href="/customer-login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in here
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
