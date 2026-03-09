/**
 * Customer Login Form (Client Component)
 * 
 * Client-side form for customer login
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { Lock, Mail } from 'lucide-react';

interface CustomerLoginFormProps {
  redirect?: string;
}

export default function CustomerLoginForm({ redirect: initialRedirect }: CustomerLoginFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || initialRedirect || '/account';
  const GOOGLE_CUSTOMER_AUTH_STORAGE_KEY = 'dukanest:customer-google-auth-pending';
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isHandlingGoogleCallback = useRef(false);

  const buildDefaultName = (value: string): string => {
    const prefix = value.split('@')[0]?.trim() || 'Customer';
    const cleaned = prefix.replace(/[._-]+/g, ' ').trim();
    if (!cleaned) return 'Customer';
    return cleaned
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  };

  const buildDefaultUsername = (value: string): string => {
    const prefix = value.split('@')[0] || 'customer';
    const normalized = prefix
      .toLowerCase()
      .replace(/[^a-z0-9._-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
    return normalized || 'customer';
  };

  const attemptAutoRegisterAndLogin = async (
    customerEmail: string,
    customerPassword: string,
  ): Promise<boolean> => {
    const registerResponse = await fetch('/api/customers/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: buildDefaultName(customerEmail),
        email: customerEmail,
        username: buildDefaultUsername(customerEmail),
        password: customerPassword,
        mobile: null,
        company: null,
      }),
    });

    if (!registerResponse.ok) {
      return false;
    }

    const loginResponse = await fetch('/api/customers/auth/login', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email: customerEmail, password: customerPassword }),
    });
    const loginData = await loginResponse.json().catch(() => ({}));
    if (!loginResponse.ok) {
      setError(loginData.error || 'Account created, but sign-in failed. Please try again.');
      return false;
    }

    toast.success('Account created and signed in successfully');
    router.push(redirect);
    router.refresh();
    return true;
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const supabase = createSupabaseClient();
      const hostname = window.location.hostname;
      const isRootLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
      const returnUrl = window.location.href;
      const cookieDomain = isRootLocalHost
        ? ''
        : hostname.endsWith('.dukanest.com')
          ? '; Domain=.dukanest.com'
          : hostname.endsWith('.storeflow.com')
            ? '; Domain=.storeflow.com'
            : '';
      document.cookie = `dukanest_oauth_next=${encodeURIComponent(returnUrl)}; Path=/; Max-Age=900; SameSite=Lax${cookieDomain}`;
      window.localStorage.setItem(
        GOOGLE_CUSTOMER_AUTH_STORAGE_KEY,
        JSON.stringify({ redirect }),
      );

      const redirectTo = isRootLocalHost
        ? `http://localhost:${window.location.port || '3000'}/auth/callback`
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
        window.localStorage.removeItem(GOOGLE_CUSTOMER_AUTH_STORAGE_KEY);
        setError(oauthError.message || 'Google sign-in failed');
        setIsLoading(false);
      }
    } catch {
      window.localStorage.removeItem(GOOGLE_CUSTOMER_AUTH_STORAGE_KEY);
      setError('Unable to start Google sign-in. Please try again.');
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isHandlingGoogleCallback.current) return;
    const pendingRaw = window.localStorage.getItem(GOOGLE_CUSTOMER_AUTH_STORAGE_KEY);
    if (!pendingRaw) return;

    isHandlingGoogleCallback.current = true;
    setIsLoading(true);
    setError(null);

    const completeGoogleAuth = async () => {
      try {
        const pending = JSON.parse(pendingRaw) as { redirect?: string };
        const supabase = createSupabaseClient();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
          setError('Google session is unavailable. Please try again.');
          return;
        }

        const response = await fetch('/api/customers/auth/google', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionData.session.access_token}`,
          },
          body: JSON.stringify({
            redirect: pending.redirect || redirect,
          }),
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.error || 'Google sign-in failed. Please try again.');
          return;
        }

        toast.success('Logged in successfully');
        router.push(data.redirectTo || pending.redirect || redirect);
        router.refresh();
      } catch {
        setError('Google sign-in failed. Please try again.');
      } finally {
        window.localStorage.removeItem(GOOGLE_CUSTOMER_AUTH_STORAGE_KEY);
        setIsLoading(false);
      }
    };

    completeGoogleAuth();
  }, [redirect, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const normalizedEmail = email.trim().toLowerCase();
      const response = await fetch('/api/customers/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const canAutoRegister = response.status === 401 && data.code === 'CUSTOMER_NOT_FOUND';
        if (canAutoRegister) {
          const autoSignedIn = await attemptAutoRegisterAndLogin(normalizedEmail, password);
          if (autoSignedIn) return;
        }
        setError('Invalid email or password');
        return;
      }

      toast.success('Logged in successfully');
      
      // Redirect to the requested page or account dashboard
      router.push(redirect);
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
      toast.error('Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 bg-gradient-to-b from-[#eff6ff] via-[#fcfeff] to-white px-4 py-8">
      <div className="mx-auto w-full max-w-[408px]">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="relative flex h-10 w-[170px] items-center justify-center">
            <img src="/logo_with_name.png" alt="DukaNest" className="h-10 w-auto object-contain" />
          </Link>
        </div>

        <div className="rounded-2xl border border-[#e5e7eb] bg-white px-6 py-6 shadow-[0_10px_15px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.1)]">
          <div className="rounded-2xl bg-[#f3f4f6] p-1">
            <div className="grid grid-cols-2 gap-1">
              <Link
                href="/dashboard/login"
                className="flex h-11 items-center justify-center rounded-[14px] text-sm font-bold text-[#4a5565] transition-colors hover:text-[#101828]"
              >
                Shop Owner
              </Link>
              <div className="flex h-11 items-center justify-center rounded-[14px] bg-white text-sm font-bold text-[#101828] shadow-[0_4px_6px_rgba(0,0,0,0.1),0_2px_4px_rgba(0,0,0,0.1)]">
                Customer
              </div>
            </div>
          </div>

          <div className="mt-8 text-center">
            <h1 className="text-[24px] font-black leading-8 text-[#101828]">Welcome back, Customer</h1>
            <p className="mt-2 text-base text-[#4a5565]">Sign in to track your orders and manage your profile</p>
          </div>

          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={isLoading}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

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
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="h-[60px] rounded-2xl border-[#e5e7eb] bg-[#f9fafb] pl-12 text-base placeholder:text-[#99a1af]"
                />
              </div>
            </div>

            <div className="text-right">
              <Link href="/customer-forgot-password" className="text-sm font-semibold text-[#355cad] hover:underline">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              className="h-[68px] w-full rounded-2xl bg-gradient-to-b from-[#355cad] to-[#4a7bd9] text-[18px] font-bold tracking-[-0.44px] text-white shadow-[0_10px_15px_rgba(43,127,255,0.3),0_4px_6px_rgba(43,127,255,0.3)] hover:from-[#355cad] hover:to-[#4a7bd9]"
              disabled={isLoading}
            >
              {isLoading ? 'Signing in...' : 'Sign in to My Account'}
            </Button>
          </form>
        </div>

      </div>
    </main>
  );
}

