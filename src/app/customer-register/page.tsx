/**
 * Customer Registration Page
 * 
 * Registration page for new customers
 */

'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import StorefrontHeader from '@/components/storefront/header';
import StorefrontFooter from '@/components/storefront/footer';

function CustomerRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') || '/account';
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    username: '',
    mobile: '',
    company: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Invalid email address';
    }

    if (!formData.password) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }

    if (formData.password !== formData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setValidationErrors({});

    if (!validateForm()) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/customers/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          username: formData.username || null,
          mobile: formData.mobile || null,
          company: formData.company || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.issues) {
          // Zod validation errors
          const zodErrors: Record<string, string> = {};
          data.issues.forEach((issue: any) => {
            zodErrors[issue.path[0]] = issue.message;
          });
          setValidationErrors(zodErrors);
        } else {
          setError(data.error || 'Registration failed');
        }
        return;
      }

      toast.success('Account created successfully! Please sign in.');
      
      // Redirect to login page with redirect parameter
      router.push(`/customer-login?redirect=${encodeURIComponent(redirect)}`);
    } catch (err) {
      setError('An error occurred. Please try again.');
      toast.error('Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <StorefrontHeader />
      <main className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Create Account</CardTitle>
            <CardDescription className="text-center">
              Sign up to track orders, save addresses, and more
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
                <Label htmlFor="name">Full Name *</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="John Doe"
                />
                {validationErrors.name && (
                  <p className="text-sm text-destructive">{validationErrors.name}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="your@email.com"
                />
                {validationErrors.email && (
                  <p className="text-sm text-destructive">{validationErrors.email}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="At least 8 characters"
                />
                {validationErrors.password && (
                  <p className="text-sm text-destructive">{validationErrors.password}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password *</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  placeholder="Confirm your password"
                />
                {validationErrors.confirmPassword && (
                  <p className="text-sm text-destructive">{validationErrors.confirmPassword}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="username">Username (optional)</Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="johndoe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mobile">Mobile Number (optional)</Label>
                <Input
                  id="mobile"
                  name="mobile"
                  type="tel"
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
                  placeholder="Company Name"
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Creating account...' : 'Create Account'}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t">
              <p className="text-sm text-center text-muted-foreground">
                Already have an account?{' '}
                <Link
                  href={`/customer-login${redirect !== '/account' ? `?redirect=${encodeURIComponent(redirect)}` : ''}`}
                  className="text-primary hover:underline font-medium"
                >
                  Sign in
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <StorefrontFooter />
    </div>
  );
}

export default function CustomerRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex flex-col">
        <StorefrontHeader />
        <main className="flex-1 flex items-center justify-center bg-gray-50 px-4 py-12">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-2xl text-center">Create Account</CardTitle>
              <CardDescription className="text-center">
                Loading...
              </CardDescription>
            </CardHeader>
          </Card>
        </main>
        <StorefrontFooter />
      </div>
    }>
      <CustomerRegisterForm />
    </Suspense>
  );
}

