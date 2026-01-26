'use client';

/**
 * Tenant Registration Page
 * 
 * Public page where users can register a new tenant/store
 */

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
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
  const [demoContentInfo, setDemoContentInfo] = useState<{
    created: boolean;
    products: number;
    categories: number;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    adminEmail: '',
    adminPassword: '',
    adminName: '',
    contactEmail: '',
  });

  const [themes, setThemes] = useState<any[]>([]);
  const [isLoadingThemes, setIsLoadingThemes] = useState(true);
  const [themesError, setThemesError] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string>('');
  const [businessType, setBusinessType] = useState<string>('');
  const [otherBusinessType, setOtherBusinessType] = useState<string>('');
  const [includeDemoContent, setIncludeDemoContent] = useState(true); // Default to true for better UX
  const [includeDemoAttributes, setIncludeDemoAttributes] = useState(false);

  // Business types for Kenya/Africa market
  const businessTypes = [
    'Grocery Store / Supermarket',
    'Pharmacy / Health & Wellness',
    'Fashion / Clothing',
    'Electronics & Mobile Phones',
    'Beauty & Personal Care',
    'Home & Kitchen',
    'Baby & Kids Products',
    'Food & Beverages / Restaurant',
    'Convenience Store / Duka',
    'Furniture & Home Decor',
    'Pets',
    'Hardware',
    'Other',
  ];

  // Fetch all themes on component mount
  useEffect(() => {
    async function fetchThemes() {
      try {
        // For registration, we need a public endpoint or we'll fetch themes after tenant creation
        // For now, we'll create a simple endpoint or use a default theme
        // Let's fetch from a public endpoint if available, otherwise use default
        const response = await fetch('/api/public/themes');
        if (response.ok) {
          const data = await response.json();
          setThemes(data.themes || []);
          // Set default theme if available (Grocery theme)
          const defaultTheme = data.themes?.find((t: any) => 
            t.slug?.toLowerCase() === 'grocery' || t.title?.toLowerCase() === 'grocery'
          );
          if (defaultTheme) {
            setSelectedThemeId(defaultTheme.id);
          }
        } else {
          setThemesError('Failed to load themes. Please refresh the page.');
        }
      } catch (err) {
        console.error('Error fetching themes:', err);
        setThemesError('Failed to load themes. Please refresh the page.');
      } finally {
        setIsLoadingThemes(false);
      }
    }
    fetchThemes();
  }, []);

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

      // Determine final business type (use "Other" text if "Other" is selected)
      const finalBusinessType = businessType === 'Other' ? otherBusinessType : businessType;

      const response = await fetch('/api/tenants/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Country': locationInfo.countryCode || (locationInfo.isKenya ? 'KE' : 'US'),
          'X-User-Currency': locationInfo.currency,
        },
        body: JSON.stringify({
          ...formData,
          planId: selectedPlanId || undefined,
          themeId: selectedThemeId || undefined,
          businessType: finalBusinessType || undefined,
          includeDemoContent: includeDemoContent,
          includeDemoAttributes: includeDemoAttributes,
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
      if (data.demoContentCreated) {
        setDemoContentInfo({
          created: true,
          products: data.demoProductsCreated || 0,
          categories: data.demoCategoriesCreated || 0,
        });
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
            <p className="text-muted-foreground mb-4">
              Your store has been created successfully. You can now log in to your admin dashboard.
            </p>
            {demoContentInfo?.created && (
              <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4 mb-4 text-left">
                <p className="text-sm text-blue-800 dark:text-blue-200 font-medium mb-2">
                  📦 Demo Content Installed
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mb-2">
                  We&apos;ve added sample products and categories to help you learn the system. You can explore them in your dashboard and remove them anytime.
                </p>
                {demoContentInfo.products > 0 && demoContentInfo.categories > 0 && (
                  <p className="text-xs text-blue-600 dark:text-blue-400">
                    {demoContentInfo.products} sample product{demoContentInfo.products !== 1 ? 's' : ''} and {demoContentInfo.categories} categor{demoContentInfo.categories !== 1 ? 'ies' : 'y'} added.
                  </p>
                )}
              </div>
            )}
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

            {/* 2FA Information Notice */}
            <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-4">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                    Two-Factor Authentication Required
                  </h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-2">
                    For your security, <strong>two-factor authentication (2FA) is mandatory</strong> for all store admin accounts. 
                    Each time you log in, you&apos;ll receive a 6-digit code via email to complete your login.
                  </p>
                  <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
                    <li>Secure your store and customer data</li>
                    <li>Protect against unauthorized access</li>
                    <li>Quick and easy email-based verification</li>
                  </ul>
                </div>
              </div>
            </div>

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
                    .{process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com'}
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
                  Must be at least 8 characters. After registration, you&apos;ll need to verify your email with a code each time you log in.
                </p>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div>
                  <Label htmlFor="theme-select">Theme *</Label>
                  {isLoadingThemes ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground mt-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Loading themes...
                    </div>
                  ) : themesError ? (
                    <div className="rounded-md bg-red-50 p-3 mt-2">
                      <p className="text-sm text-red-800">{themesError}</p>
                    </div>
                  ) : themes.length === 0 ? (
                    <div className="rounded-md bg-yellow-50 p-3 mt-2">
                      <p className="text-sm text-yellow-800">No themes available. Please contact support.</p>
                    </div>
                  ) : (
                    <Select
                      value={selectedThemeId}
                      onValueChange={setSelectedThemeId}
                      required
                    >
                      <SelectTrigger id="theme-select" className="w-full mt-2">
                        <SelectValue placeholder="Select a theme" />
                      </SelectTrigger>
                      <SelectContent>
                        {themes.map((theme) => (
                          <SelectItem key={theme.id} value={theme.id}>
                            {theme.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    Choose a theme for your storefront. You can customize it later.
                  </p>
                </div>

                <div>
                  <Label htmlFor="business-type">Business Type *</Label>
                  <Select value={businessType} onValueChange={setBusinessType} required>
                    <SelectTrigger id="business-type" className="w-full mt-2">
                      <SelectValue placeholder="Select your business type" />
                    </SelectTrigger>
                    <SelectContent>
                      {businessTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {businessType === 'Other' && (
                    <div className="mt-2">
                      <Input
                        placeholder="Enter your business type"
                        value={otherBusinessType}
                        onChange={(e) => setOtherBusinessType(e.target.value)}
                        required={businessType === 'Other'}
                      />
                    </div>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    This helps us customize colors and settings for your business.
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="demo-content"
                      checked={includeDemoContent}
                      onCheckedChange={(checked) => {
                        setIncludeDemoContent(checked === true);
                        if (!checked) {
                          setIncludeDemoAttributes(false);
                        }
                      }}
                    />
                    <label
                      htmlFor="demo-content"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Install with demo content (products & categories)
                    </label>
                  </div>
                  {includeDemoContent && (
                    <div className="flex items-center space-x-2 pl-6">
                      <Checkbox
                        id="demo-attributes"
                        checked={includeDemoAttributes}
                        onCheckedChange={(checked) => setIncludeDemoAttributes(checked === true)}
                      />
                      <label
                        htmlFor="demo-attributes"
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                      >
                        Include demo attributes (Size, Color, etc.)
                      </label>
                    </div>
                  )}
                  <div className="rounded-lg bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 p-3 mt-2">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>Recommended:</strong> Demo content includes sample products, categories, and pages that will help you learn the system and see how everything works. You can easily remove it later from your dashboard.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting || isLoadingPlans || isLoadingThemes || !selectedThemeId || !businessType || (businessType === 'Other' && !otherBusinessType.trim())}
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

