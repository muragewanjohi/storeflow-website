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

// Prevent Next.js from trying to render this as a server component
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateDeviceFingerprint, generateDeviceName, parseUserAgent } from '@/lib/auth/device-fingerprint';

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
  const [trustDevice, setTrustDevice] = useState(false);
  const [deviceFingerprint, setDeviceFingerprint] = useState<string | null>(null);
  const [deviceInfo, setDeviceInfo] = useState<{ deviceName: string; browserInfo: string; osInfo: string } | null>(null);

  // Only fetch tenant name after component mounts to prevent hydration issues
  useEffect(() => {
    setIsMounted(true);
    
    // Generate device fingerprint and info
    try {
      const fingerprint = generateDeviceFingerprint();
      const userAgent = navigator.userAgent;
      const { browser, os } = parseUserAgent(userAgent);
      const deviceName = generateDeviceName(userAgent);
      
      setDeviceFingerprint(fingerprint);
      setDeviceInfo({
        deviceName,
        browserInfo: browser,
        osInfo: os,
      });
    } catch (err) {
      console.error('Failed to generate device fingerprint:', err);
    }
    
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

    console.log('[Login] Form submitted', {
      requiresMFA,
      userId,
      hasEmail: !!email,
      hasPassword: !!password,
      hasMfaCode: !!mfaCode,
      deviceFingerprint: !!deviceFingerprint,
    });

    try {
      // If 2FA is required, verify the code
      if (requiresMFA && userId) {
        console.log('[Login] Starting MFA verification', {
          userId,
          codeLength: mfaCode.length,
          hasTempSession: !!tempSession,
        });
        
        const verifyResponse = await fetch('/api/auth/tenant/mfa/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            userId, 
            code: mfaCode,
            tempSession, // Pass the temporary session from initial login
            trustDevice: trustDevice && !!deviceFingerprint,
            deviceFingerprint: deviceFingerprint || undefined,
            deviceName: deviceInfo?.deviceName,
            browserInfo: deviceInfo?.browserInfo,
            osInfo: deviceInfo?.osInfo,
          }),
        });

        const data = await verifyResponse.json();

        if (!verifyResponse.ok) {
          console.error('[Login] MFA verification failed', {
            status: verifyResponse.status,
            error: data.error,
            message: data.message,
          });
          setError(data.message || data.error || 'Invalid code. Please try again.');
          setMfaCode(''); // Clear code on error
          setIsLoading(false);
          return;
        }

        // If session is returned, set it in Supabase client (same as landlord login)
        if (data.session && data.session.access_token) {
          // Set the session in Supabase
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token || '',
          });

          if (sessionError || !sessionData.session) {
            console.error('[Login] Failed to set session:', sessionError);
            setError('Failed to establish session. Please try again.');
            setIsLoading(false);
            return;
          }

          // Verify session is accessible before redirecting
          const { data: { user }, error: userError } = await supabase.auth.getUser();
          if (userError || !user) {
            console.error('[Login] Session verification failed:', userError);
            setError('Session verification failed. Please try again.');
            setIsLoading(false);
            return;
          }

          console.log('[Login] Session set and verified', {
            userId: user.id,
            email: user.email,
            role: user.user_metadata?.role,
          });

          // Small delay to ensure cookies are fully set before redirect
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        // 2FA verified - redirect to dashboard
        // Use window.location.href for full page reload to ensure cookies are available
        // This ensures the server-side layout can read the cookies
        setIsLoading(false);
        console.log('[Login] Redirecting to dashboard...');
        window.location.href = '/dashboard';
        return;
      }

      // Initial login (password only)
      console.log('[Login] Starting initial login request', {
        email,
        hasPassword: !!password,
        deviceFingerprint: !!deviceFingerprint,
        trustDevice,
      });

      const response = await fetch('/api/auth/tenant/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          email, 
          password,
          deviceFingerprint: deviceFingerprint || undefined,
          deviceName: deviceInfo?.deviceName,
          browserInfo: deviceInfo?.browserInfo,
          osInfo: deviceInfo?.osInfo,
          trustDevice: trustDevice && !!deviceFingerprint, // Only trust if fingerprint available
        }),
      });

      console.log('[Login] Login response received', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries()),
      });

      const data = await response.json().catch(async (parseError) => {
        console.error('[Login] Failed to parse response as JSON', parseError);
        const text = await response.text().catch(() => 'Unable to read response');
        console.error('[Login] Response text', text);
        throw new Error('Invalid response from server');
      });

      console.log('[Login] Login response data', {
        success: data.success,
        requiresMFA: data.requiresMFA,
        userId: data.userId,
        hasTempSession: !!data.tempSession,
        error: data.error,
        message: data.message,
      });

      if (!response.ok) {
        console.error('[Login] Login failed', {
          status: response.status,
          error: data.error,
          message: data.message,
          details: data.details,
        });
        setError(data.message || data.error || 'Login failed');
        setIsLoading(false);
        return;
      }

      // If device is trusted, skip 2FA and redirect directly
      if (data.success && !data.requiresMFA) {
        // Device is trusted - session is already set, just redirect
        window.location.href = '/dashboard';
        return;
      }

      // 2FA is ALWAYS required for tenant admin accounts
      // The API will always return requiresMFA: true for tenant admins
      if (data.requiresMFA && data.userId) {
        console.log('[Login] 2FA required, switching to MFA input', {
          userId: data.userId,
          email: data.email,
          hasTempSession: !!data.tempSession,
        });
        setRequiresMFA(true);
        setUserId(data.userId);
        setTempSession(data.tempSession); // Store temporary session
        setError(null); // Clear any previous errors
        setIsLoading(false); // Stop loading to show MFA input
        return;
      }

      // This should never happen for tenant admins (2FA is mandatory)
      // But handle it gracefully just in case
      console.warn('[Login] Unexpected: Login succeeded without 2FA requirement', data);
      window.location.href = '/dashboard';
    } catch (err: any) {
      console.error('[Login] Unexpected error during login', {
        error: err,
        message: err?.message,
        stack: err?.stack,
        name: err?.name,
      });
      setError(err?.message || 'An error occurred. Please try again.');
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

          <form className="mt-8 space-y-6 bg-white border-2 border-slate-200 rounded-lg p-8 shadow-lg" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4">
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
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
                  className="block w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-0"
                  placeholder="admin@yourstore.com"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
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
                  className="block w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-0"
                  placeholder="Enter your password"
                />
              </div>

              {deviceFingerprint && (
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="trust-device"
                      name="trust-device"
                      type="checkbox"
                      checked={trustDevice}
                      onChange={(e) => setTrustDevice(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="trust-device" className="font-medium text-gray-700 cursor-pointer">
                      Trust this device for 30 days
                    </label>
                    <p className="text-gray-500 mt-0.5">
                      Skip 2FA verification on this device. Not recommended for shared or public computers.
                    </p>
                  </div>
                </div>
              )}
            </div>

          <div className="flex items-center justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Forgot password?
            </Link>
          </div>

            <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-md text-sm font-semibold text-white bg-slate-800 hover:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-50 to-gray-100 px-4">
      <div className="w-full max-w-md space-y-8">
        {/* Admin Login Badge */}
        <div className="flex items-center justify-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-full text-sm font-semibold shadow-md">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Store Admin Login
          </div>
        </div>
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

        <form className="mt-8 space-y-6 bg-white border border-gray-200 rounded-lg p-8 shadow-sm" onSubmit={handleSubmit}>
          {error && (
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <p className="text-sm font-medium text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            {!requiresMFA ? (
              <>
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-gray-900 mb-2">
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
                    className="block w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-0"
                    placeholder="admin@yourstore.com"
                  />
                </div>

                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
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
                    className="block w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-0"
                    placeholder="Enter your password"
                  />
                </div>

                {deviceFingerprint && (
                  <div className="flex items-start">
                    <div className="flex items-center h-5">
                      <input
                        id="trust-device-main"
                        name="trust-device-main"
                        type="checkbox"
                        checked={trustDevice}
                        onChange={(e) => setTrustDevice(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600"
                      />
                    </div>
                    <div className="ml-3 text-sm">
                      <label htmlFor="trust-device-main" className="font-medium text-gray-700 cursor-pointer">
                        Trust this device for 30 days
                      </label>
                      <p className="text-gray-500 mt-0.5">
                        Skip 2FA verification on this device. Not recommended for shared or public computers.
                      </p>
                    </div>
                  </div>
                )}
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
                      <p className="text-sm text-blue-800 font-semibold text-blue-700 mb-1">
                        Two-factor authentication is required for all tenant admin accounts.
                      </p>
                      <p className="text-sm text-blue-800">
                        A 6-digit code has been sent to your email. Please enter it below to complete your login.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label htmlFor="mfaCode" className="block text-sm font-semibold text-gray-900 mb-2">
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
                    className="block w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-0 text-center text-2xl tracking-widest font-mono"
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
                    disabled={isLoading}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    ← Back to password
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!userId || isLoading) return;
                      setIsLoading(true);
                      setError(null);
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
                      } finally {
                        setIsLoading(false);
                      }
                    }}
                    disabled={isLoading}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    {isLoading && (
                      <span className="h-3 w-3 animate-spin rounded-full border-2 border-blue-600/30 border-t-blue-600" />
                    )}
                    {isLoading ? 'Sending...' : 'Resend code'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-end">
            <Link
              href="/forgot-password"
              className="text-sm font-medium text-blue-600 hover:text-blue-500"
            >
              Forgot password?
            </Link>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading && (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-transparent" />
              )}
              {isLoading ? 'Signing in...' : 'Sign in to Dashboard'}
            </button>
          </div>
        </form>

        <div className="text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>Customer?</strong> Use the{' '}
              <Link href="/customer-login" className="text-blue-700 hover:text-blue-900 underline font-semibold">
                Customer Login
              </Link>
              {' '}instead
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

