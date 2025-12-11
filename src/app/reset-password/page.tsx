/**
 * Reset Password Page
 * 
 * Page for resetting password with token from email
 * Accessible via tenant subdomain
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isTokenExpired, setIsTokenExpired] = useState(false);
  const [success, setSuccess] = useState(false);

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
        // Ignore errors - tenant name is optional
      }
    }
    fetchTenantName();
  }, []);

  // Check if Supabase tokens are present and establish session
  // Supabase redirects with tokens in the hash fragment: #access_token=...&type=recovery
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      const accessToken = hashParams.get('access_token');
      const type = hashParams.get('type');
      
      // Supabase password reset includes access_token and type=recovery in hash
      if (accessToken && type === 'recovery') {
        // Establish Supabase session from the token
        // This is handled automatically by Supabase client when we call updateUser
        // But we can verify the session is established
        (async () => {
          try {
            const { createClient } = await import('@/lib/supabase/client');
            const supabase = createClient();
            
            // The session should be automatically established from the hash tokens
            // Verify by checking if we have a session
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
              // Try to refresh the session from the hash
              await supabase.auth.getUser();
            }
          } catch (err) {
            console.error('Error establishing session:', err);
          }
        })();
      } else {
        // Check query params as fallback
        const queryToken = searchParams.get('token') || searchParams.get('access_token');
        if (!queryToken) {
          setError('Invalid or missing reset token. Please request a new password reset.');
        }
      }
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    // Reset token expired state when user tries again
    setIsTokenExpired(false);

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      setIsLoading(false);
      return;
    }

    try {
      // First, establish Supabase session from the reset token in URL hash
      const { createClient } = await import('@/lib/supabase/client');
      const supabase = createClient();

      // Get session to ensure token is valid
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        setError('Invalid or expired reset token. Please request a new password reset link.');
        setIsTokenExpired(true);
        return;
      }

      // Call API route that validates tenant association before resetting password
      const response = await fetch('/api/auth/tenant/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMessage = data.error || data.message || 'Failed to reset password. Please try again.';
        setError(errorMessage);
        
        // Check if error indicates expired/invalid token
        const isExpiredError = errorMessage.toLowerCase().includes('expired') || 
                              errorMessage.toLowerCase().includes('invalid') ||
                              errorMessage.toLowerCase().includes('token') ||
                              response.status === 401 ||
                              response.status === 403;
        
        if (isExpiredError) {
          setIsTokenExpired(true);
        }
        return;
      }

      // Success - show success message and redirect
      setSuccess(true);
      setTimeout(() => {
        router.push('/login');
      }, 2000);
    } catch (err) {
      console.error('Password reset error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Check if we have valid Supabase tokens
  const hasValidToken = typeof window !== 'undefined' && (() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const type = hashParams.get('type');
    
    // Supabase password reset includes access_token and type=recovery in hash
    if (accessToken && type === 'recovery') {
      return true;
    }
    
    // Fallback: check query params
    const queryToken = searchParams.get('token') || searchParams.get('access_token');
    return !!queryToken;
  })();

  if (!hasValidToken) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="mt-8 space-y-6 bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <p className="text-sm font-medium text-red-800">
                Invalid or missing reset token. Please request a new password reset.
              </p>
            </div>
            <div className="text-center">
              <Link
                href="/forgot-password"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Request new reset link
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Show consistent content on initial render to prevent hydration issues
  if (!isMounted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Reset Password
            </h2>
            <p className="mt-2 text-center text-sm text-gray-700">
              Enter your new password
            </p>
          </div>

          <div className="mt-8 space-y-6 bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <div className="rounded-md bg-yellow-50 border border-yellow-200 p-4">
              <p className="text-sm font-medium text-yellow-800">
                Loading...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-700">
            {tenantName 
              ? `Enter your new password for ${tenantName}`
              : 'Enter your new password'}
          </p>
        </div>

        {success ? (
          <div className="mt-8 space-y-6 bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <div className="rounded-md bg-green-50 border border-green-200 p-4">
              <p className="text-sm font-medium text-green-800">
                Password reset successfully! Redirecting to login...
              </p>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6 bg-white border border-gray-200 rounded-lg p-8 shadow-sm" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4 space-y-3">
                <p className="text-sm font-medium text-red-800">{error}</p>
                {isTokenExpired && (
                  <div className="pt-2 border-t border-red-200">
                    <Link
                      href="/forgot-password"
                      className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 transition-colors"
                    >
                      Request New Reset Link
                    </Link>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-900 mb-2">
                  New Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-0"
                  placeholder="Enter new password"
                  minLength={8}
                />
                <p className="mt-1 text-xs text-gray-500">Must be at least 8 characters</p>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-gray-900 mb-2">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="block w-full rounded-md border-2 border-gray-300 bg-white px-3 py-2.5 text-gray-900 shadow-sm placeholder:text-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-0"
                  placeholder="Confirm new password"
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-4">
              <button
                type="submit"
                disabled={isLoading || !hasValidToken}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Resetting...' : 'Reset password'}
              </button>

              <div className="text-center">
                <Link
                  href="/login"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Back to login
                </Link>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-white px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Loading...
            </h2>
          </div>
        </div>
      </div>
    }>
      <ResetPasswordForm />
    </Suspense>
  );
}

