/**
 * Tenant Subscription Client Component
 * 
 * Displays subscription information, usage, and upgrade options for tenants
 * Following best practices from Shopify, Stripe, and other e-commerce platforms
 * 
 * Day 25-26: Subscription Management
 */

'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  CheckCircleIcon,
  XCircleIcon,
  ArrowUpIcon,
  CalendarIcon,
  CreditCardIcon,
  ClockIcon,
  ChartBarIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';
import type { Tenant } from '@/lib/tenant-context';

interface PricePlan {
  id: string;
  name: string;
  price: number;
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
  status: string;
  date: Date | string;
  expireDate?: Date | string | null;
}

interface TenantSubscriptionClientProps {
  tenant: Tenant;
  currentPlan: PricePlan | null;
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
  availablePlans,
  usageStats,
  planLimits,
}: Readonly<TenantSubscriptionClientProps>) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [upgradeSuccess, setUpgradeSuccess] = useState<string | null>(null);

  // Fetch billing history
  const { data: billingData, isLoading: isLoadingBilling } = useQuery({
    queryKey: ['subscription-billing'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/subscription/billing');
      if (!response.ok) throw new Error('Failed to fetch billing history');
      return response.json();
    },
  });

  // Calculate renewal date (same as expire_date for now)
  const renewalDate = tenant.expire_date ?? null;
  const daysUntilRenewal = getDaysUntil(renewalDate);
  const isExpiringSoon = daysUntilRenewal > 0 && daysUntilRenewal <= 7;

  // Calculate next billing date (renewal date)
  const nextBillingDate = renewalDate;

  const handleUpgrade = async (planId: string) => {
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
      setUpgradeSuccess(data.message || 'Subscription activated successfully!');
      
      // Refresh the page after a short delay to show the success message
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      setUpgradeError(error instanceof Error ? error.message : 'Failed to activate subscription');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-7xl">
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
                  ${Number(currentPlan.price).toFixed(2)}
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

      {/* Trial/Expiry Warning */}
      {isExpiringSoon && currentPlan && (
        <Card className={`${
          currentPlan.trial_days && currentPlan.trial_days > 0 && daysUntilRenewal > 0 && daysUntilRenewal <= currentPlan.trial_days
            ? 'border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-900/20'
            : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-900/20'
        }`}>
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <ClockIcon className={`h-5 w-5 mt-0.5 ${
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
                    : daysUntilRenewal <= 3 && ' Please ensure your payment method is up to date.'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="usage">
            Usage & Limits
            <ChartBarIcon className="ml-2 h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="plans">
            Plans & Pricing
            <CreditCardIcon className="ml-2 h-4 w-4" />
          </TabsTrigger>
          <TabsTrigger value="billing">
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
                {availablePlans.map((plan) => {
                  const isCurrentPlan = plan.id === currentPlan?.id;
                  const isUpgrade = currentPlan && Number(plan.price) > Number(currentPlan.price);
                  const isDowngrade = currentPlan && Number(plan.price) < Number(currentPlan.price);
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
                          <span className="text-4xl font-bold">${Number(plan.price).toFixed(2)}</span>
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
                          <Button
                            onClick={() => handleUpgrade(plan.id)}
                            disabled={isUpgrading}
                            className="w-full"
                            variant={isUpgrade ? 'default' : 'outline'}
                          >
                            {isUpgrading ? (
                              'Processing...'
                            ) : isUpgrade ? (
                              <>
                                <ArrowUpIcon className="mr-2 h-4 w-4" />
                                Upgrade to {plan.name}
                              </>
                            ) : (
                              `Switch to ${plan.name}`
                            )}
                          </Button>
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
                        <p className="font-semibold">${Number(item.amount).toFixed(2)}</p>
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
    </div>
  );
}
