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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { Mail, Lock, Loader2 } from 'lucide-react';
import {
  getOtpEmailDeliveryFailureLead,
  getOtpEmailSendingLimitLead,
  OTP_EMAIL_SERVICE_ERROR_CODE,
  OTP_SENDGRID_CREDITS_ERROR_CODE,
  OTP_SUPPORT_EMAIL,
} from '@/lib/mfa/otp-delivery-user-message';

type OtpHelpKind = 'delivery' | 'limits' | null;

function otpHelpKindFromApiCode(code: unknown): OtpHelpKind {
  if (code === OTP_SENDGRID_CREDITS_ERROR_CODE) return 'limits';
  if (code === OTP_EMAIL_SERVICE_ERROR_CODE) return 'delivery';
  return null;
}

export default function TenantLoginForm() {
  const router = useRouter();
  const [tenantName, setTenantName] = useState<string | null>(null);
  // OC.4 (docs/IMPLEMENTATION_TRACKER.md, "UI — Onboarding AI Chat") — whether
  // this tenant hasn't told us their niche yet (tenants.data.niche unset).
  // GET /api/tenant/current already returns the full tenant row (including
  // `data`) to every visitor of this page, authenticated or not, so this is
  // not a new exposure — just reading a field this same effect already
  // fetches. Used only to pick the post-login landing page below; never
  // blocks login itself, and the chat screen (OC.2/OC.5) is always skippable.
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [otpHelpKind, setOtpHelpKind] = useState<OtpHelpKind>(null);
  const [requiresMFA, setRequiresMFA] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tempSession, setTempSession] = useState<any>(null);
  const [mfaCode, setMfaCode] = useState('');
  const isBusy = isLoading || isRedirecting;

  const handleGoogleLogin = async () => {
    setError(null);
    setOtpHelpKind(null);
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
        setIsRedirecting(false);
      }
    } catch {
      setError('Unable to start Google sign-in. Please try again.');
      setIsLoading(false);
      setIsRedirecting(false);
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
          const tenantData = data.tenant?.data;
          const niche = tenantData && typeof tenantData === 'object' ? tenantData.niche : undefined;
          setNeedsOnboarding(!(typeof niche === 'string' && niche.trim().length > 0));
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
    setOtpHelpKind(null);

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
          // Only fall back to the onboarding-chat landing when the server
          // didn't already hand us a specific redirectTo (e.g. a stored
          // return URL) — that case is left completely alone.
          const redirectTo = data.redirectTo || (needsOnboarding ? '/dashboard/onboarding/chat' : '/dashboard');
          setIsRedirecting(true);
          window.location.href = redirectTo;
          return;
        }

        const errorMsg = data.message || data.error || 'Invalid code. Please try again.';
        setOtpHelpKind(null);
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
        const kind = otpHelpKindFromApiCode(data.code);
        setOtpHelpKind(kind);
        if (kind) {
          setError(null);
        } else {
          setError(data.message || data.error || 'Login failed');
        }
        return;
      }

      // 2FA flow
      if (data.requiresMFA && data.userId) {
        setRequiresMFA(true);
        setUserId(data.userId);
        setTempSession(data.tempSession);
        setError(null);
        setOtpHelpKind(null);
        return;
      }

      // No 2FA - direct login
      setIsRedirecting(true);
      window.location.href = needsOnboarding ? '/dashboard/onboarding/chat' : '/dashboard';
      return;
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 bg-gradient-to-b from-[#eff6ff] via-[#fcfeff] to-white px-4 py-8">
      {isBusy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-[1px]">
          <div className="flex items-center gap-3 rounded-xl border border-[#e5e7eb] bg-white px-4 py-3 shadow-lg">
            <Loader2 className="h-5 w-5 animate-spin text-[#355cad]" />
            <p className="text-sm font-semibold text-[#101828]">
              Signing you in...
            </p>
          </div>
        </div>
      )}
      <div className="mx-auto w-full max-w-[408px]">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="relative flex h-10 w-[170px] items-center justify-center">
            <img src="/logo_with_name.png" alt="DukaNest" className="h-10 w-auto object-contain" />
          </Link>
        </div>

        <div className="rounded-2xl border border-[#e5e7eb] bg-white px-6 py-6 shadow-[0_10px_15px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.1)]">
          <div className="rounded-2xl bg-[#f3f4f6] p-1">
            <div className="grid grid-cols-2 gap-1">
              <div className="flex h-11 items-center justify-center rounded-[14px] bg-white text-sm font-bold text-[#101828] shadow-[0_4px_6px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.1)]">
                Shop Owner
              </div>
              <Link
                href="/customer-login"
                className="flex h-11 items-center justify-center rounded-[14px] text-sm font-bold text-[#4a5565] transition-colors hover:text-[#101828]"
              >
                Customer
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center">
            <h1 className="text-[24px] font-black leading-8 text-[#101828]">
              {requiresMFA ? 'Verify your code' : 'Welcome back, Owner'}
            </h1>
            <p className="mt-2 text-base text-[#4a5565]">
              {requiresMFA
                ? 'Enter the 6-digit code to finish sign in'
                : tenantName
                  ? `Sign in to manage ${tenantName}`
                  : 'Sign in to manage your store'}
            </p>
          </div>

          {!requiresMFA && (
            <>
              <Button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isBusy}
                variant="outline"
                className="mt-8 h-[59px] w-full rounded-2xl border-[1.7px] border-[#d1d5dc] bg-white text-base font-semibold text-[#101828] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1)] hover:bg-white"
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M23.49 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h6.46a5.52 5.52 0 01-2.4 3.63v3h3.88c2.27-2.09 3.55-5.17 3.55-8.66z" fill="#4285F4" />
                  <path d="M12 24c3.24 0 5.96-1.07 7.94-2.91l-3.88-3a7.2 7.2 0 01-10.72-3.78h-4V17.4A12 12 0 0012 24z" fill="#34A853" />
                  <path d="M5.34 14.31a7.2 7.2 0 010-4.62v-3h-4a12 12 0 000 10.62l4-3z" fill="#FBBC05" />
                  <path d="M12 4.77c1.76 0 3.34.61 4.58 1.8l3.43-3.43A12 12 0 001.34 6.69l4 3A7.2 7.2 0 0112 4.77z" fill="#EA4335" />
                </svg>
                Continue with Google
              </Button>

              <div className="my-6 flex items-center gap-4">
                <span className="h-px flex-1 bg-[#e5e7eb]" />
                <span className="text-sm text-[#6a7282]">or</span>
                <span className="h-px flex-1 bg-[#e5e7eb]" />
              </div>
            </>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {(error || otpHelpKind) && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                {otpHelpKind === 'delivery' && (
                  <p className="text-sm leading-relaxed text-red-700">
                    {getOtpEmailDeliveryFailureLead()}{' '}
                    If you need help, email{' '}
                    <a
                      href={`mailto:${OTP_SUPPORT_EMAIL}`}
                      className="font-semibold text-red-800 underline decoration-red-800/60 underline-offset-2 hover:text-red-900"
                    >
                      {OTP_SUPPORT_EMAIL}
                    </a>
                    .
                  </p>
                )}
                {otpHelpKind === 'limits' && (
                  <p className="text-sm leading-relaxed text-red-700">
                    {getOtpEmailSendingLimitLead()}{' '}
                    For assistance, email{' '}
                    <a
                      href={`mailto:${OTP_SUPPORT_EMAIL}`}
                      className="font-semibold text-red-800 underline decoration-red-800/60 underline-offset-2 hover:text-red-900"
                    >
                      {OTP_SUPPORT_EMAIL}
                    </a>
                    .
                  </p>
                )}
                {!otpHelpKind && error && <p className="text-sm text-red-700">{error}</p>}
              </div>
            )}

            {requiresMFA ? (
              <>
                <div>
                  <Label htmlFor="mfaCode" className="text-sm font-bold text-[#101828]">Authentication Code</Label>
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
                    className="mt-2 h-[60px] rounded-2xl border-[#e5e7eb] bg-[#f9fafb] text-center text-xl tracking-[0.2em]"
                    placeholder="000000"
                    autoFocus
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <button
                    type="button"
                    onClick={() => {
                      setRequiresMFA(false);
                      setUserId(null);
                      setTempSession(null);
                      setMfaCode('');
                      setError(null);
                      setOtpHelpKind(null);
                    }}
                    className="font-semibold text-[#355cad] hover:underline"
                  >
                    Back
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
                          setOtpHelpKind(null);
                          alert('A new code has been sent to your email.');
                        } else {
                          const kind = otpHelpKindFromApiCode(data.code);
                          setOtpHelpKind(kind);
                          if (kind) {
                            setError(null);
                          } else {
                            setError(data.message || data.error || 'Failed to resend code');
                          }
                        }
                      } catch {
                        setOtpHelpKind(null);
                        setError('Failed to resend code');
                      }
                    }}
                    className="font-semibold text-[#355cad] hover:underline"
                  >
                    Resend code
                  </button>
                </div>
              </>
            ) : (
              <>
                <div>
                  <Label htmlFor="email" className="text-sm font-bold text-[#101828]">Email</Label>
                  <div className="relative mt-2">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#99a1af]" />
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="h-[60px] rounded-2xl border-[#e5e7eb] bg-[#f9fafb] pl-12 text-base placeholder:text-[#99a1af]"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="password" className="text-sm font-bold text-[#101828]">Password</Label>
                  <div className="relative mt-2">
                    <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#99a1af]" />
                    <Input
                      id="password"
                      name="password"
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="h-[60px] rounded-2xl border-[#e5e7eb] bg-[#f9fafb] pl-12 text-base placeholder:text-[#99a1af]"
                    />
                  </div>
                </div>
                <div className="text-right">
                  <Link href="/forgot-password" className="text-sm font-semibold text-[#355cad] hover:underline">
                    Forgot password?
                  </Link>
                </div>
              </>
            )}

            <Button
              type="submit"
              className="h-[68px] w-full rounded-2xl bg-gradient-to-b from-[#355cad] to-[#4a7bd9] text-[18px] font-bold tracking-[-0.44px] text-white shadow-[0_10px_15px_rgba(43,127,255,0.3),0_4px_6px_rgba(43,127,255,0.3)] hover:from-[#355cad] hover:to-[#4a7bd9]"
              disabled={isLoading}
            >
              {isBusy ? 'Signing in...' : 'Sign in to Dashboard'}
            </Button>
          </form>
        </div>

        <p className="mt-7 text-center text-[14px] text-[#4a5565]">
          Don&apos;t have a store?{' '}
          <Link href="https://dukanest.com" className="font-bold text-[#355cad]">
            Start free trial
          </Link>
        </p>
      </div>
    </main>
  );
}
