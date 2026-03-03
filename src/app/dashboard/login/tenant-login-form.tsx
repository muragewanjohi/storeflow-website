/**
 * Tenant Admin Login Form (Client Component)
 * 
 * Client-side form for tenant admin login with MFA support
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';

export default function TenantLoginForm() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tempSession, setTempSession] = useState<any>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      const supabase = createSupabaseClient();
      const hostname = window.location.hostname;
      const port = window.location.port;

      const isRootLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
      const isLocalSubdomainHost = hostname.endsWith('.localhost');

      // Store the full return URL so the callback can redirect back to the correct tenant.
      const returnUrl = `${window.location.origin}/dashboard`;
      const cookieDomain = (isRootLocalHost || isLocalSubdomainHost)
        ? ''
        : hostname.endsWith('.dukanest.com')
          ? '; Domain=.dukanest.com'
          : hostname.endsWith('.storeflow.com')
            ? '; Domain=.storeflow.com'
            : '';
      document.cookie = `dukanest_oauth_next=${encodeURIComponent(returnUrl)}; Path=/; Max-Age=900; SameSite=Lax${cookieDomain}`;

      // Root localhost should use root callback allowlist entry.
      // Tenant-like hosts (.localhost, .dukanest.com) should use their own origin callback.
      const redirectTo = isRootLocalHost
        ? `http://localhost:${port || '3000'}/auth/callback`
        : `${window.location.origin}/auth/callback`;

      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          queryParams: {
            prompt: 'select_account',
          },
        },
      });
      if (oauthError) {
        setError(oauthError.message || 'Google sign-in failed');
        setIsLoading(false);
      }
    } catch {
      setError('Unable to start Google sign-in. Please try again.');
      setIsLoading(false);
    }
  };

  // Fetch tenant name on mount
  useEffect(() => {
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
        // Send MFA verification request
        const response = await fetch('/api/auth/tenant/mfa/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userId,
            code: mfaCode,
            tempSession,
          }),
        });

        const data = await response.json().catch(() => ({}));

        if (response.ok && data.success) {
          await new Promise(resolve => setTimeout(resolve, 200));
          const redirectTo = data.redirectTo || '/dashboard';
          setIsLoading(false);
          window.location.href = redirectTo;
          return;
        }

        const errorMsg = data.message || data.error || 'Invalid code. Please try again.';
        if (errorMsg.includes('session') || errorMsg.includes('expired') || errorMsg.includes('try logging in again')) {
          setError('Your session has expired. Please log in again.');
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

      // 2FA flow
      if (data.requiresMFA && data.userId) {
        setRequiresMFA(true);
        setUserId(data.userId);
        setTempSession(data.tempSession);
        setError(null);
        return;
      }

      // No 2FA - direct login
      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-2 border-blue-100">
        <CardHeader className="space-y-4">
          {/* Admin Login Badge */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Store Admin Login
            </div>
          </div>
          <CardTitle className="text-3xl text-center font-bold text-gray-900">
            Store Admin Dashboard
          </CardTitle>
          <CardDescription className="text-center text-base">
            {tenantName
              ? <>Sign in to manage <strong>{tenantName}</strong></>
              : 'Sign in to access your store dashboard'}
          </CardDescription>
          <p className="text-center text-xs text-muted-foreground">
            For store owners and staff only
          </p>
        </CardHeader>
        <CardContent>
          {!requiresMFA && (
            <div className="space-y-3 mb-4">
              <Button
                type="button"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-base"
                onClick={handleGoogleLogin}
                disabled={isLoading}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.46a5.52 5.52 0 01-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.66z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3a7.2 7.2 0 01-10.72-3.78h-4V17.4A12 12 0 0012 24z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.34 14.31a7.2 7.2 0 010-4.62v-3h-4a12 12 0 000 10.62l4-3z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.43-3.43A12 12 0 001.34 6.69l4 3A7.2 7.2 0 0112 4.77z"
                    fill="#EA4335"
                  />
                </svg>
                Continue with Google
              </Button>
              <div className="relative text-center text-xs uppercase text-muted-foreground">
                <span className="bg-background px-2 relative z-10">or</span>
                <div className="absolute left-0 right-0 top-1/2 h-px bg-border -z-0" />
              </div>
              {!showEmailLogin && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => setShowEmailLogin(true)}
                  disabled={isLoading}
                >
                  Continue with email and password
                </Button>
              )}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            {!requiresMFA && showEmailLogin ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="email">Email address</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Link
                    href="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                  <button
                    type="button"
                    onClick={() => setShowEmailLogin(false)}
                    className="text-sm text-muted-foreground hover:underline"
                  >
                    Back
                  </button>
                </div>
              </>
            ) : requiresMFA ? (
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
                  <Label htmlFor="mfaCode" className="mb-2">
                    Authentication Code
                  </Label>
                  <Input
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
                    className="text-center text-2xl tracking-widest font-mono"
                    placeholder="000000"
                    autoFocus
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
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
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    &larr; Back to password
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
                          alert('A new code has been sent to your email.');
                        } else {
                          setError(data.message || 'Failed to resend code');
                        }
                      } catch (err) {
                        setError('Failed to resend code');
                      }
                    }}
                    className="text-sm text-primary hover:underline font-medium"
                  >
                    Resend code
                  </button>
                </div>
              </div>
            ) : null}

            {(showEmailLogin || requiresMFA) && (
              <Button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-base"
                disabled={isLoading}
              >
                {isLoading && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/50 border-t-transparent mr-2" />
                )}
                {isLoading ? 'Signing in...' : 'Sign in to Dashboard'}
              </Button>
            )}
          </form>

          <div className="mt-6 pt-6 border-t space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Are you a customer?{' '}
              <Link
                href="/customer-login"
                className="text-primary hover:underline font-medium"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
