/**
 * Customer Registration Form (Client Component)
 * 
 * Client-side form for customer registration
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { detectUserLocationClient, detectLocationByIP } from '@/lib/pricing/location-client';

interface CustomerRegisterFormProps {
  redirect?: string;
}

export default function CustomerRegisterForm({ redirect: initialRedirect }: CustomerRegisterFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || initialRedirect || '/account';
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    username: '',
    password: '',
    confirmPassword: '',
    mobile: '',
    company: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Full name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (!formData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setFieldErrors({});

    // Run client-side validation
    if (!validateForm()) {
      setIsLoading(false);
      return;
    }

    try {
      // Detect location before submitting
      let locationInfo = detectUserLocationClient();
      if (!locationInfo.isKenya) {
        try {
          locationInfo = await detectLocationByIP();
        } catch (ipError) {
          // Use browser detection result
        }
      }

      const response = await fetch('/api/customers/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Country': locationInfo.countryCode || (locationInfo.isKenya ? 'KE' : 'US'),
          'X-User-Currency': locationInfo.currency,
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          username: formData.username || formData.email.split('@')[0], // Use email prefix as username if not provided
          password: formData.password,
          mobile: formData.mobile || null,
          company: formData.company || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Parse field-level errors from server response (Zod validation)
        if (data.issues && Array.isArray(data.issues)) {
          const serverFieldErrors: Record<string, string> = {};
          data.issues.forEach((issue: { path: string[]; message: string }) => {
            const field = issue.path?.join('.');
            if (field) {
              serverFieldErrors[field] = issue.message;
            }
          });
          if (Object.keys(serverFieldErrors).length > 0) {
            setFieldErrors(serverFieldErrors);
          }
        }
        // Map common server errors to specific fields
        const errorMsg = data.error || 'Registration failed';
        if (errorMsg.toLowerCase().includes('email already exists')) {
          setFieldErrors((prev) => ({ ...prev, email: errorMsg }));
        }
        setError(errorMsg);
        return;
      }

      toast.success('Account created successfully! Please check your email to verify your account.');
      
      // Redirect to login page
      router.push(`/customer-login${redirect !== '/account' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`);
      router.refresh();
    } catch (err) {
      setError('An error occurred. Please try again.');
      toast.error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 px-4 py-12">
      <Card className="w-full max-w-md shadow-lg border-2 border-blue-100">
        <CardHeader className="space-y-4">
          {/* Customer Registration Badge */}
          <div className="flex items-center justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Customer Registration
            </div>
          </div>
          <CardTitle className="text-3xl text-center font-bold text-gray-900">Create Account</CardTitle>
          <CardDescription className="text-center text-base">
            Create a <strong>customer account</strong> to start shopping, track orders, and manage your profile
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="rounded-md bg-red-50 p-4 border border-red-200">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  clearFieldError('name');
                }}
                placeholder="John Doe"
                className={fieldErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {fieldErrors.name && (
                <p className="text-xs text-red-600">{fieldErrors.name}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={formData.email}
                onChange={(e) => {
                  setFormData({ ...formData, email: e.target.value });
                  clearFieldError('email');
                }}
                placeholder="your@email.com"
                className={fieldErrors.email ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {fieldErrors.email && (
                <p className="text-xs text-red-600">{fieldErrors.email}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="username">Username (optional)</Label>
              <Input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="Leave empty to use email prefix"
              />
              <p className="text-xs text-muted-foreground">
                If left empty, your email prefix will be used as username
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile">Phone Number (optional)</Label>
              <Input
                id="mobile"
                name="mobile"
                type="tel"
                autoComplete="tel"
                value={formData.mobile}
                onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                placeholder="+1234567890"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="company">Company (optional)</Label>
              <Input
                id="company"
                name="company"
                type="text"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Company name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                value={formData.password}
                onChange={(e) => {
                  setFormData({ ...formData, password: e.target.value });
                  clearFieldError('password');
                }}
                placeholder="At least 8 characters"
                minLength={8}
                className={fieldErrors.password ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {fieldErrors.password && (
                <p className="text-xs text-red-600">{fieldErrors.password}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                required
                value={formData.confirmPassword}
                onChange={(e) => {
                  setFormData({ ...formData, confirmPassword: e.target.value });
                  clearFieldError('confirmPassword');
                }}
                placeholder="Confirm your password"
                className={fieldErrors.confirmPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {fieldErrors.confirmPassword && (
                <p className="text-xs text-red-600">{fieldErrors.confirmPassword}</p>
              )}
            </div>

            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-6 text-base" disabled={isLoading}>
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t space-y-4">
            <p className="text-sm text-center text-muted-foreground">
              Already have an account?{' '}
              <Link
                href={`/customer-login${redirect !== '/account' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
                className="text-primary hover:underline font-medium"
              >
                Sign in
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

