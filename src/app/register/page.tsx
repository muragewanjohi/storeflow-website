'use client';

/**
 * Tenant Registration Page
 * 
 * Public page where users can register a new tenant/store
 */

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle2, Check, Store, Palette, Package, Settings, Sparkles } from 'lucide-react';
import { trackMetaPixelEvent } from '@/lib/analytics/meta-pixel';
import { identifyTikTokPixelUser } from '@/lib/analytics/tiktok-pixel';
import { trackMarketingFunnelEvent } from '@/lib/analytics/google-analytics';
import { detectUserLocationClient, detectLocationByIP } from '@/lib/pricing/location-client';
import { createClient as createSupabaseClient } from '@/lib/supabase/client';
import { RegistrationPhoneField } from '@/components/phone/registration-phone-field';
import { isPhoneValidForCountry, type CountryCode } from '@/lib/phone/parse';

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
  const [touchedFields, setTouchedFields] = useState<Record<string, boolean>>({});
  const [logoError, setLogoError] = useState(false);
  const [isGoogleConnected, setIsGoogleConnected] = useState(false);
  const [googleAccountEmail, setGoogleAccountEmail] = useState<string | null>(null);
  const [isCheckingSubdomain, setIsCheckingSubdomain] = useState(false);
  const [isSubdomainAvailable, setIsSubdomainAvailable] = useState<boolean | null>(null);
  const [useEmailSignup, setUseEmailSignup] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [businessType, setBusinessType] = useState<string>('');
  const [otherBusinessType, setOtherBusinessType] = useState<string>('');
  const [selling, setSelling] = useState<string>('');
  const [includeDemoContent, setIncludeDemoContent] = useState(true); // Default to true for better UX
  const [adminPhoneCountry, setAdminPhoneCountry] = useState('KE');
  const [adminPhone, setAdminPhone] = useState('');
  const [subdomainManuallyEdited, setSubdomainManuallyEdited] = useState(false);
  const isHandlingGoogleCallback = useRef(false);
  const subdomainCheckCacheRef = useRef<Map<string, boolean>>(new Map());

  const businessTypes: Array<{ value: string; description: string }> = [
    {
      value: 'Fashion & Clothing',
      description: 'Clothes, shoes, handbags, accessories, tailoring.',
    },
    {
      value: 'Beauty & Personal Care',
      description: 'Cosmetics, skincare, hair products, barbershops, salons.',
    },
    {
      value: 'Electronics & Gadgets',
      description: 'Phones, laptops, accessories, earphones, smart devices.',
    },
    {
      value: 'Home & Kitchen',
      description: 'Furniture, utensils, decor, appliances.',
    },
    {
      value: 'Groceries & Food',
      description: 'Mini-marts, food stores, packaged foods.',
    },
    {
      value: 'Bakery & Cakes',
      description: 'Bakeries, cake shops, pastry businesses.',
    },
    {
      value: 'Restaurant & Takeaway',
      description: 'Food vendors, restaurants, fast food.',
    },
    {
      value: 'Agriculture & Farm Supplies',
      description: 'Seeds, fertilizers, agrovet products, farm tools.',
    },
    {
      value: 'Flowers & Gifts',
      description: 'Florists, gift shops, hampers, event gifts.',
    },
    {
      value: 'Health & Pharmacy',
      description: 'Pharmacies, supplements, medical supplies.',
    },
    {
      value: 'Automotive & Motorbike',
      description: 'Car parts, accessories, motorcycle gear.',
    },
    {
      value: 'Hardware & Construction',
      description: 'Tools, building materials, plumbing supplies.',
    },
    {
      value: 'Sports & Outdoor',
      description: 'Gym equipment, bicycles, sports gear.',
    },
    {
      value: 'Toys, Kids & Baby Products',
      description: 'Toys, baby clothes, baby products.',
    },
    {
      value: 'Pets & Animals',
      description: 'Pet food, accessories, ornamental fish, pet stores.',
    },
    {
      value: 'Other',
      description: 'Choose this if your business does not fit the categories above.',
    },
  ];


  // Fetch all plans on component mount
  useEffect(() => {
    async function fetchPlans() {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      try {
        // First, detect location on client side
        let locationInfo = detectUserLocationClient();
        
        // Try IP-based detection as fallback (only if browser detection didn't find Kenya)
        if (!locationInfo.isKenya) {
          try {
            locationInfo = await Promise.race([
              detectLocationByIP(),
              new Promise<typeof locationInfo>((_, reject) =>
                setTimeout(() => reject(new Error('IP location timeout')), 3000)
              ),
            ]);
          } catch (ipError) {
            // If IP detection fails, use browser detection result
            console.log('IP detection failed, using browser detection');
          }
        }

        // Fetch plans with location header
        const response = await fetch('/api/pricing', {
          signal: controller.signal,
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
        clearTimeout(timeoutId);
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

  const markFieldTouched = (field: string) => {
    setTouchedFields((prev) => (prev[field] ? prev : { ...prev, [field]: true }));
  };

  const getSubdomainFormatError = (subdomain: string): string | null => {
    const value = subdomain.trim();
    if (!value) return 'Subdomain is required';
    if (value.length < 3) return 'Subdomain must be at least 3 characters';
    if (value.length > 63) return 'Subdomain must be at most 63 characters';
    if (!/^[a-z0-9-]+$/.test(value)) return 'Subdomain can only contain lowercase letters, numbers, and hyphens';
    return null;
  };

  // Inline validation - run on blur/change to give immediate feedback
  const validateField = (field: string): string | null => {
    switch (field) {
      case 'name':
        return !formData.name.trim() ? 'Store name is required' : null;
      case 'subdomain':
        return getSubdomainFormatError(formData.subdomain);
      case 'adminEmail':
        if (!adminEmail.trim()) return 'Admin email is required';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) return 'Please enter a valid email address';
        return null;
      case 'adminPassword':
        if (!adminPassword) return 'Password is required';
        if (adminPassword.length < 8) return 'Password must be at least 8 characters';
        return null;
      case 'plan':
        return null;
      case 'businessType':
        if (!businessType) return 'Please select a business type';
        if (businessType === 'Other' && !otherBusinessType.trim()) return 'Please enter your business type';
        return null;
      case 'adminPhone':
        if (!adminPhone.trim()) return 'Store phone number is required';
        return isPhoneValidForCountry(adminPhone.trim(), adminPhoneCountry as CountryCode)
          ? null
          : 'Enter a valid mobile number for the selected country';
      default:
        return null;
    }
  };

  const handleBlur = (field: string) => {
    markFieldTouched(field);
    const err = validateField(field);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (err) next[field] = err;
      else delete next[field];
      return next;
    });
  };

  // Keep subdomain validation in sync with typing/autofill to avoid stale errors.
  useEffect(() => {
    if (!touchedFields.subdomain && !fieldErrors.subdomain) return;
    const err = validateField('subdomain');
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (err) next.subdomain = err;
      else delete next.subdomain;
      return next;
    });
  }, [formData.subdomain, touchedFields.subdomain, fieldErrors.subdomain]);

  useEffect(() => {
    const subdomain = formData.subdomain.trim().toLowerCase();
    const formatError = getSubdomainFormatError(subdomain);
    if (formatError) {
      setIsCheckingSubdomain(false);
      setIsSubdomainAvailable(null);
      return;
    }

    const cached = subdomainCheckCacheRef.current.get(subdomain);
    if (cached !== undefined) {
      setIsCheckingSubdomain(false);
      setIsSubdomainAvailable(cached);
      return;
    }

    let isCancelled = false;
    setIsCheckingSubdomain(true);
    const timer = setTimeout(async () => {
      try {
        const response = await fetch(`/api/tenants/check-subdomain?subdomain=${encodeURIComponent(subdomain)}`);
        const data = await response.json().catch(() => ({}));
        if (isCancelled) return;

        const available = response.ok && data.available === true;
        subdomainCheckCacheRef.current.set(subdomain, available);
        setIsSubdomainAvailable(available);
      } catch {
        if (!isCancelled) {
          setIsSubdomainAvailable(null);
        }
      } finally {
        if (!isCancelled) {
          setIsCheckingSubdomain(false);
        }
      }
    }, 350);

    return () => {
      isCancelled = true;
      clearTimeout(timer);
    };
  }, [formData.subdomain]);

  useEffect(() => {
    let active = true;
    const hydrateGoogleConnection = async () => {
      try {
        const supabase = createSupabaseClient();
        const { data } = await supabase.auth.getSession();
        if (!active) return;
        setIsGoogleConnected(Boolean(data.session));
        setGoogleAccountEmail(data.session?.user?.email ?? null);
      } catch {
        if (!active) return;
        setIsGoogleConnected(false);
        setGoogleAccountEmail(null);
      }
    };

    hydrateGoogleConnection();
    return () => {
      active = false;
    };
  }, []);

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = 'Store name is required';
    }

    const subdomainError = getSubdomainFormatError(formData.subdomain);
    if (subdomainError) {
      errors.subdomain = subdomainError;
    } else if (isSubdomainAvailable === false) {
      errors.subdomain = 'Subdomain taken — choose another';
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

    if (!adminPhone.trim()) {
      errors.adminPhone = 'Store phone number is required';
    } else if (!isPhoneValidForCountry(adminPhone.trim(), adminPhoneCountry as CountryCode)) {
      errors.adminPhone = 'Enter a valid mobile number for the selected country';
    }

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      setError('Please fill in all required fields highlighted below.');
      const firstFieldOrder = useEmailSignup
        ? ['adminEmail', 'adminPassword', 'name', 'subdomain', 'adminPhone', 'businessType', 'otherBusinessType']
        : ['name', 'subdomain', 'adminPhone', 'businessType', 'otherBusinessType'];
      const firstInvalidKey = firstFieldOrder.find((field) => errors[field]);
      const firstInvalidIdMap: Record<string, string> = {
        adminEmail: 'adminEmail',
        adminPassword: 'adminPassword',
        name: 'name',
        subdomain: 'subdomain',
        businessType: 'business-type',
        otherBusinessType: 'otherBusinessType',
        adminPhone: 'admin-phone-national',
      };
      const firstInvalidId = firstInvalidKey ? firstInvalidIdMap[firstInvalidKey] : null;
      if (firstInvalidId && typeof window !== 'undefined') {
        window.requestAnimationFrame(() => {
          document.getElementById(firstInvalidId)?.focus();
        });
      }
    }
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
      selling?: string;
      includeDemoContent?: boolean;
      adminPhone?: string;
      adminPhoneCountry?: string;
    };
  }) => {
    const effectiveFormData = options.overrides?.formData ?? formData;
    const effectivePlanId = options.overrides?.selectedPlanId ?? selectedPlanId;
    const effectiveBusinessType = options.overrides?.businessType ?? businessType;
    const effectiveOtherBusinessType = options.overrides?.otherBusinessType ?? otherBusinessType;
    const effectiveSelling = options.overrides?.selling ?? selling;
    const effectiveIncludeDemoContent = options.overrides?.includeDemoContent ?? includeDemoContent;
    const effectiveAdminPhone = options.overrides?.adminPhone ?? adminPhone;
    const effectiveAdminPhoneCountry = options.overrides?.adminPhoneCountry ?? adminPhoneCountry;

    // Start the animated progress screen
    const steps = getProgressSteps(effectiveFormData.name, effectiveIncludeDemoContent);
    startProgress(steps);

    // Detect location before submitting
    let locationInfo = detectUserLocationClient();
    if (!locationInfo.isKenya) {
      try {
        locationInfo = await Promise.race([
          detectLocationByIP(),
          new Promise<typeof locationInfo>((_, reject) =>
            setTimeout(() => reject(new Error('IP location timeout')), 3000)
          ),
        ]);
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
        selling: effectiveSelling.trim() || undefined,
        includeDemoContent: effectiveIncludeDemoContent,
        includeDemoAttributes: effectiveIncludeDemoContent,
        adminPhone: effectiveAdminPhone.trim(),
        adminPhoneCountry: effectiveAdminPhoneCountry || 'KE',
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
    identifyTikTokPixelUser({
      email: options.email,
      externalId: options.email,
    });
    trackMetaPixelEvent('CompleteRegistration', {
      content_name: 'Store Registration',
      content_type: 'registration',
      status: 'complete',
      value: 0,
      currency: 'USD',
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
    const redirectAfterRegister = data.loginUrl;
    if (redirectAfterRegister) {
      // Send the merchant to the tenant dashboard login page.
      // Keep progress UI until the browser navigates — do not setShowProgress(false) first
      // or the registration form flashes briefly before redirect.
      window.location.assign(redirectAfterRegister);
      return true;
    }

    setShowProgress(false);
    setSuccess(true);
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
        selling,
        includeDemoContent,
        adminPhone,
        adminPhoneCountry,
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

  const createWithConnectedGoogle = async () => {
    setIsSubmitting(true);
    setError(null);

    if (!validateForm()) {
      setIsSubmitting(false);
      return;
    }

    try {
      const supabase = createSupabaseClient();
      const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

      if (sessionError || !sessionData.session) {
        setError('Please connect your Google account first, then create your store.');
        setIsGoogleConnected(false);
        setGoogleAccountEmail(null);
        return;
      }

      const user = sessionData.session.user;
      if (!user?.email) {
        setError('Connected Google account did not return an email address.');
        return;
      }

      setIsGoogleConnected(true);
      setGoogleAccountEmail(user.email);

      trackMarketingFunnelEvent('sign_up_started', {
        plan_id: selectedPlanId,
        include_demo_content: includeDemoContent,
        business_type_selected: Boolean(businessType),
        auth_method: 'google',
        utm_source: utmSource || undefined,
        utm_medium: utmMedium || undefined,
        utm_campaign: utmCampaign || undefined,
      });

      await submitRegistration({
        authProvider: 'google',
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || undefined,
        accessToken: sessionData.session.access_token,
        overrides: {
          adminPhone,
          adminPhoneCountry,
        },
      });
    } catch {
      cancelProgress();
      setError('Google sign-up could not be completed. Please try again.');
      trackMarketingFunnelEvent('sign_up_failed', {
        reason: 'network_or_unexpected_error',
        plan_id: selectedPlanId,
        auth_method: 'google',
        utm_source: utmSource || undefined,
        utm_medium: utmMedium || undefined,
        utm_campaign: utmCampaign || undefined,
      });
    } finally {
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
      await createWithConnectedGoogle();
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
        setSelling(pending.selling ?? '');
        setIncludeDemoContent(Boolean(pending.includeDemoContent));
        if (typeof pending.adminPhone === 'string') setAdminPhone(pending.adminPhone);
        if (typeof pending.adminPhoneCountry === 'string') setAdminPhoneCountry(pending.adminPhoneCountry);

        const supabase = createSupabaseClient();
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !sessionData.session) {
          window.localStorage.removeItem(GOOGLE_SIGNUP_STORAGE_KEY);
          return;
        }

        const user = sessionData.session.user;
        if (!user?.email) {
          setError('Google account did not return an email address.');
          window.localStorage.removeItem(GOOGLE_SIGNUP_STORAGE_KEY);
          return;
        }
        setIsGoogleConnected(true);
        setGoogleAccountEmail(user.email);
        window.localStorage.removeItem(GOOGLE_SIGNUP_STORAGE_KEY);
      } catch {
        setError('Google connection could not be completed. Please try again.');
        window.localStorage.removeItem(GOOGLE_SIGNUP_STORAGE_KEY);
      } finally {
        setIsSubmitting(false);
        isHandlingGoogleCallback.current = false;
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

  const isStoreNameValid = formData.name.trim().length > 0;
  const isSubdomainValid =
    formData.subdomain.trim().length >= 3 &&
    formData.subdomain.trim().length <= 63 &&
    /^[a-z0-9-]+$/.test(formData.subdomain.trim());
  const hasConfirmedSubdomainAvailability = isSubdomainAvailable === true;
  const isBusinessTypeValid =
    Boolean(businessType) && (businessType !== 'Other' || Boolean(otherBusinessType.trim()));
  const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail.trim());
  const isPasswordValid = adminPassword.length >= 8;
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#eff6ff] via-[#fcfeff] to-white px-4 pb-8 pt-8 md:px-6 md:py-10">
      <div className="mx-auto w-full max-w-[408px] md:max-w-2xl">
        <div className="mb-8 flex justify-center">
          <Link href="/" className="relative flex h-10 w-[170px] items-center justify-center">
            {!logoError ? (
              <img
                src="/logo_with_name.png"
                alt="DukaNest"
                className="h-10 w-auto object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <span className="text-3xl font-black leading-none text-[#355cad]">DukaNest</span>
            )}
          </Link>
        </div>

        <div className="rounded-2xl border border-[#e5e7eb] bg-white px-6 py-6 shadow-[0_10px_15px_rgba(0,0,0,0.1),0_4px_6px_rgba(0,0,0,0.1)] md:px-8">
          <h1 className="text-center text-[24px] font-black leading-8 tracking-[0.07px] text-[#101828]">
            Start your 14-day free trial
          </h1>

          {error && (
            <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <Button
            type="button"
            onClick={handleGoogleSignup}
            disabled={isSubmitting}
            variant="outline"
            className="mt-6 h-[59px] w-full rounded-2xl border-[1.7px] border-[#d1d5dc] bg-white text-base font-semibold text-[#101828] shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.1)] hover:bg-white active:bg-white disabled:opacity-100 disabled:text-[#101828]"
          >
            {isSubmitting && !useEmailSignup ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Redirecting to Google...
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" className="mr-2 h-5 w-5" aria-hidden="true">
                  <path fill="#EA4335" d="M12 11.818v3.709h5.236c-.23 1.191-1.616 3.491-5.236 3.491-3.155 0-5.727-2.61-5.727-5.818s2.572-5.818 5.727-5.818c1.8 0 3.009.773 3.7 1.436l2.518-2.455C16.609 4.855 14.509 4 12 4 6.982 4 2.909 8.073 2.909 13.091S6.982 22.182 12 22.182c5.273 0 8.764-3.7 8.764-8.909 0-.6-.064-1.055-.145-1.455H12z" />
                  <path fill="#34A853" d="M3.964 8.955l3.055 2.241C7.846 9.009 9.724 7.382 12 7.382c1.8 0 3.009.773 3.7 1.436l2.518-2.455C16.609 4.855 14.509 4 12 4 8.509 4 5.482 5.991 3.964 8.955z" />
                  <path fill="#FBBC05" d="M12 22.182c2.455 0 4.518-.809 6.024-2.191l-2.782-2.282c-.773.536-1.764.909-3.242.909-3.591 0-6.636-2.427-7.727-5.691l-3.155 2.427C2.618 19.255 6.982 22.182 12 22.182z" />
                  <path fill="#4285F4" d="M20.764 13.273c0-.6-.064-1.055-.145-1.455H12v3.709h5.236c-.255 1.273-1.018 2.327-2.176 3.036l2.782 2.282c1.618-1.491 2.922-3.7 2.922-7.572z" />
                </svg>
                Continue with Google
              </>
            )}
          </Button>
          {isGoogleConnected && (
            <p className="mt-2 text-center text-xs text-[#00a63e]">
              {`Google connected${googleAccountEmail ? `: ${googleAccountEmail}` : ''}`}
            </p>
          )}

          <button
            type="button"
            onClick={() => {
              setError(null);
              setUseEmailSignup((prev) => !prev);
            }}
            className="mt-6 w-full text-center text-base font-semibold text-[#6a7282]"
          >
            {useEmailSignup
              ? 'Use Google instead'
              : 'Or continue with email and password'}
          </button>

          <form onSubmit={handleSubmit} className="mt-3 space-y-4">
            {useEmailSignup && (
              <div className="space-y-4 rounded-2xl border border-[#e5e7eb] bg-white p-4">
                <div>
                  <Label htmlFor="adminEmail" className="text-sm font-bold text-[#101828]">Admin Email</Label>
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
                    aria-invalid={Boolean(fieldErrors.adminEmail)}
                    aria-describedby={fieldErrors.adminEmail ? 'adminEmail-error' : undefined}
                    className={`mt-2 h-[56px] rounded-2xl border-[#e5e7eb] bg-[#f9fafb] ${fieldErrors.adminEmail ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {fieldErrors.adminEmail && <p id="adminEmail-error" className="mt-1 text-xs text-red-600">{fieldErrors.adminEmail}</p>}
                </div>
                <div>
                  <Label htmlFor="adminPassword" className="text-sm font-bold text-[#101828]">Password</Label>
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
                    aria-invalid={Boolean(fieldErrors.adminPassword)}
                    aria-describedby={fieldErrors.adminPassword ? 'adminPassword-error' : undefined}
                    className={`mt-2 h-[56px] rounded-2xl border-[#e5e7eb] bg-[#f9fafb] ${fieldErrors.adminPassword ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {fieldErrors.adminPassword && <p id="adminPassword-error" className="mt-1 text-xs text-red-600">{fieldErrors.adminPassword}</p>}
                </div>
              </div>
            )}

            <div>
              <Label htmlFor="name" className="text-sm font-bold text-[#101828]">Store Name</Label>
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
                placeholder="My Store"
                aria-invalid={Boolean(fieldErrors.name)}
                aria-describedby={fieldErrors.name ? 'name-error' : undefined}
                className={`mt-2 h-[60px] rounded-2xl border-[#e5e7eb] bg-[#f9fafb] text-base placeholder:text-[#99a1af] ${fieldErrors.name ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
              />
              {fieldErrors.name && <p id="name-error" className="mt-1 text-xs text-red-600">{fieldErrors.name}</p>}
            </div>

            <div>
              <Label htmlFor="subdomain" className="text-sm font-bold text-[#101828]">Store URL</Label>
              <div className="relative mt-2">
                <Input
                  id="subdomain"
                  type="text"
                  required
                  value={formData.subdomain}
                  onChange={(e) => {
                    markFieldTouched('subdomain');
                    handleSubdomainChange(e.target.value);
                    clearFieldError('subdomain');
                  }}
                  onBlur={() => handleBlur('subdomain')}
                  placeholder="my-store"
                  pattern="[a-z0-9\-]+"
                  aria-invalid={Boolean(fieldErrors.subdomain)}
                  aria-describedby={fieldErrors.subdomain ? 'subdomain-error' : undefined}
                  className={`h-[60px] rounded-2xl border-[#e5e7eb] bg-[#f9fafb] pr-12 text-base placeholder:text-[#99a1af] ${fieldErrors.subdomain ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {formData.subdomain.trim() && !fieldErrors.subdomain && isSubdomainAvailable === true && (
                  <span className="absolute right-3 top-1/2 inline-flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-[#dcfce7]">
                    <Check className="h-4 w-4 text-[#00a63e]" />
                  </span>
                )}
              </div>
              <p className="mt-2 text-sm text-[#6a7282]">
                {(process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com').replace(/^\./, '')}/
                <span className="font-semibold text-[#355cad]">{formData.subdomain || 'my-store'}</span>
              </p>
              {fieldErrors.subdomain ? (
                <p id="subdomain-error" className="mt-1 text-xs text-red-600">{fieldErrors.subdomain}</p>
              ) : isCheckingSubdomain ? (
                <p className="mt-1 text-xs text-[#6a7282]">Checking availability...</p>
              ) : isSubdomainAvailable === true ? (
                <p className="mt-1 flex items-center gap-1 text-sm font-medium text-[#00a63e]">
                  <Check className="h-4 w-4" />
                  Available
                </p>
              ) : isSubdomainAvailable === false ? (
                <p className="mt-1 text-xs text-red-600">Subdomain taken — choose another</p>
              ) : (
                <p className="mt-1 text-xs text-[#6a7282]">Choose a unique subdomain</p>
              )}
            </div>

            <div>
              <Label htmlFor="business-type" className="text-sm font-bold text-[#101828]">
                Business Type
              </Label>
              <Select
                value={businessType}
                onValueChange={(value) => {
                  setBusinessType(value);
                  clearFieldError('businessType');
                  clearFieldError('otherBusinessType');
                }}
              >
                <SelectTrigger
                  id="business-type"
                  aria-invalid={Boolean(fieldErrors.businessType)}
                  aria-describedby={fieldErrors.businessType ? 'businessType-error' : undefined}
                  className={`mt-2 h-[60px] rounded-2xl border-[#e5e7eb] bg-[#f9fafb] ${
                    fieldErrors.businessType ? 'border-red-500 focus-visible:ring-red-500' : ''
                  }`}
                >
                  <SelectValue placeholder="Select your business type" />
                </SelectTrigger>
                <SelectContent>
                  {businessTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value} className="py-2">
                      <div className="flex flex-col">
                        <span className="font-medium">{type.value}</span>
                        <span className="text-xs text-[#6a7282]">{type.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {businessType === 'Other' && (
                <div className="mt-2">
                  <Input
                    id="otherBusinessType"
                    placeholder="Enter your business type"
                    value={otherBusinessType}
                    onChange={(e) => {
                      setOtherBusinessType(e.target.value);
                      clearFieldError('otherBusinessType');
                    }}
                    required={businessType === 'Other'}
                    aria-invalid={Boolean(fieldErrors.otherBusinessType)}
                    aria-describedby={fieldErrors.otherBusinessType ? 'otherBusinessType-error' : undefined}
                    className={`h-[60px] rounded-2xl border-[#e5e7eb] bg-[#f9fafb] ${fieldErrors.otherBusinessType ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                  />
                  {fieldErrors.otherBusinessType && (
                    <p id="otherBusinessType-error" className="mt-1 text-xs text-red-600">{fieldErrors.otherBusinessType}</p>
                  )}
                </div>
              )}
              {fieldErrors.businessType && (
                <p id="businessType-error" className="mt-1 text-xs text-red-600">{fieldErrors.businessType}</p>
              )}
            </div>

            <div>
              <Label htmlFor="selling" className="text-sm font-bold text-[#101828]">What are you selling?</Label>
              <Input
                id="selling"
                type="text"
                value={selling}
                onChange={(e) => setSelling(e.target.value)}
                placeholder="What are you selling"
                className="mt-2 h-[60px] rounded-2xl border-[#e5e7eb] bg-[#f9fafb] text-base placeholder:text-[#99a1af]"
              />
            </div>

            <RegistrationPhoneField
              countryCode={adminPhoneCountry}
              nationalNumber={adminPhone}
              onCountryCodeChange={(code) => {
                setAdminPhoneCountry(code);
                clearFieldError('adminPhone');
              }}
              onNationalNumberChange={(value) => {
                setAdminPhone(value);
                clearFieldError('adminPhone');
              }}
              onNationalBlur={() => handleBlur('adminPhone')}
              error={fieldErrors.adminPhone}
              disabled={isSubmitting}
            />

            <div className="rounded-2xl border border-[#dbeafe] bg-[#eff6ff] p-4">
              <p className="text-sm font-semibold text-[#101828]">We will customize your store based on what you are selling</p>
              <p className="mt-1 text-sm text-[#4a5565]">
                We&apos;ll add demo products so you can see how your store looks right away
              </p>
            </div>

            <p className="px-2 text-center text-sm text-[#6a7282]">
              By continuing, you agree to our{' '}
              <Link href="/terms" className="font-semibold text-[#355cad]">Terms</Link>{' '}
              and{' '}
              <Link href="/privacy" className="font-semibold text-[#355cad]">Privacy Policy</Link>
            </p>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="h-[68px] w-full rounded-2xl bg-gradient-to-b from-[#355cad] to-[#4a7bd9] text-[18px] font-bold tracking-[-0.44px] text-white shadow-[0_10px_15px_rgba(43,127,255,0.3),0_4px_6px_rgba(43,127,255,0.3)] hover:from-[#355cad] hover:to-[#4a7bd9]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {useEmailSignup ? 'Creating store...' : 'Redirecting...'}
                </>
              ) : (
                'Create My Store'
              )}
            </Button>

            {isLoadingPlans && (
              <p className="text-center text-xs text-[#6a7282]">Loading plan details in background...</p>
            )}
          </form>
        </div>

      </div>
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

