'use client';

/**
 * Customer Forgot Password Page
 * 
 * Page for customers to request password reset
 * Accessible via tenant subdomain storefront
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function CustomerForgotPasswordPage() {
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Fetch tenant name from API
  useEffect(() => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Call customer password reset API
      const response = await fetch('/api/customers/auth/password-reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Don't reveal if email exists or not for security
        // Still show success to prevent email enumeration
        if (response.status === 404 || response.status === 400) {
          setSuccess(true);
          return;
        }
        setError(data.error || data.message || 'Failed to send reset email');
        return;
      }

      // Success - show success message
      setSuccess(true);
    } catch (err) {
      console.error('Password reset error:', err);
      // Show success even on error to prevent email enumeration
      setSuccess(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Reset Your Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {tenantName 
              ? `Enter your email address and we'll send you a link to reset your password for your ${tenantName} account`
              : "Enter your email address and we'll send you a link to reset your password"}
          </p>
        </div>

        {success ? (
          <div className="mt-8 space-y-6 bg-white border border-gray-200 rounded-lg p-8 shadow-sm">
            <div className="rounded-md bg-green-50 border border-green-200 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-800">
                    If an account exists with that email, we&apos;ve sent password reset instructions.
                  </p>
                  <p className="mt-2 text-sm text-green-700">
                    Please check your email inbox (and spam folder) for the reset link.
                  </p>
                </div>
              </div>
            </div>
            <div className="text-center">
              <Link
                href="/customer-login"
                className="font-medium text-blue-600 hover:text-blue-500"
              >
                Back to login
              </Link>
            </div>
          </div>
        ) : (
          <form className="mt-8 space-y-6 bg-white border border-gray-200 rounded-lg p-8 shadow-sm" onSubmit={handleSubmit}>
            {error && (
              <div className="rounded-md bg-red-50 border border-red-200 p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">{error}</p>
                  </div>
                </div>
              </div>
            )}

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
                placeholder="Enter your email"
              />
            </div>

            <div className="space-y-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? 'Sending...' : 'Send reset link'}
              </button>

              <div className="text-center">
                <Link
                  href="/customer-login"
                  className="text-sm font-medium text-blue-600 hover:text-blue-500"
                >
                  Back to login
                </Link>
              </div>
            </div>
          </form>
        )}

        {/* Help text */}
        <p className="mt-4 text-center text-xs text-gray-500">
          Remember your password?{' '}
          <Link href="/customer-login" className="text-blue-600 hover:text-blue-500">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
