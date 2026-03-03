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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';

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
  const [showEmailLogin, setShowEmailLogin] = useState(false);
  const isHandlingGoogleCallback = useRef(false);

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
      const response = await fetch('/api/customers/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Login failed');
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
    <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-2 border-blue-100">
        <CardHeader className="space-y-4">
          {/* Customer Login Badge */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Customer Login
            </div>
          </div>
          <CardTitle className="text-3xl text-center font-bold text-gray-900">Sign In</CardTitle>
          <CardDescription className="text-center text-base">
            Sign in to your <strong>customer account</strong> to access your orders, track shipments, and manage your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
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
            <p className="text-sm text-muted-foreground text-center">
              New or returning customer? Continue with Google.
            </p>
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

          {error && (
            <div className="rounded-md bg-red-50 p-4 border border-red-200 mb-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {showEmailLogin && (
            <form onSubmit={handleSubmit} className="space-y-4">
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
                  href="/customer-forgot-password"
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

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-base" disabled={isLoading}>
                {isLoading ? 'Signing in...' : 'Sign In to My Account'}
              </Button>
            </form>
          )}

          <div className="mt-6 pt-6 border-t space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link
                href={`/customer-register${redirect !== '/account' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
                className="text-primary hover:underline font-medium"
              >
                Create an account
              </Link>
            </p>
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-center text-amber-800">
                <strong>Store Admin?</strong> Use the{' '}
                <Link
                  href="/dashboard/login"
                  className="text-amber-700 hover:text-amber-900 underline font-semibold"
                >
                  Store Admin Login
                </Link>
                {' '}instead
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}

