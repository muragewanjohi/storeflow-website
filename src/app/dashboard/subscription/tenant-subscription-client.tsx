/**
 * Tenant Subscription Client Component
 * 
 * Displays subscription information, usage, and upgrade options for tenants
 * Following best practices from Shopify, Stripe, and other e-commerce platforms
 * 
 * Day 25-26: Subscription Management
 */

'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon,
  CreditCardIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Tenant } from '@/lib/tenant-context';
import { isKenyaCountry, resolvePlanMonthlyPrice, formatPrice } from '@/lib/pricing/location';
import { trackMetaPixelEvent } from '@/lib/analytics/meta-pixel';
import { toast } from 'sonner';

interface PricePlan {
  id: string;
  name: string;
  price: number;
  price_kes?: number | null;
  duration_months: number;
  trial_days?: number | null;
  features: any;
}

interface UsageStats {
  products: number;
  orders: number;
  pages: number;
  blogs: number;
  customers: number;
}

interface PlanLimits {
  max_products: number | null;
  max_orders: number | null;
  max_pages: number | null;
  max_blogs: number | null;
  max_customers: number | null;
  max_storage_mb: number | null;
}

interface BillingHistoryItem {
  id: string;
  type: string;
  description: string;
  amount: number;
  currency?: string;
  status: string;
  date: Date | string;
  expireDate?: Date | string | null;
}

interface TenantSubscriptionClientProps {
  tenant: Tenant;
  currentPlan: PricePlan | null;
  scheduledPlan?: PricePlan | null;
  scheduledPlanChangeDate?: Date | string | null;
  availablePlans: PricePlan[];
  usageStats: UsageStats;
  planLimits: PlanLimits;
}

function formatDate(date: Date | null | string): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatDateShort(date: Date | null | string): string {
  if (!date) return 'N/A';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getDaysUntil(date: Date | null | string): number {
  if (!date) return 0;
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diff = d.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function getStatusBadge(status: string | null) {
  switch (status) {
    case 'active':
      return <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>;
    case 'expired':
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">Expired (Grace Period)</Badge>;
    case 'suspended':
      return <Badge variant="destructive">Suspended</Badge>;
    default:
      return <Badge variant="outline">Unknown</Badge>;
  }
}

function calculateUsagePercentage(current: number, limit: number | null): number {
  if (!limit || limit === -1) return 0; // Unlimited
  return Math.min((current / limit) * 100, 100);
}

function getUsageColor(percentage: number): string {
  if (percentage >= 90) return 'bg-red-500';
  if (percentage >= 75) return 'bg-yellow-500';
  return 'bg-green-500';
}

export default function TenantSubscriptionClient({
  tenant,
  currentPlan,
  scheduledPlan,
  scheduledPlanChangeDate,
  availablePlans,
  usageStats,
  planLimits,
}: Readonly<TenantSubscriptionClientProps>) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [showDowngradeDialog, setShowDowngradeDialog] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [selectedPlanName, setSelectedPlanName] = useState<string | null>(null);
  
  // Payment state
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [billingInterval, setBillingInterval] = useState<'monthly' | 'yearly'>('monthly');
  const [pesapalLoading, setPesapalLoading] = useState(false);

  // PesaPal config (yearly discount %)
  const { data: pesapalConfig } = useQuery({
    queryKey: ['pesapal-subscription-config'],
    queryFn: async () => {
      const res = await fetch('/api/pesapal/subscription/config');
      if (!res.ok) return { yearlyDiscountPercent: 17 };
      const data = await res.json();
      return { yearlyDiscountPercent: data.yearlyDiscountPercent ?? 17 };
    },
  });
  const yearlyDiscountPercent = pesapalConfig?.yearlyDiscountPercent ?? 17;

  const isKenya = isKenyaCountry(tenant?.country);
  const currencySymbol = isKenya ? 'Ksh' : '$';
  const getDisplayPrice = (plan: Pick<PricePlan, 'price' | 'price_kes'>) =>
    resolvePlanMonthlyPrice({ price: plan.price, price_kes: plan.price_kes }, isKenya);
  const formatPlanPrice = (plan: Pick<PricePlan, 'price' | 'price_kes'>) =>
    formatPrice(getDisplayPrice(plan), currencySymbol);

  const renewalDate = tenant.expire_date ?? null;
  const daysUntilRenewal = getDaysUntil(renewalDate);
  const isExpired = daysUntilRenewal <= 0;
  const isExpiringSoon = daysUntilRenewal > 0 && daysUntilRenewal <= 7;
  const canPayForCurrentPlan = Boolean(
    currentPlan && Number(getDisplayPrice(currentPlan)) > 0
  );

  const openPaymentForCurrentPlan = () => {
    if (!currentPlan || !canPayForCurrentPlan) return;
    setSelectedPlanId(currentPlan.id);
    setSelectedPlanName(currentPlan.name);
    setShowPaymentDialog(true);
  };

  // Handle tab navigation and PesaPal callback params from URL
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['overview', 'usage', 'plans', 'billing'].includes(tabParam)) {
      setActiveTab(tabParam);
      router.replace('/dashboard/subscription', { scroll: false });
    }
    const success = searchParams.get('success');
    const errorParam = searchParams.get('error');
    const subscriptionType = searchParams.get('subscription_type') || 'activation';
    if (success === '1') {
      trackMetaPixelEvent('Subscribe', {
        content_name: 'Subscription payment',
        content_category: subscriptionType === 'renewal' ? 'subscription_renewal' : 'subscription',
        subscription_type: subscriptionType,
        status: 'completed',
      });
      setUpgradeSuccess('Payment successful! Your subscription has been activated.');
      setActiveTab('plans');
      router.replace('/dashboard/subscription?tab=plans', { scroll: false });
    } else if (errorParam) {
      const messages: Record<string, string> = {
        missing_params: 'Invalid return from payment. Please try again.',
        payment_failed: 'Payment was not completed. Please try again.',
        payment_not_found: 'Payment record not found. Please contact support.',
        plan_not_found: 'Plan not found. Please contact support.',
        callback_failed: 'We couldn’t confirm your payment. Please contact support if you were charged.',
      };
      setUpgradeError(messages[errorParam] ?? `Payment error: ${errorParam}`);
      setActiveTab('plans');
      router.replace('/dashboard/subscription?tab=plans', { scroll: false });
    }

    const renewParam = searchParams.get('renew');
    if (renewParam === '1' && currentPlan && canPayForCurrentPlan) {
      setSelectedPlanId(currentPlan.id);
      setSelectedPlanName(currentPlan.name);
      setShowPaymentDialog(true);
      router.replace('/dashboard/subscription', { scroll: false });
    }
  }, [searchParams, router, currentPlan, canPayForCurrentPlan]);

  // Fetch billing history
  const { data: billingData, isLoading: isLoadingBilling } = useQuery({
    queryKey: ['subscription-billing'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/subscription/billing');
      if (!response.ok) throw new Error('Failed to fetch billing history');
      return response.json();
    },
  });

  const nextBillingDate = renewalDate;

  const handleUpgrade = async (planId: string, isDowngrade: boolean = false) => {
    setIsUpgrading(true);
    setUpgradeError(null);
    setUpgradeSuccess(null);

    try {
      const response = await fetch('/api/dashboard/subscription/activate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan_id: planId }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to activate subscription');
      }

      const data = await response.json();
      
      // Show detailed success message based on change type
      if (data.changeType === 'downgrade') {
        const effectiveDate = data.effectiveDate 
          ? new Date(data.effectiveDate).toLocaleDateString()
          : 'next billing cycle';
        setUpgradeSuccess(
          `Downgrade scheduled successfully! Your plan will change to ${data.plan?.name || 'the new plan'} on ${effectiveDate}. ` +
          `You'll continue to have access to your current plan features until then.`
        );
      } else if (data.changeType === 'upgrade') {
        const proratedMsg = data.proratedAmount && data.proratedAmount > 0
          ? ` You've been charged a prorated amount of ${formatPrice(Number(data.proratedAmount), currencySymbol)} for the remaining days in your billing cycle.`
          : '';
        setUpgradeSuccess(
          `Upgrade successful! Your plan has been upgraded to ${data.plan?.name || 'the new plan'} and is now active.${proratedMsg}`
        );
      } else {
        setUpgradeSuccess(data.message || 'Subscription activated successfully!');
      }
      
      // Refresh the page after a short delay to show the success message
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    } catch (error) {
      setUpgradeError(error instanceof Error ? error.message : 'Failed to activate subscription');
    } finally {
      setIsUpgrading(false);
      setShowDowngradeDialog(false);
      setSelectedPlanId(null);
      setSelectedPlanName(null);
    }
  };

  // PesaPal payment handler: initiate then load PesaPal in our page (embedded iframe)
  const handlePesapalPayment = async (planId: string) => {
    setPesapalLoading(true);
    setUpgradeError(null);
    try {
      const response = await fetch('/api/pesapal/subscription/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: planId,
          billing_interval: billingInterval,
          enable_recurring: false,
          embed: true,
        }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to initiate payment');
      }
      const data = await response.json();
      if (data.redirect_url) {
        const checkoutUrl = `/dashboard/subscription/pesapal-checkout?redirect_url=${encodeURIComponent(data.redirect_url)}`;
        window.location.href = checkoutUrl;
        return;
      }
      throw new Error('No redirect URL received');
    } catch (error) {
      setUpgradeError(error instanceof Error ? error.message : 'Payment initiation failed');
      setPesapalLoading(false);
    }
  };

  // Yearly price from monthly with discount (client-side display)
  const getYearlyPriceDisplay = (monthlyPrice: number) => {
    const discount = yearlyDiscountPercent / 100;
    return Math.round(monthlyPrice * 12 * (1 - discount) * 100) / 100;
  };

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-7xl">
      {pesapalLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="rounded-xl border bg-card p-6 text-center shadow-lg">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
            <p className="mt-4 text-sm font-medium">Preparing secure checkout...</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Please wait while we connect you to PesaPal.
            </p>
          </div>
        </div>
      )}
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Subscription & Billing</h1>
        <p className="text-muted-foreground mt-2">
          Manage your subscription plan, view usage, and billing history
        </p>
      </div>

      {/* Key Information Banner */}
      {currentPlan && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Current Plan</p>
                <p className="text-xl font-bold">{currentPlan.name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Monthly Price</p>
                <p className="text-xl font-bold">
                  {formatPlanPrice(currentPlan)}
                  <span className="text-sm font-normal text-muted-foreground">
                    {' '}/ {currentPlan.duration_months === 1 ? 'month' : `${currentPlan.duration_months} months`}
                  </span>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  {currentPlan?.trial_days && currentPlan.trial_days > 0 && daysUntilRenewal > 0 && daysUntilRenewal <= currentPlan.trial_days
                    ? 'Trial Expires'
                    : 'Renewal Date'}
                </p>
                <div className="text-xl font-bold flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  {formatDateShort(renewalDate)}
                  {isExpiringSoon && (
                    <Badge variant="destructive" className="ml-2 text-xs">
                      {daysUntilRenewal} days
                    </Badge>
                  )}
                  {currentPlan?.trial_days && currentPlan.trial_days > 0 && daysUntilRenewal > 0 && daysUntilRenewal <= currentPlan.trial_days && (
                    <Badge variant="secondary" className="ml-2 text-xs bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      Trial
                    </Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground mb-1">Status</p>
                <div className="mt-1">{getStatusBadge(tenant.status)}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Scheduled Downgrade Notice */}
      {scheduledPlan && scheduledPlanChangeDate && (
        <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="h-5 w-5 mt-0.5 text-blue-600 dark:text-blue-400 flex-shrink-0" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Plan Downgrade Scheduled
                </p>
                <p className="text-sm mt-1 text-blue-800 dark:text-blue-200">
                  Your plan will downgrade from <strong>{currentPlan?.name || 'Current Plan'}</strong> to{' '}
                  <strong>{scheduledPlan.name}</strong> on{' '}
                  <strong>{formatDate(scheduledPlanChangeDate)}</strong>.
                </p>
                <p className="text-sm mt-2 text-blue-800 dark:text-blue-200">
                  You&apos;ll continue to have access to your current plan features until then. 
                  No refunds will be issued for the current billing period.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Expired subscription renewal */}
      {isExpired && currentPlan && canPayForCurrentPlan && (
        <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <ClockIcon className="h-5 w-5 mt-0.5 flex-shrink-0 text-yellow-600 dark:text-yellow-400" />
                <div>
                  <p className="font-semibold text-yellow-900 dark:text-yellow-100">
                    Subscription Expired
                  </p>
                  <p className="text-sm mt-1 text-yellow-800 dark:text-yellow-200">
                    Your subscription expired on <strong>{formatDate(renewalDate)}</strong>.
                    Pay now to restore full access and continue using your store.
                  </p>
                </div>
              </div>
              <Button
                onClick={openPaymentForCurrentPlan}
                disabled={pesapalLoading}
                className="sm:flex-shrink-0 bg-yellow-600 hover:bg-yellow-700"
              >
                {pesapalLoading ? 'Processing...' : 'Renew now'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Trial/Expiry Warning */}
      {isExpiringSoon && currentPlan && (
        <Card className={`${
          currentPlan.trial_days && currentPlan.trial_days > 0 && daysUntilRenewal > 0 && daysUntilRenewal <= currentPlan.trial_days
            ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
            : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
        }`}>
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <ClockIcon className={`h-5 w-5 mt-0.5 flex-shrink-0 ${
                  currentPlan.trial_days && currentPlan.trial_days > 0 && daysUntilRenewal > 0 && daysUntilRenewal <= currentPlan.trial_days
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-yellow-600 dark:text-yellow-400'
                }`} />
                <div>
                  <p className={`font-semibold ${
                    currentPlan.trial_days && currentPlan.trial_days > 0 && daysUntilRenewal > 0 && daysUntilRenewal <= currentPlan.trial_days
                      ? 'text-blue-900 dark:text-blue-100'
                      : 'text-yellow-900 dark:text-yellow-100'
                  }`}>
                    {currentPlan.trial_days && currentPlan.trial_days > 0 && daysUntilRenewal > 0 && daysUntilRenewal <= currentPlan.trial_days
                      ? 'Trial Period Ending Soon'
                      : 'Renewal Reminder'}
                  </p>
                  <p className={`text-sm mt-1 ${
                    currentPlan.trial_days && currentPlan.trial_days > 0 && daysUntilRenewal > 0 && daysUntilRenewal <= currentPlan.trial_days
                      ? 'text-blue-800 dark:text-blue-200'
                      : 'text-yellow-800 dark:text-yellow-200'
                  }`}>
                    {currentPlan.trial_days && currentPlan.trial_days > 0 && daysUntilRenewal > 0 && daysUntilRenewal <= currentPlan.trial_days
                      ? `Your ${currentPlan.trial_days}-day free trial expires on ` : 'Your subscription will renew on '}
                    <strong>{formatDate(renewalDate)}</strong> ({daysUntilRenewal} day{daysUntilRenewal !== 1 ? 's' : ''}).
                    {currentPlan.trial_days && currentPlan.trial_days > 0 && daysUntilRenewal > 0 && daysUntilRenewal <= currentPlan.trial_days
                      ? ' Subscribe now to continue using the service.'
                      : ' Pay now to avoid interruption.'}
                  </p>
                </div>
              </div>
              {canPayForCurrentPlan && (
                <Button
                  onClick={openPaymentForCurrentPlan}
                  disabled={pesapalLoading}
                  className="sm:flex-shrink-0"
                >
                  {pesapalLoading ? 'Processing...' : 'Pay now'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="usage"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Usage & Limits
            <ChartBarIcon className="ml-2 h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger 
            value="plans"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Plans & Pricing
            <CreditCardIcon className="ml-2 h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger 
            value="billing"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Billing History
            <DocumentTextIcon className="ml-2 h-4 w-4" />
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Current Subscription Details */}
          <Card>
            <CardHeader>
              <CardTitle>Subscription Details</CardTitle>
              <CardDescription>Your current subscription information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {currentPlan ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Plan Name</p>
                        <p className="text-lg font-semibold">{currentPlan.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Billing Cycle</p>
                        <p className="text-lg font-semibold">
                          Every {currentPlan.duration_months} {currentPlan.duration_months === 1 ? 'month' : 'months'}
                        </p>
                        {currentPlan.trial_days && currentPlan.trial_days > 0 && daysUntilRenewal > 0 && daysUntilRenewal <= currentPlan.trial_days && (
                          <Badge variant="secondary" className="mt-2 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                            {daysUntilRenewal} day{daysUntilRenewal !== 1 ? 's' : ''} left in trial
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Next Billing Date</p>
                        <p className="text-lg font-semibold flex items-center gap-2">
                          <CalendarIcon className="h-5 w-5" />
                          {formatDate(nextBillingDate)}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Subscription Status</p>
                        <div className="mt-1">{getStatusBadge(tenant.status)}</div>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Started</p>
                      <p className="font-semibold">
                        {formatDate(tenant.created_at)}
                      </p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Expires</p>
                      <p className="font-semibold">{formatDate(tenant.expire_date ?? null)}</p>
                    </div>
                    <div className="p-4 bg-muted/50 rounded-lg">
                      <p className="text-sm text-muted-foreground mb-1">Days Until Renewal</p>
                      <p className="font-semibold text-lg">
                        {daysUntilRenewal > 0 ? `${daysUntilRenewal} days` : 'Expired'}
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-12">
                  <XCircleIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <p className="text-xl font-semibold mb-2">No Active Subscription</p>
                  <p className="text-muted-foreground mb-6">
                    Please select a plan to get started with your store
                  </p>
                  <Button onClick={() => {
                    const plansTab = document.querySelector('[value="plans"]') as HTMLElement;
                    plansTab?.click();
                  }}>
                    View Available Plans
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Usage & Limits Tab */}
        <TabsContent value="usage" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Usage Statistics</CardTitle>
              <CardDescription>Current usage vs your plan limits</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Products */}
              {planLimits.max_products !== null && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Products</span>
                    <span className="text-sm text-muted-foreground">
                      {usageStats.products} / {planLimits.max_products === -1 ? '∞ Unlimited' : planLimits.max_products}
                    </span>
                  </div>
                  {planLimits.max_products !== -1 && (
                    <>
                      <Progress
                        value={calculateUsagePercentage(usageStats.products, planLimits.max_products)}
                        className="h-2"
                      />
                      {calculateUsagePercentage(usageStats.products, planLimits.max_products) >= 90 && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          ⚠️ Approaching limit. Consider upgrading your plan.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Orders */}
              {planLimits.max_orders !== null && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Orders</span>
                    <span className="text-sm text-muted-foreground">
                      {usageStats.orders} / {planLimits.max_orders === -1 ? '∞ Unlimited' : planLimits.max_orders}
                    </span>
                  </div>
                  {planLimits.max_orders !== -1 && (
                    <>
                      <Progress
                        value={calculateUsagePercentage(usageStats.orders, planLimits.max_orders)}
                        className="h-2"
                      />
                      {calculateUsagePercentage(usageStats.orders, planLimits.max_orders) >= 90 && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                          ⚠️ Approaching limit. Consider upgrading your plan.
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}

              {/* Pages */}
              {planLimits.max_pages !== null && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Pages</span>
                    <span className="text-sm text-muted-foreground">
                      {usageStats.pages} / {planLimits.max_pages === -1 ? '∞ Unlimited' : planLimits.max_pages}
                    </span>
                  </div>
                  {planLimits.max_pages !== -1 && (
                    <Progress
                      value={calculateUsagePercentage(usageStats.pages, planLimits.max_pages)}
                      className="h-2"
                    />
                  )}
                </div>
              )}

              {/* Blogs */}
              {planLimits.max_blogs !== null && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Blogs</span>
                    <span className="text-sm text-muted-foreground">
                      {usageStats.blogs} / {planLimits.max_blogs === -1 ? '∞ Unlimited' : planLimits.max_blogs}
                    </span>
                  </div>
                  {planLimits.max_blogs !== -1 && (
                    <Progress
                      value={calculateUsagePercentage(usageStats.blogs, planLimits.max_blogs)}
                      className="h-2"
                    />
                  )}
                </div>
              )}

              {/* Customers */}
              {planLimits.max_customers !== null && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Customers</span>
                    <span className="text-sm text-muted-foreground">
                      {usageStats.customers} / {planLimits.max_customers === -1 ? '∞ Unlimited' : planLimits.max_customers}
                    </span>
                  </div>
                  {planLimits.max_customers !== -1 && (
                    <Progress
                      value={calculateUsagePercentage(usageStats.customers, planLimits.max_customers)}
                      className="h-2"
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Plans & Pricing Tab */}
        <TabsContent value="plans" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Available Plans</CardTitle>
              <CardDescription>Upgrade or change your subscription plan</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {availablePlans.map((plan: any) => {
                  const isCurrentPlan = plan.id === currentPlan?.id;
                  const currentDisplayPrice = currentPlan ? getDisplayPrice(currentPlan) : 0;
                  const planDisplayPrice = getDisplayPrice(plan);
                  const isUpgrade = currentPlan && planDisplayPrice > currentDisplayPrice;
                  const isDowngrade = currentPlan && planDisplayPrice < currentDisplayPrice;
                  const features = (plan.features as any) || {};

                  return (
                    <Card
                      key={plan.id}
                      className={`relative ${isCurrentPlan ? 'border-primary border-2 shadow-lg' : ''}`}
                    >
                      {isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                          <Badge className="bg-primary">Current Plan</Badge>
                        </div>
                      )}
                      <CardHeader>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <div className="mt-4">
                          <span className="text-4xl font-bold">{formatPlanPrice(plan)}</span>
                          <span className="text-muted-foreground ml-2">
                            / {plan.duration_months === 1 ? 'month' : `${plan.duration_months} months`}
                          </span>
                        </div>
                        {plan.trial_days && plan.trial_days > 0 && (
                          <div className="mt-2">
                            <Badge variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                              {plan.trial_days}-day free trial
                            </Badge>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <ul className="space-y-3 text-sm">
                          {features.max_products !== undefined && (
                            <li className="flex items-center gap-2">
                              <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                              <span>
                                {features.max_products === -1
                                  ? 'Unlimited Products'
                                  : `${features.max_products.toLocaleString()} Products`}
                              </span>
                            </li>
                          )}
                          {features.max_orders !== undefined && (
                            <li className="flex items-center gap-2">
                              <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                              <span>
                                {features.max_orders === -1
                                  ? 'Unlimited Orders'
                                  : `${features.max_orders.toLocaleString()} Orders`}
                              </span>
                            </li>
                          )}
                          {features.max_storage_mb !== undefined && (
                            <li className="flex items-center gap-2">
                              <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                              <span>
                                {features.max_storage_mb === -1
                                  ? 'Unlimited Storage'
                                  : `${(features.max_storage_mb / 1024).toFixed(0)} GB Storage`}
                              </span>
                            </li>
                          )}
                          {features.max_customers !== undefined && (
                            <li className="flex items-center gap-2">
                              <CheckCircleIcon className="h-5 w-5 text-green-500 flex-shrink-0" />
                              <span>
                                {features.max_customers === -1
                                  ? 'Unlimited Customers'
                                  : `${features.max_customers.toLocaleString()} Customers`}
                              </span>
                            </li>
                          )}
                        </ul>

                        {isCurrentPlan ? (
                          <Button disabled className="w-full" variant="outline">
                            Current Plan
                          </Button>
                        ) : (
                          <>
                            <Button
                              onClick={() => {
                                if (isDowngrade) {
                                  setSelectedPlanId(plan.id);
                                  setSelectedPlanName(plan.name);
                                  setShowDowngradeDialog(true);
                                } else {
                                  // For upgrades/new subscriptions, show payment option
                                  if (getDisplayPrice(plan) > 0) {
                                    setSelectedPlanId(plan.id);
                                    setSelectedPlanName(plan.name);
                                    setShowPaymentDialog(true);
                                  } else {
                                    // Free plan, activate directly
                                    handleUpgrade(plan.id, false);
                                  }
                                }
                              }}
                              disabled={isUpgrading || pesapalLoading}
                              className="w-full"
                              variant={isUpgrade ? 'default' : 'outline'}
                            >
                              {isUpgrading || pesapalLoading ? (
                                'Processing...'
                              ) : isUpgrade ? (
                                <>
                                  <ArrowUpIcon className="mr-2 h-4 w-4" />
                                  Upgrade to {plan.name}
                                </>
                              ) : isDowngrade ? (
                                <>
                                  <ArrowDownIcon className="mr-2 h-4 w-4" />
                                  Downgrade to {plan.name}
                                </>
                              ) : (
                                `Switch to ${plan.name}`
                              )}
                            </Button>
                            {isDowngrade && (
                              <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                                <InformationCircleIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>
                                  Downgrades take effect at the end of your current billing cycle. 
                                  You&apos;ll keep current plan features until then.
                                </span>
                              </p>
                            )}
                            {isUpgrade && (
                              <p className="text-xs text-muted-foreground mt-2 flex items-start gap-1">
                                <InformationCircleIcon className="h-3 w-3 mt-0.5 flex-shrink-0" />
                                <span>
                                  Upgrades take effect immediately. You may be charged a prorated amount 
                                  for the remaining days in your billing cycle.
                                </span>
                              </p>
                            )}
                          </>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {upgradeError && (
                <div className="mt-6 p-4 bg-destructive/10 border border-destructive rounded-lg">
                  <p className="text-sm text-destructive">{upgradeError}</p>
                </div>
              )}

              {upgradeSuccess && (
                <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                  <p className="text-sm text-green-800 dark:text-green-200">{upgradeSuccess}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing History Tab */}
        <TabsContent value="billing" className="space-y-6">
          {/* Pay now card: show when due within 7 days (best practice: renewal CTA in billing) */}
          {(isExpired || isExpiringSoon) && currentPlan && canPayForCurrentPlan && (
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div>
                    <p className="font-semibold">
                      {isExpired ? 'Subscription expired' : 'Renewal due soon'}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {isExpired ? (
                        <>
                          Your subscription expired on <strong>{formatDate(renewalDate)}</strong>.
                          Pay now to restore full access.
                        </>
                      ) : (
                        <>
                          Your subscription renews on <strong>{formatDate(renewalDate)}</strong> ({daysUntilRenewal} day{daysUntilRenewal !== 1 ? 's' : ''}). Pay now to avoid interruption.
                        </>
                      )}
                    </p>
                  </div>
                  <Button
                    onClick={openPaymentForCurrentPlan}
                    disabled={pesapalLoading}
                  >
                    {pesapalLoading ? 'Processing...' : isExpired ? 'Renew now' : 'Pay now'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Billing History</CardTitle>
              <CardDescription>View your subscription and payment history</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoadingBilling ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Loading billing history...</p>
                </div>
              ) : billingData?.billingHistory && billingData.billingHistory.length > 0 ? (
                <div className="space-y-4">
                  {billingData.billingHistory.map((item: BillingHistoryItem) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{item.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(item.date)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          {item.currency === 'KES' || (isKenya && item.currency !== 'USD')
                            ? formatPrice(Number(item.amount), 'Ksh')
                            : formatPrice(Number(item.amount), currencySymbol)}
                        </p>
                        <Badge
                          variant={
                            item.status === 'active'
                              ? 'default'
                              : item.status === 'expired'
                              ? 'secondary'
                              : 'destructive'
                          }
                          className="mt-1"
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <DocumentTextIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No billing history available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Downgrade Confirmation Dialog */}
      <AlertDialog open={showDowngradeDialog} onOpenChange={setShowDowngradeDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Plan Downgrade</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                You&apos;re about to downgrade to <strong>{selectedPlanName}</strong>.
              </p>
              <p>
                <strong>Important:</strong> Your downgrade will be scheduled for the end of your current billing cycle 
                ({tenant.expire_date ? formatDate(tenant.expire_date) : 'next billing date'}).
              </p>
              <p>
                You&apos;ll continue to have access to your current plan features until then. 
                No refunds will be issued for the current billing period.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedPlanId) {
                  handleUpgrade(selectedPlanId, true);
                }
              }}
            >
              Confirm Downgrade
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Payment dialog: PesaPal only */}
      <AlertDialog
        open={showPaymentDialog}
        onOpenChange={(open) => {
          setShowPaymentDialog(open);
          if (!open) {
            setBillingInterval('monthly');
          }
        }}
      >
        <AlertDialogContent className="sm:max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold tracking-tight">
              Subscribe to {selectedPlanName}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-5 pt-1">
                <p className="text-muted-foreground text-sm">
                  Continue to secure checkout for <strong className="text-foreground">{selectedPlanName}</strong>.
                </p>
                {/* PesaPal: billing interval + amount */}
                {selectedPlanId && availablePlans.find((p: any) => p.id === selectedPlanId) && (() => {
                  const sel = availablePlans.find((p: any) => p.id === selectedPlanId);
                  if (!sel) return null;
                  const monthlyDisplay = getDisplayPrice(sel);
                  const yearlyDisplay = getYearlyPriceDisplay(monthlyDisplay);
                  return (
                  <>
                    <div className="space-y-3">
                      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Billing
                      </Label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          onClick={() => setBillingInterval('monthly')}
                          className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-medium transition-all ${
                            billingInterval === 'monthly'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-muted/20 text-muted-foreground hover:border-muted-foreground/40'
                          }`}
                        >
                          Monthly
                        </button>
                        <button
                          type="button"
                          onClick={() => setBillingInterval('yearly')}
                          className={`flex-1 rounded-lg border-2 py-2.5 text-sm font-medium transition-all ${
                            billingInterval === 'yearly'
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border bg-muted/20 text-muted-foreground hover:border-muted-foreground/40'
                          }`}
                        >
                          Yearly (save {yearlyDiscountPercent}%)
                        </button>
                      </div>
                    </div>
                    <div className="rounded-xl border-2 border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-4">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">Amount to Pay</p>
                      <p className="text-2xl font-bold tracking-tight text-foreground">
                        {billingInterval === 'monthly'
                          ? `${formatPrice(monthlyDisplay, currencySymbol)} / month`
                          : `${formatPrice(yearlyDisplay, currencySymbol)} / year`}
                      </p>
                      {billingInterval === 'yearly' && (
                        <p className="text-xs text-muted-foreground mt-1.5">
                          2 months free when billed annually
                        </p>
                      )}
                    </div>
                    <p className="flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      <CreditCardIcon className="h-4 w-4 shrink-0" />
                      You&apos;ll complete payment on PesaPal (card, mobile money, or other methods). You can stay on our site.
                    </p>
                  </>
                  );
                })()}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={pesapalLoading}
              onClick={() => {
                setBillingInterval('monthly');
              }}
              className="mt-2"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedPlanId && handlePesapalPayment(selectedPlanId)}
              disabled={pesapalLoading}
              className="bg-primary hover:bg-primary/90"
            >
              {pesapalLoading ? 'Redirecting...' : 'Continue to PesaPal'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
