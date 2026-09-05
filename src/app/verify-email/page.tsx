'use client';

/**
 * Email Verification Page
 * 
 * Page for verifying customer email with token from email
 * Accessible via tenant subdomain at /verify-email?token=...
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [isMounted, setIsMounted] = useState(false);
  const [isVerifying, setIsVerifying] = useState(true);
  const [error, setError] = useState<string | null>(null);
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

  // Automatically verify email when component mounts
  useEffect(() => {
    async function verifyEmail() {
      const token = searchParams.get('token');
      
      if (!token) {
        setError('Invalid or missing verification token. Please check your email for the correct link.');
        setIsVerifying(false);
        return;
      }

      try {
        const response = await fetch('/api/customers/auth/verify-email', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ token }),
        });

        const data = await response.json();

        if (!response.ok) {
          const errorMessage = data.error || data.message || 'Failed to verify email. Please try again.';
          setError(errorMessage);
          setIsVerifying(false);
          return;
        }

        // Success - show success message and redirect
        setSuccess(true);
        setIsVerifying(false);
        
        // Redirect to customer login after 3 seconds
        setTimeout(() => {
          router.push('/customer-login?verified=true');
        }, 3000);
      } catch (err) {
        console.error('Email verification error:', err);
        setError('An error occurred while verifying your email. Please try again.');
        setIsVerifying(false);
      }
    }

    verifyEmail();
  }, [searchParams, router]);

  // Show consistent loading state on initial render to prevent hydration issues
  if (!isMounted || isVerifying) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
              Verifying Email
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Please wait while we verify your email address...
            </p>
          </div>

          <div className="mt-8 space-y-6 bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <div className="rounded-md bg-blue-50 border border-blue-200 p-4">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
              <p className="text-sm font-medium text-blue-800 text-center mt-4">
                Verifying your email address...
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Email Verification
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {tenantName 
              ? `Verify your email for ${tenantName}`
              : 'Verify your email address'}
          </p>
        </div>

        {success ? (
          <div className="mt-8 space-y-6 bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <div className="rounded-md bg-green-50 border border-green-200 p-4">
              <div className="flex items-center justify-center mb-4">
                <svg className="h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-green-800 text-center mb-2">
                Email Verified Successfully!
              </h3>
              <p className="text-sm text-green-700 text-center">
                Your email address has been verified. You can now access all features of your account.
              </p>
              <p className="text-xs text-green-600 text-center mt-4">
                Redirecting to login page...
              </p>
            </div>
            <div className="text-center">
              <Link
                href="/customer-login?verified=true"
                className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-semibold text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                Go to Login
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-8 space-y-6 bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <div className="rounded-md bg-red-50 border border-red-200 p-4">
              <div className="flex items-center justify-center mb-4">
                <svg className="h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-red-800 text-center mb-2">
                Verification Failed
              </h3>
              <p className="text-sm text-red-700 text-center mb-4">
                {error || 'Invalid or expired verification token. Please request a new verification email.'}
              </p>
            </div>
            <div className="space-y-3">
              <Link
                href="/customer-login"
                className="inline-flex items-center justify-center w-full px-4 py-2 text-sm font-semibold text-white bg-primary rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
              >
                Go to Login
              </Link>
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Need a new verification email?{' '}
                  <Link
                    href="/customer-register"
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    Register again
                  </Link>
                  {' '}or{' '}
                  <Link
                    href="/customer-login"
                    className="font-medium text-primary hover:text-primary/80"
                  >
                    contact support
                  </Link>
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-bold tracking-tight text-gray-900">
              Loading...
            </h2>
          </div>
        </div>
      </div>
    }>
      <VerifyEmailForm />
    </Suspense>
  );
}
