/**
 * Tenant Registration Page
 * 
 * Public page where users can register a new tenant/store
 */

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { detectUserLocationClient, detectLocationByIP } from '@/lib/pricing/location-client';

interface PricingPlan {
  id: string;
  name: string;
  price: number;
  duration_months: number;
  trial_days: number | null;
  currency?: 'KES' | 'USD';
  currencySymbol?: 'Ksh' | '$';
}

interface PricingResponse {
  plans: PricingPlan[];
  location?: {
    country: string;
    currency: 'KES' | 'USD';
    currencySymbol: 'Ksh' | '$';
  };
}

function TenantRegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const planIdFromUrl = searchParams.get('plan');

  const [allPlans, setAllPlans] = useState<PricingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(planIdFromUrl);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState<'Ksh' | '$'>('$');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loginUrl, setLoginUrl] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
    contactEmail: '',
  });

  // Fetch all plans on component mount
  useEffect(() => {
    async function fetchPlans() {
      try {
        // First, detect location on client side
        let locationInfo = detectUserLocationClient();
        
        // Try IP-based detection as fallback (only if browser detection didn't find Kenya)
        if (!locationInfo.isKenya) {
          try {
            locationInfo = await detectLocationByIP();
          } catch (ipError) {
            // If IP detection fails, use browser detection result
            console.log('IP detection failed, using browser detection');
          }
        }

        // Fetch plans with location header
        const response = await fetch('/api/pricing', {
          headers: {
            'X-User-Country': locationInfo.isKenya ? 'KE' : 'US',
            'X-User-Currency': locationInfo.currency,
          },
        });
        
        if (!response.ok) throw new Error('Failed to fetch plans');
        const data: PricingResponse = await response.json();
        setAllPlans(data.plans || []);
        
        // Use client-detected currency if API didn't provide it
        if (data.location?.currencySymbol) {
          setCurrencySymbol(data.location.currencySymbol);
        } else {
          setCurrencySymbol(locationInfo.currencySymbol);
        }
        
        // If planId from URL exists, set it as selected
        if (planIdFromUrl) {
          const plan = data.plans.find((p: PricingPlan) => p.id === planIdFromUrl);
          if (plan) {
            setSelectedPlan(plan);
            setSelectedPlanId(planIdFromUrl);
          }
        }
      } catch (err) {
        console.error('Error fetching plans:', err);
      } finally {
        setIsLoadingPlans(false);
      }
    }
    fetchPlans();
  }, [planIdFromUrl]);

  // Update selected plan when selectedPlanId changes
  useEffect(() => {
    if (selectedPlanId && allPlans.length > 0) {
      const plan = allPlans.find((p: PricingPlan) => p.id === selectedPlanId);
      if (plan) {
        setSelectedPlan(plan);
      }
    } else {
      setSelectedPlan(null);
    }
  }, [selectedPlanId, allPlans]);

  const handleSubdomainChange = (value: string) => {
    // Convert to lowercase and remove invalid characters
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData({ ...formData, subdomain: cleaned });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    // Validate passwords match
    if (formData.adminPassword.length < 8) {
      setError('Password must be at least 8 characters');
      setIsSubmitting(false);
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

      const response = await fetch('/api/tenants/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Country': locationInfo.isKenya ? 'KE' : 'US',
          'X-User-Currency': locationInfo.currency,
        },
        body: JSON.stringify({
          ...formData,
          planId: selectedPlanId || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Registration failed');
        setIsSubmitting(false);
        return;
      }

      setSuccess(true);
      if (data.loginUrl) {
        setLoginUrl(data.loginUrl);
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background px-4">
        <div className="w-full max-w-md text-center space-y-6">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <CheckCircle2 className="h-8 w-8 text-green-600" />
          </div>
          <div>
            <h2 className="text-3xl font-bold mb-2">Registration Successful!</h2>
            <p className="text-muted-foreground">
              Your store has been created successfully. You can now log in to your admin dashboard.
            </p>
          </div>
          {loginUrl && (
            <div className="space-y-4">
              <Button asChild className="w-full">
                <a href={loginUrl} target="_blank" rel="noopener noreferrer">
                  Go to Admin Dashboard
                </a>
              </Button>
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Back to Home</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="text-2xl font-bold text-primary">
              Dukanest
            </Link>
            <Button asChild variant="outline">
              <Link href="/pricing">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Pricing
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Registration Form */}
      <section className="py-12 px-4 sm:px-6 lg:px-8">
        <div className="container mx-auto max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-4xl font-bold mb-2">Create Your Store</h1>
            <p className="text-muted-foreground">
              Get started with your eCommerce platform in minutes
            </p>
            {/* Plan Selection */}
            <div className="mt-4 space-y-2">
              <Label htmlFor="plan-select" className="text-sm font-medium">
                Select Plan
              </Label>
              {isLoadingPlans ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading plans...
                </div>
              ) : (
                <Select
                  value={selectedPlanId || ''}
                  onValueChange={(value) => {
                    setSelectedPlanId(value || null);
                  }}
                >
                  <SelectTrigger id="plan-select" className="w-full">
                    <SelectValue placeholder="Select a plan" />
                  </SelectTrigger>
                  <SelectContent>
                    {allPlans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {plan.name} - {plan.currencySymbol || currencySymbol}
                        {plan.currencySymbol === 'Ksh' 
                          ? plan.price.toLocaleString('en-KE')
                          : plan.price.toFixed(2)
                        }
                        {plan.duration_months > 0 && `/${plan.duration_months === 1 ? 'month' : `${plan.duration_months} months`}`}
                        {plan.trial_days && plan.trial_days > 0 && ` (${plan.trial_days}-day trial)`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {selectedPlan && (
                <div className="mt-2 p-3 bg-primary/10 rounded-lg">
                  <p className="text-sm font-medium">
                    Selected: <span className="text-primary">{selectedPlan.name}</span>
                    {selectedPlan.trial_days && selectedPlan.trial_days > 0 && (
                      <span className="text-muted-foreground ml-2">
                        ({selectedPlan.trial_days}-day trial)
                      </span>
                    )}
                  </p>
                </div>
              )}
              <p className="text-xs text-muted-foreground">
                You can change your plan later in your dashboard
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-background border rounded-lg p-8">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Store Name *</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="My Awesome Store"
                />
              </div>

              <div>
                <Label htmlFor="subdomain">Subdomain *</Label>
                <div className="flex items-center">
                  <Input
                    id="subdomain"
                    type="text"
                    required
                    value={formData.subdomain}
                    onChange={(e) => handleSubdomainChange(e.target.value)}
                    placeholder="mystore"
                    pattern="[a-z0-9-]+"
                    className="rounded-r-none"
                  />
                  <span className="px-4 py-2 bg-muted border border-l-0 rounded-r-md text-muted-foreground">
                    .{process.env.NEXT_PUBLIC_APP_DOMAIN || 'dukanest.com'}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  Only lowercase letters, numbers, and hyphens allowed
                </p>
              </div>

              <div>
                <Label htmlFor="adminName">Your Name *</Label>
                <Input
                  id="adminName"
                  type="text"
                  required
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                  placeholder="John Doe"
                />
              </div>

              <div>
                <Label htmlFor="adminEmail">Admin Email *</Label>
                <Input
                  id="adminEmail"
                  type="email"
                  required
                  value={formData.adminEmail}
                  onChange={(e) => setFormData({ ...formData, adminEmail: e.target.value })}
                  placeholder="admin@example.com"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  This will be your login email for the admin dashboard
                </p>
              </div>

              <div>
                <Label htmlFor="contactEmail">Contact Email *</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  required
                  value={formData.contactEmail}
                  onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                  placeholder="contact@example.com"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  For store-related communications
                </p>
              </div>

              <div>
                <Label htmlFor="adminPassword">Password *</Label>
                <Input
                  id="adminPassword"
                  type="password"
                  required
                  value={formData.adminPassword}
                  onChange={(e) => setFormData({ ...formData, adminPassword: e.target.value })}
                  placeholder="••••••••"
                  minLength={8}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Must be at least 8 characters
                </p>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isLoadingPlans}
              className="w-full"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Store...
                </>
              ) : (
                'Create Store'
              )}
            </Button>

            <div className="text-center text-sm text-muted-foreground">
              By creating a store, you agree to our Terms of Service and Privacy Policy
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}

export default function TenantRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <TenantRegisterForm />
    </Suspense>
  );
}

