'use client';

/**
 * Tenant Registration Page
 * 
 * Public page where users can register a new tenant/store
 */

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowLeft, CheckCircle2, Check, Store, Palette, Package, Settings, Sparkles } from 'lucide-react';
import { trackMetaPixelEvent } from '@/lib/analytics/meta-pixel';
import { trackMarketingFunnelEvent } from '@/lib/analytics/google-analytics';
import { detectUserLocationClient, detectLocationByIP } from '@/lib/pricing/location-client';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';

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

interface ProgressStep {
  id: string;
  label: string;
  icon: React.ReactNode;
  status: 'pending' | 'active' | 'complete';
}

function getProgressSteps(storeName: string, hasDemoContent: boolean): ProgressStep[] {
  const steps: ProgressStep[] = [
    { id: 'account', label: 'Creating your account', icon: <Settings className="w-5 h-5" />, status: 'pending' },
    { id: 'store', label: `Setting up ${storeName || 'your store'}`, icon: <Store className="w-5 h-5" />, status: 'pending' },
    { id: 'theme', label: 'Configuring your theme', icon: <Palette className="w-5 h-5" />, status: 'pending' },
  ];
  if (hasDemoContent) {
    steps.push({ id: 'demo', label: 'Adding sample products', icon: <Package className="w-5 h-5" />, status: 'pending' });
  }
  steps.push({ id: 'finalize', label: 'Finalizing everything', icon: <Sparkles className="w-5 h-5" />, status: 'pending' });
  return steps;
}

function StoreCreationProgress({
  steps,
  storeName,
}: Readonly<{
  steps: ProgressStep[];
  storeName: string;
}>) {
  const completedCount = steps.filter((s) => s.status === 'complete').length;
  const progress = Math.round((completedCount / steps.length) * 100);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-primary/5 via-background to-background px-4">
      <div className="w-full max-w-md">
        {/* Animated store icon */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center animate-pulse">
              <Store className="w-10 h-10 text-primary" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary flex items-center justify-center">
              <Loader2 className="w-4 h-4 text-white animate-spin" />
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold mb-1">Building your store</h2>
          <p className="text-muted-foreground text-sm">
            Setting up <span className="font-medium text-foreground">{storeName || 'your store'}</span> — this only takes a moment
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-muted-foreground">Progress</span>
            <span className="text-xs font-medium text-primary">{progress}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Steps */}
        <div className="space-y-1">
          {steps.map((step, i) => (
            <div
              key={step.id}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-500 ${
                step.status === 'active'
                  ? 'bg-primary/5'
                  : step.status === 'complete'
                    ? 'bg-transparent'
                    : 'bg-transparent opacity-50'
              }`}
              style={{
                transitionDelay: `${i * 50}ms`,
              }}
            >
              {/* Status indicator */}
              <div className="flex-shrink-0">
                {step.status === 'complete' ? (
                  <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center">
                    <Check className="w-4 h-4 text-green-600" />
                  </div>
                ) : step.status === 'active' ? (
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                    {step.icon}
                  </div>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-sm font-medium transition-colors duration-300 ${
                  step.status === 'complete'
                    ? 'text-green-600'
                    : step.status === 'active'
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                }`}
              >
                {step.label}
                {step.status === 'complete' && (
                  <span className="text-xs text-green-500 ml-2">Done</span>
                )}
              </span>
            </div>
          ))}
        </div>

        {/* Reassurance */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          Please don&apos;t close this page. We&apos;re almost done.
        </p>
      </div>
    </div>
  );
}

function TenantRegisterForm() {
  const GOOGLE_SIGNUP_STORAGE_KEY = 'dukanest:google-signup-pending';
  const searchParams = useSearchParams();
  const planIdFromUrl = searchParams.get('plan');
  const utmSource = searchParams.get('utm_source');
  const utmMedium = searchParams.get('utm_medium');
  const utmCampaign = searchParams.get('utm_campaign');

  const [allPlans, setAllPlans] = useState<PricingPlan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(planIdFromUrl);
  const [selectedPlan, setSelectedPlan] = useState<PricingPlan | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState(true);
  const [currencySymbol, setCurrencySymbol] = useState<'Ksh' | '$'>('$');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showProgress, setShowProgress] = useState(false);
  const [progressSteps, setProgressSteps] = useState<ProgressStep[]>([]);
  const progressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentStepIndexRef = useRef(0);
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
  });
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [useEmailSignup, setUseEmailSignup] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [businessType, setBusinessType] = useState<string>('');
  const [otherBusinessType, setOtherBusinessType] = useState<string>('');
  const [includeDemoContent, setIncludeDemoContent] = useState(true); // Default to true for better UX
  const [subdomainManuallyEdited, setSubdomainManuallyEdited] = useState(false);
  const isHandlingGoogleCallback = useRef(false);

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
        // Otherwise, default to the Basic plan so it's not left empty
        if (planIdFromUrl) {
          const plan = data.plans.find((p: PricingPlan) => p.id === planIdFromUrl);
          if (plan) {
            setSelectedPlan(plan);
            setSelectedPlanId(planIdFromUrl);
          }
        } else if (data.plans.length > 0) {
          const basicPlan = data.plans.find((p: PricingPlan) =>
            p.name.toLowerCase().includes('basic')
          );
          const defaultPlan = basicPlan || data.plans[0];
          setSelectedPlan(defaultPlan);
          setSelectedPlanId(defaultPlan.id);
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

  // Auto-generate subdomain from store name (user can edit)
  useEffect(() => {
    if (!subdomainManuallyEdited && formData.name.trim()) {
      const generated = generateSubdomainFromName(formData.name);
      if (generated) {
        setFormData((prev) => (prev.subdomain !== generated ? { ...prev, subdomain: generated } : prev));
      }
    }
  }, [formData.name, subdomainManuallyEdited]);

  const handleSubdomainChange = (value: string) => {
    setSubdomainManuallyEdited(true);
    // Convert to lowercase and remove invalid characters
    const cleaned = value.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setFormData({ ...formData, subdomain: cleaned });
  };

  // Auto-generate subdomain from store name when name changes (user can still edit)
  const generateSubdomainFromName = (name: string) => {
    if (!name.trim()) return '';
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const clearFieldError = (field: string) => {
    setFieldErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  // Inline validation - run on blur/change to give immediate feedback
  const validateField = (field: string): string | null => {
    switch (field) {
      case 'name':
        return !formData.name.trim() ? 'Store name is required' : null;
      case 'subdomain':
        if (!formData.subdomain.trim()) return 'Subdomain is required';
        if (formData.subdomain.length < 3) return 'Subdomain must be at least 3 characters';
        if (formData.subdomain.length > 63) return 'Subdomain must be at most 63 characters';
        if (!/^[a-z0-9-]+$/.test(formData.subdomain)) return 'Subdomain can only contain lowercase letters, numbers, and hyphens';
        return null;
      case 'adminEmail':
        if (!adminEmail.trim()) return 'Admin email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return 'Please enter a valid email address';
        return null;
      case 'adminPassword':
        if (!adminPassword) return 'Password is required';
        if (adminPassword.length < 8) return 'Password must be at least 8 characters';
        return null;
      case 'plan':
        return !selectedPlanId ? 'Please select a plan' : null;
      case 'businessType':
        if (!businessType) return 'Please select a business type';
        if (businessType === 'Other' && !otherBusinessType.trim()) return 'Please enter your business type';
        return null;
      default:
        return null;
    }
  };

  const handleBlur = (field: string) => {
    const err = validateField(field);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!selectedPlanId) {
      errors.plan = 'Please select a plan';
    }

    if (!formData.name.trim()) {
      errors.name = 'Store name is required';
    }

    if (!formData.subdomain.trim()) {
      errors.subdomain = 'Subdomain is required';
    } else if (formData.subdomain.length < 3) {
      errors.subdomain = 'Subdomain must be at least 3 characters';
    } else if (formData.subdomain.length > 63) {
      errors.subdomain = 'Subdomain must be at most 63 characters';
    } else if (!/^[a-z0-9-]+$/.test(formData.subdomain)) {
      errors.subdomain = 'Subdomain can only contain lowercase letters, numbers, and hyphens';
    }

    if (useEmailSignup) {
      if (!adminEmail.trim()) {
        errors.adminEmail = 'Admin email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
        errors.adminEmail = 'Please enter a valid email address';
      }

      if (!adminPassword) {
        errors.adminPassword = 'Password is required';
      } else if (adminPassword.length < 8) {
        errors.adminPassword = 'Password must be at least 8 characters';
      }
    }

    if (!businessType) {
      errors.businessType = 'Please select a business type';
    } else if (businessType === 'Other' && !otherBusinessType.trim()) {
      errors.otherBusinessType = 'Please enter your business type';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Start the progress sequence: set the first step to active and schedule timed advancement
  const startProgress = useCallback((steps: ProgressStep[]) => {
    currentStepIndexRef.current = 0;
    const updated = steps.map((s, i) => ({
      ...s,
      status: i === 0 ? 'active' as const : 'pending' as const,
    }));
    setProgressSteps(updated);
    setShowProgress(true);

    // Advance one step at a time on a timer (1.8s per step feels natural)
    const advanceStep = (currentIndex: number, currentSteps: ProgressStep[]) => {
      // Don't advance past the second-to-last step; final step completes on API success
      if (currentIndex >= currentSteps.length - 2) return;

      progressTimerRef.current = setTimeout(() => {
        const nextIndex = currentIndex + 1;
        currentStepIndexRef.current = nextIndex;
        setProgressSteps((prev) =>
          prev.map((s, i) => ({
            ...s,
            status: i < nextIndex ? 'complete' : i === nextIndex ? 'active' : 'pending',
          })),
        );
        advanceStep(nextIndex, currentSteps);
      }, 1800);
    };

    advanceStep(0, updated);
  }, []);

  // Rapidly complete all remaining steps (called on API success)
  const completeAllSteps = useCallback(async () => {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    const totalSteps = progressSteps.length || 5;
    for (let i = 0; i < totalSteps; i++) {
      await new Promise((r) => setTimeout(r, 300));
      setProgressSteps((prev) =>
        prev.map((s, idx) => ({
          ...s,
          status: idx <= i ? 'complete' : idx === i + 1 ? 'active' : s.status,
        })),
      );
    }
    // Brief pause at 100% before showing success
    await new Promise((r) => setTimeout(r, 600));
  }, [progressSteps.length]);

  // Cancel progress and return to form (called on API error)
  const cancelProgress = useCallback(() => {
    if (progressTimerRef.current) {
      clearTimeout(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setShowProgress(false);
    setProgressSteps([]);
    currentStepIndexRef.current = 0;
  }, []);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (progressTimerRef.current) {
        clearTimeout(progressTimerRef.current);
      }
    };
  }, []);

  const submitRegistration = async (options: {
    authProvider: 'google' | 'email';
    email: string;
    password?: string;
    name?: string;
    accessToken?: string;
    overrides?: {
      formData?: { name: string; subdomain: string };
      selectedPlanId?: string | null;
      businessType?: string;
      otherBusinessType?: string;
      includeDemoContent?: boolean;
    };
  }) => {
    const effectiveFormData = options.overrides?.formData ?? formData;
    const effectivePlanId = options.overrides?.selectedPlanId ?? selectedPlanId;
    const effectiveBusinessType = options.overrides?.businessType ?? businessType;
    const effectiveOtherBusinessType = options.overrides?.otherBusinessType ?? otherBusinessType;
    const effectiveIncludeDemoContent = options.overrides?.includeDemoContent ?? includeDemoContent;

    // Start the animated progress screen
    const steps = getProgressSteps(effectiveFormData.name, effectiveIncludeDemoContent);
    startProgress(steps);

    // Detect location before submitting
    let locationInfo = detectUserLocationClient();
    if (!locationInfo.isKenya) {
      try {
        locationInfo = await detectLocationByIP();
      } catch {
        // Use browser detection result
      }
    }

    const finalBusinessType = effectiveBusinessType === 'Other' ? effectiveOtherBusinessType : effectiveBusinessType;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-User-Country': locationInfo.countryCode || (locationInfo.isKenya ? 'KE' : 'US'),
      'X-User-Currency': locationInfo.currency,
    };
    if (options.accessToken) {
      headers.Authorization = `Bearer ${options.accessToken}`;
    }

    const response = await fetch('/api/tenants/register', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: effectiveFormData.name,
        subdomain: effectiveFormData.subdomain,
        adminEmail: options.email,
        adminPassword: options.password,
        adminName: options.name,
        authProvider: options.authProvider,
        planId: effectivePlanId || undefined,
        businessType: finalBusinessType || undefined,
        includeDemoContent: effectiveIncludeDemoContent,
        includeDemoAttributes: effectiveIncludeDemoContent,
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      cancelProgress();
      const serverFieldErrors: Record<string, string> = {};
      if (data.errors && Array.isArray(data.errors)) {
        data.errors.forEach((err: { field: string; message: string }) => {
          if (err.field) serverFieldErrors[err.field] = err.message;
        });
      }

      const msg = (data.message || '').toLowerCase();
      if (Object.keys(serverFieldErrors).length === 0) {
        if (msg.includes('subdomain') && (msg.includes('taken') || msg.includes('already'))) {
          serverFieldErrors.subdomain = 'Subdomain taken — choose another';
        } else if (msg.includes('email') && (msg.includes('already') || msg.includes('exists') || msg.includes('use'))) {
          serverFieldErrors.adminEmail = 'Email already in use — Sign in instead';
        }
      }

      setFieldErrors(serverFieldErrors);
      setError(Object.keys(serverFieldErrors).length > 0 ? null : data.message || 'Registration failed');
      trackMarketingFunnelEvent('sign_up_failed', {
        reason: Object.keys(serverFieldErrors).length > 0 ? 'server_validation_failed' : 'registration_failed',
        plan_id: selectedPlanId,
        has_field_errors: Object.keys(serverFieldErrors).length > 0,
        auth_method: options.authProvider,
        utm_source: utmSource || undefined,
        utm_medium: utmMedium || undefined,
        utm_campaign: utmCampaign || undefined,
      });
      return false;
    }

    await completeAllSteps();
    setSuccess(true);
    setShowProgress(false);
    trackMetaPixelEvent('CompleteRegistration', {
      content_name: 'Store Registration',
      status: 'complete',
    });
    trackMarketingFunnelEvent('sign_up_completed', {
      plan_id: selectedPlanId,
      include_demo_content: includeDemoContent,
      business_type: businessType || undefined,
      auth_method: options.authProvider,
      utm_source: utmSource || undefined,
      utm_medium: utmMedium || undefined,
      utm_campaign: utmCampaign || undefined,
    });
    if (data.loginUrl) setLoginUrl(data.loginUrl);
    if (data.demoContentCreated) {
      setDemoContentInfo({
        created: true,
        products: data.demoProductsCreated || 0,
        categories: data.demoCategoriesCreated || 0,
      });
    }
    return true;
  };

  const handleGoogleSignup = async () => {
    setIsSubmitting(true);
    setError(null);
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createSupabaseClient();
      const hostname = window.location.hostname;
      const isRootLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';
      const isDukanestHost = hostname === 'dukanest.com' || hostname.endsWith('.dukanest.com');
      const isStoreflowHost = hostname === 'storeflow.com' || hostname.endsWith('.storeflow.com');
      const pendingPayload = {
        formData,
        selectedPlanId,
        businessType,
        otherBusinessType,
        includeDemoContent,
        utmSource,
        utmMedium,
        utmCampaign,
      };
      window.localStorage.setItem(GOOGLE_SIGNUP_STORAGE_KEY, JSON.stringify(pendingPayload));
      const returnUrl = `${window.location.origin}/register`;
      const cookieDomain = isRootLocalHost
        ? ''
        : isDukanestHost
          ? '; Domain=.dukanest.com'
          : isStoreflowHost
            ? '; Domain=.storeflow.com'
            : '';
      document.cookie = `dukanest_oauth_next=${encodeURIComponent(returnUrl)}; Path=/; Max-Age=900; SameSite=Lax${cookieDomain}`;

      // Root localhost should use root callback allowlist entry.
      // Other hosts should callback on their own origin.
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
        setError(oauthError.message || 'Google sign-in failed. Please try again.');
        setIsSubmitting(false);
      }
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Unable to start Google sign-in. Please try again.';
      setError(message);
      setIsSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    trackMetaPixelEvent('Lead', {
      content_name: 'Start free trial',
      content_category: 'registration',
      status: 'attempted',
    });

    if (!useEmailSignup) {
      await handleGoogleSignup();
      return;
    }

    setIsSubmitting(true);
    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    trackMarketingFunnelEvent('sign_up_started', {
      plan_id: selectedPlanId,
      include_demo_content: includeDemoContent,
      business_type_selected: Boolean(businessType),
      auth_method: 'email',
      utm_source: utmSource || undefined,
      utm_medium: utmMedium || undefined,
      utm_campaign: utmCampaign || undefined,
    });

    try {
      await submitRegistration({
        authProvider: 'email',
        email: adminEmail,
        password: adminPassword,
      });
    } catch {
      cancelProgress();
      setError('An error occurred. Please try again.');
      trackMarketingFunnelEvent('sign_up_failed', {
        reason: 'network_or_unexpected_error',
        plan_id: selectedPlanId,
        auth_method: 'email',
        utm_source: utmSource || undefined,
        utm_medium: utmMedium || undefined,
        utm_campaign: utmCampaign || undefined,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  useEffect(() => {
    if (isHandlingGoogleCallback.current) return;

    const pendingRaw = window.localStorage.getItem(GOOGLE_SIGNUP_STORAGE_KEY);
    if (!pendingRaw) return;

    isHandlingGoogleCallback.current = true;
    setIsSubmitting(true);
    setError(null);

    const runGoogleRegistration = async () => {
      try {
        const pending = JSON.parse(pendingRaw);

        setFormData(pending.formData ?? formData);
        setSelectedPlanId(pending.selectedPlanId ?? selectedPlanId);
        setBusinessType(pending.businessType ?? businessType);
        setOtherBusinessType(pending.otherBusinessType ?? otherBusinessType);
        setIncludeDemoContent(Boolean(pending.includeDemoContent));

        const supabase = createSupabaseClient();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
          setIsSubmitting(false);
          isHandlingGoogleCallback.current = false;
          return;
        }

        const user = sessionData.session.user;
        if (!user?.email) {
          setError('Google account did not return an email address.');
          return;
        }

        trackMarketingFunnelEvent('sign_up_started', {
          plan_id: pending.selectedPlanId || undefined,
          include_demo_content: Boolean(pending.includeDemoContent),
          business_type_selected: Boolean(pending.businessType),
          auth_method: 'google',
          utm_source: pending.utmSource || undefined,
          utm_medium: pending.utmMedium || undefined,
          utm_campaign: pending.utmCampaign || undefined,
        });

        setFormData(pending.formData);
        setSelectedPlanId(pending.selectedPlanId);
        setBusinessType(pending.businessType);
        setOtherBusinessType(pending.otherBusinessType || '');

        await submitRegistration({
          authProvider: 'google',
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
          accessToken: sessionData.session.access_token,
          overrides: {
            formData: pending.formData,
            selectedPlanId: pending.selectedPlanId,
            businessType: pending.businessType,
            otherBusinessType: pending.otherBusinessType || '',
            includeDemoContent: Boolean(pending.includeDemoContent),
          },
        });
        window.localStorage.removeItem(GOOGLE_SIGNUP_STORAGE_KEY);
      } catch {
        cancelProgress();
        setError('Google sign-up could not be completed. Please try again.');
        window.localStorage.removeItem(GOOGLE_SIGNUP_STORAGE_KEY);
      } finally {
        setIsSubmitting(false);
      }
    };

    runGoogleRegistration();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Show animated progress screen while store is being created
  if (showProgress && !success) {
    return (
      <StoreCreationProgress
        steps={progressSteps}
        storeName={formData.name}
      />
    );
  }

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
            <h1 className="text-4xl font-bold mb-2">Create your store (Free 14-day trial)</h1>
            <p className="text-muted-foreground">
              No card required • Set up in minutes
            </p>
            {/* Plan Selection - Required before account creation */}
            <div className="mt-4 space-y-2">
              <Label htmlFor="plan-select" className="text-sm font-medium">
                Select Plan *
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
                    clearFieldError('plan');
                  }}
                >
                  <SelectTrigger id="plan-select" className={`w-full ${fieldErrors.plan ? 'border-red-500 focus-visible:ring-red-500' : ''}`}>
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
              {fieldErrors.plan ? (
                <p className="mt-1 text-xs text-red-600">{fieldErrors.plan}</p>
              ) : (
                <p className="text-xs text-muted-foreground">
                  You can change your plan later in your dashboard
                </p>
              )}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 bg-background border rounded-lg p-8">
            {error && (
              <div className="rounded-md bg-red-50 p-4">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Continue with Google for faster setup. Email/password signup is still available.
            </p>

            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Store Name *</Label>
                <Input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({ ...formData, name: e.target.value });
                    clearFieldError('name');
                  }}
                  onBlur={() => handleBlur('name')}
                  placeholder="My Awesome Store"
                  className={fieldErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}
                />
                {fieldErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>
                )}
              </div>

              <div>
                <Label htmlFor="subdomain">Subdomain *</Label>
                <div className="flex items-center">
                  <Input
                    id="subdomain"
                    type="text"
                    required
                    value={formData.subdomain}
                    onChange={(e) => {
                      handleSubdomainChange(e.target.value);
                      clearFieldError('subdomain');
                    }}
                    onBlur={() => handleBlur('subdomain')}
                    placeholder="mystore"
                    pattern="[a-z0-9\-]+"
                    className={`rounded-r-none ${fieldErrors.subdomain ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  <span className="px-4 py-2 bg-muted border border-l-0 rounded-r-md text-muted-foreground">
                    .{process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com'}
                  </span>
                </div>
                {fieldErrors.subdomain ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.subdomain}</p>
                ) : (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Only lowercase letters, numbers, and hyphens allowed
                  </p>
                )}
              </div>

              <div className="space-y-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground">
                  Your store will start with the Multipurpose theme. You can change it later in your dashboard.
                </p>

                <div>
                  <Label htmlFor="business-type">Business Type *</Label>
                  <Select
                    value={businessType}
                    onValueChange={(value) => {
                      setBusinessType(value);
                      clearFieldError('businessType');
                      clearFieldError('otherBusinessType');
                    }}
                    required
                  >
                    <SelectTrigger id="business-type" className={`w-full mt-2 ${fieldErrors.businessType ? 'border-red-500 ring-red-500' : ''}`}>
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
                        onChange={(e) => {
                          setOtherBusinessType(e.target.value);
                          clearFieldError('otherBusinessType');
                        }}
                        required={businessType === 'Other'}
                        className={fieldErrors.otherBusinessType ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {fieldErrors.otherBusinessType && (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.otherBusinessType}</p>
                      )}
                    </div>
                  )}
                  {fieldErrors.businessType ? (
                    <p className="mt-1 text-xs text-red-600">{fieldErrors.businessType}</p>
                  ) : (
                    <p className="mt-1 text-xs text-muted-foreground">
                      This helps us customize colors and settings for your business.
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Start with demo content (Recommended)</p>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="demo-content"
                      checked={includeDemoContent}
                      onCheckedChange={(checked) => setIncludeDemoContent(checked === true)}
                    />
                    <label
                      htmlFor="demo-content"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                    >
                      Add demo products & categories
                    </label>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Helps you explore the dashboard faster. Remove anytime.
                  </p>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Button
                  type="button"
                  onClick={handleGoogleSignup}
                  disabled={isSubmitting || isLoadingPlans || !selectedPlanId || !businessType || (businessType === 'Other' && !otherBusinessType.trim())}
                  className="w-full"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Redirecting to Google...
                    </>
                  ) : (
                    'Continue with Google'
                  )}
                </Button>

                <button
                  type="button"
                  className="w-full text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
                  onClick={() => setUseEmailSignup((prev) => !prev)}
                >
                  {useEmailSignup ? 'Hide email signup' : 'Continue with email instead'}
                </button>

                {useEmailSignup && (
                  <div className="space-y-4 rounded-md border p-4">
                    <div>
                      <Label htmlFor="adminEmail">Admin Email *</Label>
                      <Input
                        id="adminEmail"
                        type="email"
                        required={useEmailSignup}
                        value={adminEmail}
                        onChange={(e) => {
                          setAdminEmail(e.target.value);
                          clearFieldError('adminEmail');
                        }}
                        onBlur={() => handleBlur('adminEmail')}
                        placeholder="admin@example.com"
                        className={fieldErrors.adminEmail ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {fieldErrors.adminEmail ? (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.adminEmail}</p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          This email will be used for dashboard login.
                        </p>
                      )}
                    </div>

                    <div>
                      <Label htmlFor="adminPassword">Password *</Label>
                      <Input
                        id="adminPassword"
                        type="password"
                        required={useEmailSignup}
                        value={adminPassword}
                        onChange={(e) => {
                          setAdminPassword(e.target.value);
                          clearFieldError('adminPassword');
                        }}
                        onBlur={() => handleBlur('adminPassword')}
                        placeholder="••••••••"
                        minLength={8}
                        autoComplete="new-password"
                        className={fieldErrors.adminPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}
                      />
                      {fieldErrors.adminPassword ? (
                        <p className="mt-1 text-xs text-red-600">{fieldErrors.adminPassword}</p>
                      ) : (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Must be at least 8 characters.
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      variant="outline"
                      disabled={isSubmitting || isLoadingPlans || !selectedPlanId || !businessType || (businessType === 'Other' && !otherBusinessType.trim())}
                      className="w-full"
                    >
                      {isSubmitting ? 'Starting trial...' : 'Start free trial with email'}
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-muted-foreground text-center">
              No card required. Cancel anytime.
            </p>

            <div className="text-center space-y-2">
              <p className="text-sm text-muted-foreground">
                By creating a store, you agree to our Terms of Service and Privacy Policy
              </p>
              <p className="text-xs text-muted-foreground/80">
                I already have an account — check your email for Dukanest or email{' '}
                <a href="mailto:support@dukanest.com" className="underline hover:text-foreground">
                  support@dukanest.com
                </a>
              </p>
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

