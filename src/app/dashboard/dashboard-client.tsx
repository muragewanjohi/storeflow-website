/**
 * Dashboard Client Component
 * 
 * Modern e-commerce dashboard similar to Shopify
 * Shows key metrics, charts, recent orders, and alerts
 * 
 * Day 36: Dashboard enhancement
 */

'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  CubeIcon,
  BellIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowRightIcon,
  ClockIcon,
  EyeIcon,
  ChartBarIcon,
  CheckCircleIcon,
  ClipboardDocumentIcon,
  LinkIcon,
  SignalIcon,
  SparklesIcon,
  ShareIcon,
  FireIcon,
  TruckIcon,
  ArrowUpTrayIcon,
  TrashIcon,
} from '@heroicons/react/24/outline';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';
import { useCurrency } from '@/lib/currency/currency-context';

interface DashboardClientProps {
  tenantName: string;
  isNewTenant: boolean;
  planInfo: { name: string; price: number; duration_months: number; trial_days?: number | null } | null;
  subdomain: string;
  userName: string;
  storeUrl: string;
  tenantStatus: string;
  expireDate: string | null;
  startDate: string | null;
}

interface OverviewData {
  overview: {
    totalOrders: number;
    totalRevenue: number;
    totalCustomers: number;
    totalProducts: number;
  };
  thisMonth: {
    orders: number;
    revenue: number;
    newCustomers: number;
  };
  pendingOrders: number;
  visitorsToday?: number;
}

interface RecentOrder {
  id: string;
  order_number: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
}

interface TopProduct {
  id: string;
  name: string;
  quantity: number;
  revenue: number;
}

interface LowStockItem {
  id: string;
  name: string;
  sku: string | null;
  stock_quantity: number;
  price: number;
}

interface LowStockVariant {
  id: string;
  productId: string;
  productName: string;
  productSku: string | null;
  variantSku: string | null;
  stockQuantity: number;
}

interface GettingStartedItem {
  id: string;
  label: string;
  description: string;
  completed: boolean;
  href: string;
  cta?: string;
  priority?: number;
}

interface GettingStartedData {
  items: GettingStartedItem[];
  completedCount: number;
  totalCount: number;
  progressPercent: number;
  allComplete: boolean;
  storeUrl: string;
  nextAction?: GettingStartedItem | null;
  nextSteps?: GettingStartedItem[];
}

interface DashboardNotificationsResponse {
  unread_count?: number;
}

const ONBOARDING_INLINE_HINTS: Partial<Record<string, string>> = {
  category: '⏱ About a minute',
  product: '⏱ Takes 2 minutes',
  demo_products: 'Keep these until your real catalog is ready',
};

const formatNumber = (num: number) => {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toLocaleString();
};

export default function DashboardClient({
  tenantName,
  isNewTenant,
  planInfo,
  subdomain,
  userName,
  storeUrl,
  tenantStatus,
  expireDate,
  startDate,
}: Readonly<DashboardClientProps>) {
  const { formatCurrency, currency } = useCurrency();
  const [isRemovingDemoProducts, setIsRemovingDemoProducts] = useState(false);
  const today = new Date();
  const thirtyDaysAgo = subDays(today, 30);

  // Fetch overview data
  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['dashboard-overview'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/overview');
      if (!response.ok) return null;
      const data = await response.json();
      return data.data as OverviewData;
    },
  });

  // Fetch revenue trends
  const { data: revenueTrends, isLoading: revenueLoading } = useQuery({
    queryKey: ['dashboard-revenue'],
    queryFn: async () => {
      const startDate = format(thirtyDaysAgo, 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');
      const response = await fetch(`/api/analytics/revenue?startDate=${startDate}&endDate=${endDate}&groupBy=day`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    },
  });

  // Fetch recent orders
  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['dashboard-recent-orders'],
    queryFn: async () => {
      const response = await fetch('/api/orders?limit=5&sortBy=created_at&sortOrder=desc');
      if (!response.ok) return [];
      const data = await response.json();
      return (data.orders || []) as RecentOrder[];
    },
  });

  // Fetch sales data for top products
  const { data: salesData, isLoading: salesLoading } = useQuery({
    queryKey: ['dashboard-sales'],
    queryFn: async () => {
      const startDate = format(thirtyDaysAgo, 'yyyy-MM-dd');
      const endDate = format(today, 'yyyy-MM-dd');
      const response = await fetch(`/api/analytics/sales?startDate=${startDate}&endDate=${endDate}`);
      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    },
  });

  // Fetch inventory data for low stock alerts
  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ['dashboard-inventory'],
    queryFn: async () => {
      const response = await fetch('/api/analytics/inventory');
      if (!response.ok) return null;
      const data = await response.json();
      return data.data;
    },
  });

  // Fetch notifications for mobile header badge state
  const { data: notificationsData } = useQuery({
    queryKey: ['dashboard-mobile-notifications'],
    queryFn: async () => {
      const response = await fetch('/api/notifications');
      if (!response.ok) return { unread_count: 0 } as DashboardNotificationsResponse;
      return (await response.json()) as DashboardNotificationsResponse;
    },
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  });

  // Calculate percentage changes (mock for now - would need previous period data)
  const getPercentChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const isLoading = overviewLoading || revenueLoading || ordersLoading || salesLoading || inventoryLoading;

  // Fetch getting started checklist
  const { data: gettingStarted, isPending: gettingStartedPending, refetch: refetchGettingStarted } = useQuery({
    queryKey: ['dashboard-getting-started'],
    queryFn: async () => {
      const response = await fetch('/api/dashboard/getting-started');
      if (!response.ok) return null;
      const json = await response.json();
      return json.data as GettingStartedData;
    },
  });

  const primaryCatalogCta = useMemo(() => {
    const next = gettingStarted?.nextAction;
    if (next && (next.id === 'category' || next.id === 'product')) {
      return {
        href: next.href,
        label: next.cta || next.label,
      };
    }
    if (isNewTenant && gettingStartedPending) {
      return { href: '/dashboard/categories/new', label: 'Add category' };
    }
    return { href: '/dashboard/products/new', label: 'Add Product' };
  }, [gettingStarted?.nextAction, isNewTenant, gettingStartedPending]);

  const effectiveStoreUrl = gettingStarted?.storeUrl ?? storeUrl;
  const welcomeStoreUrl = effectiveStoreUrl || `https://${subdomain}.${process.env.NEXT_PUBLIC_BASE_DOMAIN || 'dukanest.com'}`;
  const welcomeStoreHost = welcomeStoreUrl.replace(/^https?:\/\//, '').replace(/\/$/, '');

  const handleCopyStoreLink = async () => {
    if (!effectiveStoreUrl) return;
    try {
      await navigator.clipboard.writeText(effectiveStoreUrl);
      if (gettingStarted) {
        await fetch('/api/dashboard/getting-started', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'share_done' }),
        });
        refetchGettingStarted();
      }
      toast.success('Store link copied to clipboard!');
    } catch {
      window.open(effectiveStoreUrl, '_blank');
      toast.info('Opened your store in a new tab');
    }
  };

  const handlePreviewStore = async () => {
    if (!effectiveStoreUrl) return;
    window.open(effectiveStoreUrl, '_blank', 'noopener,noreferrer');
    if (gettingStarted) {
      await fetch('/api/dashboard/getting-started', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'preview_done' }),
      });
      refetchGettingStarted();
    }
  };

  const handleRemoveDemoProducts = async () => {
    try {
      setIsRemovingDemoProducts(true);
      const response = await fetch('/api/products/demo', { method: 'DELETE' });
      const json = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(json?.error || 'Failed to remove demo products');
      }

      const data = json?.data;
      const removedCount = Number(data?.removedCount ?? 0);
      const deletedCount = Number(data?.deletedCount ?? 0);
      const archivedCount = Number(data?.archivedCount ?? 0);

      if (removedCount > 0) {
        toast.success(
          archivedCount > 0
            ? `Removed ${deletedCount} demo product${deletedCount === 1 ? '' : 's'} and archived ${archivedCount} used in orders.`
            : `Removed ${deletedCount} demo product${deletedCount === 1 ? '' : 's'}.`,
        );
      } else {
        toast.info('No active demo products found.');
      }

      refetchGettingStarted();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove demo products');
    } finally {
      setIsRemovingDemoProducts(false);
    }
  };

  // Trial days remaining (only when in trial period)
  const trialDaysRemaining = (() => {
    const trialDays = planInfo?.trial_days;
    if (!trialDays || trialDays <= 0 || !startDate) return null;
    const start = new Date(startDate);
    const now = new Date();
    const daysSinceStart = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    if (daysSinceStart >= trialDays) return null; // Trial over
    return Math.max(0, trialDays - daysSinceStart);
  })();

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'completed':
      case 'delivered':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400';
      case 'processing':
      case 'shipped':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'cancelled':
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400';
    }
  };

  const mobileSetupFallback: GettingStartedItem[] = [
    {
      id: 'category',
      label: 'Create your first category',
      description: 'Organize your catalog so products are easy to find',
      completed: false,
      href: '/dashboard/categories/new',
      cta: 'Add category',
    },
    {
      id: 'product',
      label: 'Add your first product',
      description: '',
      completed: false,
      href: '/dashboard/products/new',
      cta: 'Add product',
    },
    {
      id: 'preview',
      label: 'Preview your store 👀',
      description: '',
      completed: false,
      href: effectiveStoreUrl,
      cta: 'Preview store',
    },
    {
      id: 'share',
      label: 'Share your store 🔗',
      description: '',
      completed: false,
      href: effectiveStoreUrl,
      cta: 'Copy link',
    },
    {
      id: 'contact_phone',
      label: 'Get order alerts via SMS',
      description: 'Add your phone number so you never miss a customer order',
      completed: false,
      href: '/dashboard/settings',
      cta: 'Add phone',
    },
    {
      id: 'payment',
      label: 'Set up checkout preferences',
      description: '',
      completed: false,
      href: '/dashboard/settings',
      cta: 'Set up payments',
    },
    {
      id: 'delivery',
      label: 'Configure delivery & shipping',
      description: '',
      completed: false,
      href: '/dashboard/settings',
      cta: 'Configure shipping',
    },
    {
      id: 'logo',
      label: 'Add your store logo',
      description: '',
      completed: false,
      href: '/dashboard/settings',
      cta: 'Add logo',
    },
  ];

  const mobileSetupItems = gettingStarted?.items?.length ? gettingStarted.items : mobileSetupFallback;
  const mobileSetupCompleted = gettingStarted?.completedCount ?? mobileSetupItems.filter((item) => item.completed).length;
  const mobileSetupTotal = gettingStarted?.totalCount ?? mobileSetupItems.length;
  const mobileSetupProgress = gettingStarted?.progressPercent ?? (mobileSetupTotal > 0 ? (mobileSetupCompleted / mobileSetupTotal) * 100 : 0);

  const safeOverview = overview?.overview;
  const revenueValue = safeOverview?.totalRevenue ?? 0;
  const ordersValue = safeOverview?.totalOrders ?? 0;
  const visitorsValue = overview?.visitorsToday ?? 0;
  const conversionValue = visitorsValue > 0 ? (ordersValue / visitorsValue) * 100 : 0;

  const revenueDelta = getPercentChange(
    overview?.thisMonth.revenue ?? 0,
    Math.max((safeOverview?.totalRevenue ?? 0) - (overview?.thisMonth.revenue ?? 0), 1),
  );
  const ordersDelta = getPercentChange(
    overview?.thisMonth.orders ?? 0,
    Math.max((safeOverview?.totalOrders ?? 0) - (overview?.thisMonth.orders ?? 0), 1),
  );
  const visitorsDelta = getPercentChange(
    overview?.visitorsToday ?? 0,
    Math.max((safeOverview?.totalCustomers ?? 0) - (overview?.visitorsToday ?? 0), 1),
  );
  const conversionDelta = conversionValue > 0 ? Math.min(conversionValue / 4, 99) : 0;

  const formatDelta = (value: number) => `${value >= 0 ? '+' : ''}${Math.abs(value).toFixed(1)}%`;
  const getDeltaColor = (value: number) => (value >= 0 ? 'text-[#2f9e44]' : 'text-[#e03131]');
  const checklistCompleted = Boolean(gettingStarted?.allComplete);
  const unreadNotificationCount = notificationsData?.unread_count ?? 0;
  const hasUnreadNotifications = unreadNotificationCount > 0;
  const getOnboardingInlineHint = (itemId: string) => ONBOARDING_INLINE_HINTS[itemId];

  const todayRevenueValue =
    revenueTrends?.trends?.length && revenueTrends.trends[revenueTrends.trends.length - 1]
      ? revenueTrends.trends[revenueTrends.trends.length - 1].revenue
      : (overview?.thisMonth.revenue ?? 0);
  const todayOrdersValue = overview?.pendingOrders ?? overview?.thisMonth.orders ?? 0;

  const formatCompactCurrency = (value: number) => {
    const compact = formatNumber(value);
    return currency.symbolPosition === 'left' ? `${currency.symbol}${compact}` : `${compact}${currency.symbol}`;
  };

  const getRelativeTime = (dateValue?: string) => {
    if (!dateValue) return 'just now';
    const diffMs = Date.now() - new Date(dateValue).getTime();
    if (diffMs < 60_000) return 'just now';
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  const lowStockCount = inventoryData?.summary?.lowStockCount ?? 0;
  const pendingOrdersCount = overview?.pendingOrders ?? 0;
  const mobileActivities = [
    recentOrders?.[0]
      ? { id: 'order', label: 'New order received', time: getRelativeTime(recentOrders[0].created_at) }
      : null,
    recentOrders?.[1]
      ? { id: 'payment', label: 'Payment completed', time: getRelativeTime(recentOrders[1].created_at) }
      : null,
    lowStockCount > 0 ? { id: 'stock', label: 'Product low stock', time: '1 hour ago' } : null,
  ].filter((item): item is { id: string; label: string; time: string } => item !== null);

  return (
    <div className="bg-[#f9fafb] md:bg-transparent md:space-y-6">
      <div className="relative min-h-[calc(100vh-4rem)] pb-28 md:hidden">
        <section
          className={`bg-gradient-to-b from-primary to-primary/80 px-4 pt-8 ${
            checklistCompleted ? 'pb-6' : 'pb-28'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-primary-foreground/80">{getGreeting()},</p>
              <h1 className="mt-1 text-[24px] font-bold leading-9 tracking-[0.0703px] text-primary-foreground">
                {tenantName}
              </h1>
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-foreground/20 px-3 py-1">
                <span className="h-2 w-2 rounded-full bg-[#2f9e44]" />
                <span className="text-sm font-medium text-primary-foreground">
                  {tenantStatus === 'active' ? 'Live' : 'Draft'}
                </span>
              </div>
            </div>
            <button
              type="button"
              className={`relative rounded-full p-2.5 ${
                hasUnreadNotifications ? 'bg-primary-foreground/20' : 'bg-primary-foreground/10'
              }`}
              onClick={() => {
                if (hasUnreadNotifications) {
                  window.location.href = '/dashboard/orders?status=pending';
                  return;
                }
                toast.info('No new notifications');
              }}
              aria-label="Notifications"
            >
              <BellIcon className="h-5 w-5 text-primary-foreground" />
              {hasUnreadNotifications && (
                <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-[#fb2c36] px-1 text-[11px] font-bold text-white">
                  {unreadNotificationCount > 9 ? '9+' : unreadNotificationCount}
                </span>
              )}
            </button>
          </div>

          {checklistCompleted && (
            <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
              <div className="min-w-[110px] rounded-full bg-primary-foreground/15 px-4 py-2">
                <p className="text-[11px] text-primary-foreground/70">Visitors Today</p>
                <p className="text-base font-bold text-primary-foreground">{formatNumber(visitorsValue)}</p>
              </div>
              <div className="min-w-[110px] rounded-full bg-primary-foreground/15 px-4 py-2">
                <p className="text-[11px] text-primary-foreground/70">New Orders</p>
                <p className="text-base font-bold text-primary-foreground">{formatNumber(todayOrdersValue)}</p>
              </div>
              <div className="min-w-[128px] rounded-full bg-primary-foreground/15 px-4 py-2">
                <p className="text-[11px] text-primary-foreground/70">Revenue Today</p>
                <p className="text-base font-bold text-primary-foreground">{formatCompactCurrency(todayRevenueValue)}</p>
              </div>
            </div>
          )}
        </section>

        {!checklistCompleted && (
          <section className="relative z-10 mx-4 -mt-20 rounded-2xl border border-[#e5e7eb] bg-white p-6 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.1)]">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h2 className="text-[18px] font-semibold leading-7 tracking-[-0.4395px] text-[#101828]">Complete your setup</h2>
                <p className="mt-1 text-base text-[#4a5565]">
                  {mobileSetupCompleted} of {mobileSetupTotal} completed
                </p>
              </div>
              <p className="text-[22px] font-bold leading-[29.333px] tracking-[-0.2578px] text-primary">{Math.round(mobileSetupProgress)}%</p>
            </div>

            <div className="mb-5 h-2 w-full rounded-full bg-[#f3f4f6]">
              <div
                className="h-2 rounded-full bg-primary transition-all duration-300"
                style={{ width: `${Math.max(0, Math.min(100, mobileSetupProgress))}%` }}
              />
            </div>

            <div className="space-y-3">
              {mobileSetupItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between gap-2">
                  {item.id === 'preview' ? (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(event) => {
                        event.preventDefault();
                        void handlePreviewStore();
                      }}
                      className="flex min-w-0 items-center gap-3"
                    >
                      {item.completed ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00c950] text-white">
                          <CheckCircleIcon className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="h-5 w-5 rounded-full border border-[#d1d5dc]" />
                      )}
                      <span className={`truncate text-[15px] ${item.completed ? 'text-[#6a7282]' : 'text-[#101828]'}`}>
                        {item.label}
                      </span>
                      {getOnboardingInlineHint(item.id) && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {getOnboardingInlineHint(item.id)}
                        </span>
                      )}
                    </a>
                  ) : (
                    <Link href={item.href} className="flex min-w-0 items-center gap-3">
                      {item.completed ? (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#00c950] text-white">
                          <CheckCircleIcon className="h-4 w-4" />
                        </span>
                      ) : (
                        <span className="h-5 w-5 rounded-full border border-[#d1d5dc]" />
                      )}
                      <span className={`truncate text-[15px] ${item.completed ? 'text-[#6a7282]' : 'text-[#101828]'}`}>
                        {item.label}
                      </span>
                      {getOnboardingInlineHint(item.id) && (
                        <span className="block truncate text-xs text-muted-foreground">
                          {getOnboardingInlineHint(item.id)}
                        </span>
                      )}
                    </Link>
                  )}
                  {!item.completed && item.cta && (
                    item.id === 'share' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleCopyStoreLink}
                      className="h-7 rounded-full border-[#d1d5dc] px-3 text-xs font-semibold text-primary"
                      >
                        {item.cta}
                      </Button>
                    ) : item.id === 'preview' ? (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handlePreviewStore}
                        className="h-7 rounded-full border-[#d1d5dc] px-3 text-xs font-semibold text-primary"
                      >
                        {item.cta}
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      className="h-7 rounded-full border-[#d1d5dc] px-3 text-xs font-semibold text-primary"
                      >
                        <Link href={item.href}>{item.cta}</Link>
                      </Button>
                    )
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        <section className={`space-y-8 px-4 ${checklistCompleted ? 'pt-6' : 'pt-8'}`}>
          <div>
            <h2 className="mb-4 text-[18px] font-semibold leading-[27px] tracking-[-0.4395px] text-[#1f2937]">Overview</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-[#f3f4f6] bg-white p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.1)]">
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-[#6b7280]">
                  <span>Revenue</span>
                  <CurrencyDollarIcon className="h-4 w-4" />
                </div>
                <p className="text-[22px] font-bold leading-[33px] tracking-[-0.2578px] text-[#1f2937]">{formatCurrency(revenueValue)}</p>
                <p className={`mt-1 text-sm font-medium ${getDeltaColor(revenueDelta)}`}>{formatDelta(revenueDelta)}</p>
              </div>
              <div className="rounded-2xl border border-[#f3f4f6] bg-white p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.1)]">
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-[#6b7280]">
                  <span>Orders</span>
                  <ShoppingCartIcon className="h-4 w-4" />
                </div>
                <p className="text-[22px] font-bold leading-[33px] tracking-[-0.2578px] text-[#1f2937]">{formatNumber(ordersValue)}</p>
                <p className={`mt-1 text-sm font-medium ${getDeltaColor(ordersDelta)}`}>{formatDelta(ordersDelta)}</p>
              </div>
              <div className="rounded-2xl border border-[#f3f4f6] bg-white p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.1)]">
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-[#6b7280]">
                  <span>Visitors</span>
                  <EyeIcon className="h-4 w-4" />
                </div>
                <p className="text-[22px] font-bold leading-[33px] tracking-[-0.2578px] text-[#1f2937]">{formatNumber(visitorsValue)}</p>
                <p className={`mt-1 text-sm font-medium ${getDeltaColor(visitorsDelta)}`}>{formatDelta(visitorsDelta)}</p>
              </div>
              <div className="rounded-2xl border border-[#f3f4f6] bg-white p-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.1)]">
                <div className="mb-2 flex items-center justify-between text-sm font-medium text-[#6b7280]">
                  <span>Conversion</span>
                  <ArrowTrendingUpIcon className="h-4 w-4" />
                </div>
                <p className="text-[22px] font-bold leading-[33px] tracking-[-0.2578px] text-[#1f2937]">{conversionValue.toFixed(1)}%</p>
                <p className={`mt-1 text-sm font-medium ${getDeltaColor(conversionDelta)}`}>{formatDelta(conversionDelta)}</p>
              </div>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-[18px] font-semibold leading-[27px] tracking-[-0.4395px] text-[#1f2937]">Alerts</h2>
            <div className="space-y-2">
              <Link
                href="/dashboard/orders"
                className="flex items-center gap-3 rounded-2xl border border-[#f3f4f6] bg-white px-4 py-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.1)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f59f001a] text-[#f59f00]">
                  <ShoppingCartIcon className="h-5 w-5" />
                </span>
                <span className="flex-1 text-sm font-medium text-[#1f2937]">
                  {pendingOrdersCount} pending orders
                </span>
                <ArrowRightIcon className="h-4 w-4 text-[#6b7280]" />
              </Link>
              <Link
                href="/dashboard/inventory"
                className="flex items-center gap-3 rounded-2xl border border-[#f3f4f6] bg-white px-4 py-4 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.1)]"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-[14px] bg-[#f59f001a] text-[#f59f00]">
                  <CubeIcon className="h-5 w-5" />
                </span>
                <span className="flex-1 text-sm font-medium text-[#1f2937]">
                  {lowStockCount} items low in stock
                </span>
                <ArrowRightIcon className="h-4 w-4 text-[#6b7280]" />
              </Link>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-[18px] font-semibold leading-[27px] tracking-[-0.4395px] text-[#1f2937]">Quick Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              <Link
                href={primaryCatalogCta.href}
                className="rounded-2xl border border-[#f3f4f6] bg-white p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.1)]"
              >
                <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary/10 text-primary">
                  <PlusIcon className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-[#1f2937]">{primaryCatalogCta.label}</p>
              </Link>
              <Link
                href="/dashboard/orders"
                className="rounded-2xl border border-[#f3f4f6] bg-white p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.1)]"
              >
                <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary/10 text-primary">
                  <ShoppingCartIcon className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-[#1f2937]">View Orders</p>
              </Link>
              <button
                type="button"
                onClick={handleCopyStoreLink}
                className="rounded-2xl border border-[#f3f4f6] bg-white p-5 text-left shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.1)]"
              >
                <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary/10 text-primary">
                  <ShareIcon className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-[#1f2937]">Share Store</p>
              </button>
              <Link
                href="/dashboard/analytics"
                className="rounded-2xl border border-[#f3f4f6] bg-white p-5 shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.1)]"
              >
                <span className="mb-5 flex h-10 w-10 items-center justify-center rounded-[14px] bg-primary/10 text-primary">
                  <ChartBarIcon className="h-5 w-5" />
                </span>
                <p className="text-sm font-medium text-[#1f2937]">Analytics</p>
              </Link>
            </div>
          </div>

          <div>
            <h2 className="mb-4 text-[18px] font-semibold leading-[27px] tracking-[-0.4395px] text-[#1f2937]">Recent Activity</h2>
            <div className="overflow-hidden rounded-2xl border border-[#f3f4f6] bg-white shadow-[0px_1px_3px_rgba(0,0,0,0.1),0px_1px_2px_rgba(0,0,0,0.1)]">
              {(mobileActivities.length > 0 ? mobileActivities : [{ id: 'empty', label: 'No recent activity', time: 'just now' }]).map(
                (item, index, arr) => (
                  <div
                    key={item.id}
                    className={`px-4 py-3.5 ${index < arr.length - 1 ? 'border-b border-[#f3f4f6]' : ''}`}
                  >
                    <p className="text-sm font-medium text-[#1f2937]">{item.label}</p>
                    <p className="mt-1 text-xs text-[#6b7280]">{item.time}</p>
                  </div>
                ),
              )}
            </div>
          </div>
        </section>

      </div>

      <div className="hidden space-y-6 md:block">
      {/* Welcome Banner for New Tenants */}
      {isNewTenant && (
        <Card className="border-primary/50 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="space-y-2">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  🎉 Welcome to DukaNest!
                </h3>
                <p className="text-sm text-muted-foreground">
                  Your store <strong>{tenantName}</strong> is live at{' '}
                  <a 
                    href={welcomeStoreUrl}
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {welcomeStoreHost}
                  </a>
                </p>
                {planInfo && (
                  <Button asChild size="sm" className="mt-2 h-auto rounded-md px-3 py-1.5 text-xs font-semibold shadow-sm">
                    <Link href="/dashboard/subscription">
                      {planInfo.name} Plan · ${planInfo.price}/
                      {planInfo.duration_months === 1 ? 'mo' : `${planInfo.duration_months}mo`}
                    </Link>
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    void handlePreviewStore();
                  }}
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  Preview Store
                </Button>
                <Button asChild size="sm">
                  <Link href={primaryCatalogCta.href}>{primaryCatalogCta.label}</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/settings">Configure Store</Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            {getGreeting()}, {userName?.split('@')[0] || 'there'}
          </h1>
          <p className="text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening with <span className="font-medium">{tenantName}</span> today.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/analytics">
              <ChartBarIcon className="h-4 w-4 mr-2" />
              Full Analytics
            </Link>
          </Button>
          <Button asChild>
            <Link href={primaryCatalogCta.href}>
              <PlusIcon className="h-4 w-4 mr-2" />
              {primaryCatalogCta.label}
            </Link>
          </Button>
        </div>
      </div>

      {/* Getting Started Checklist */}
      {gettingStarted && (
        <Card className="border-primary/30 bg-gradient-to-br from-primary/5 via-transparent to-primary/5">
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/20">
                    <CheckCircleIcon className="h-4 w-4 text-primary" />
                  </span>
                  Getting Started
                </CardTitle>
                <CardDescription className="mt-1">
                  {gettingStarted.allComplete
                    ? "You're all set! Your store is ready for customers."
                    : `Complete these steps to get your store ready. ${gettingStarted.completedCount} of ${gettingStarted.totalCount} done.`}
                </CardDescription>
              </div>
              {!gettingStarted.allComplete && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-24 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500"
                      style={{ width: `${gettingStarted.progressPercent}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">
                    {Math.round(gettingStarted.progressPercent)}%
                  </span>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {gettingStarted.allComplete ? (
              <div className="flex items-center gap-3 py-2">
                <CheckCircleIcon className="h-12 w-12 text-green-500" />
                <div>
                  <p className="font-medium">All setup complete!</p>
                  <p className="text-sm text-muted-foreground">
                    Share your store:{' '}
                    <a
                      href={gettingStarted.storeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {gettingStarted.storeUrl}
                    </a>
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {gettingStarted.nextAction && (
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary mb-1">
                      Suggested Next Step
                    </p>
                    <p className="text-sm font-medium">{gettingStarted.nextAction.label}</p>
                    {getOnboardingInlineHint(gettingStarted.nextAction.id) && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {getOnboardingInlineHint(gettingStarted.nextAction.id)}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {gettingStarted.nextAction.description}
                    </p>
                    {gettingStarted.nextAction.cta && (
                      <div className="mt-2">
                        {gettingStarted.nextAction.id === 'share' ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleCopyStoreLink}
                            className="h-7 text-xs"
                          >
                            <ClipboardDocumentIcon className="h-3 w-3 mr-1" />
                            {gettingStarted.nextAction.cta}
                          </Button>
                        ) : gettingStarted.nextAction.id === 'preview' ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handlePreviewStore}
                            className="h-7 text-xs"
                          >
                            <EyeIcon className="h-3 w-3 mr-1" />
                            {gettingStarted.nextAction.cta}
                          </Button>
                        ) : gettingStarted.nextAction.id === 'demo_products' ? (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={handleRemoveDemoProducts}
                            disabled={isRemovingDemoProducts}
                            className="h-7 text-xs"
                          >
                            <TrashIcon className="h-3 w-3 mr-1" />
                            {isRemovingDemoProducts ? 'Removing...' : gettingStarted.nextAction.cta}
                          </Button>
                        ) : (
                          <Button variant="default" size="sm" asChild className="h-7 text-xs">
                            <Link href={gettingStarted.nextAction.href}>{gettingStarted.nextAction.cta}</Link>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {gettingStarted.items.map((item) => (
                    <div
                      key={item.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                        item.completed
                          ? 'border-green-200 bg-green-50/50 dark:border-green-900/50 dark:bg-green-900/10'
                          : 'border-border hover:bg-muted/50'
                      }`}
                    >
                      <div className="mt-0.5">
                        {item.completed ? (
                          <CheckCircleIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : (
                          <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className={`text-sm font-medium ${item.completed ? 'text-muted-foreground line-through' : ''}`}>
                          {item.label}
                        </p>
                        {getOnboardingInlineHint(item.id) && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {getOnboardingInlineHint(item.id)}
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                        {!item.completed && item.cta && (
                          <div className="mt-2">
                            {item.id === 'share' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopyStoreLink}
                                className="h-7 text-xs"
                              >
                                <ClipboardDocumentIcon className="h-3 w-3 mr-1" />
                                {item.cta}
                              </Button>
                            ) : item.id === 'preview' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handlePreviewStore}
                                className="h-7 text-xs"
                              >
                                <EyeIcon className="h-3 w-3 mr-1" />
                                {item.cta}
                              </Button>
                            ) : item.id === 'demo_products' ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={handleRemoveDemoProducts}
                                disabled={isRemovingDemoProducts}
                                className="h-7 text-xs"
                              >
                                <TrashIcon className="h-3 w-3 mr-1" />
                                {isRemovingDemoProducts ? 'Removing...' : item.cta}
                              </Button>
                            ) : (
                              <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                                <Link href={item.href}>{item.cta}</Link>
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Revenue */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Revenue</CardTitle>
            <div className="h-8 w-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <CurrencyDollarIcon className="h-4 w-4 text-green-600 dark:text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatCurrency(overview?.overview.totalRevenue || 0)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <span className="text-green-600 dark:text-green-400 flex items-center">
                    <ArrowTrendingUpIcon className="h-3 w-3 mr-1" />
                    {formatCurrency(overview?.thisMonth.revenue || 0)}
                  </span>
                  <span className="ml-1">this month</span>
                </div>
              </>
            )}
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-green-600" />
        </Card>

        {/* Total Orders */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Orders</CardTitle>
            <div className="h-8 w-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <ShoppingCartIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(overview?.overview.totalOrders || 0)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <span className="text-blue-600 dark:text-blue-400">
                    {overview?.thisMonth.orders || 0}
                  </span>
                  <span className="ml-1">this month</span>
                  {(overview?.pendingOrders || 0) > 0 && (
                    <Badge variant="secondary" className="ml-2 text-xs">
                      {overview?.pendingOrders} pending
                    </Badge>
                  )}
                </div>
              </>
            )}
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-400 to-blue-600" />
        </Card>

        {/* Total Customers */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Customers</CardTitle>
            <div className="h-8 w-8 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
              <UserGroupIcon className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(overview?.overview.totalCustomers || 0)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  <span className="text-purple-600 dark:text-purple-400">
                    +{overview?.thisMonth.newCustomers || 0}
                  </span>
                  <span className="ml-1">new this month</span>
                </div>
              </>
            )}
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-purple-600" />
        </Card>

        {/* Active Products */}
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active Products</CardTitle>
            <div className="h-8 w-8 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
              <CubeIcon className="h-4 w-4 text-orange-600 dark:text-orange-400" />
            </div>
          </CardHeader>
          <CardContent>
            {overviewLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {formatNumber(overview?.overview.totalProducts || 0)}
                </div>
                <div className="flex items-center text-xs text-muted-foreground mt-1">
                  {(inventoryData?.summary.lowStockCount || 0) > 0 ? (
                    <span className="text-yellow-600 dark:text-yellow-400 flex items-center">
                      <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                      {inventoryData?.summary.lowStockCount} low stock
                    </span>
                  ) : (
                    <span className="text-green-600 dark:text-green-400">All stocked</span>
                  )}
                </div>
              </>
            )}
          </CardContent>
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-orange-600" />
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart - Takes 2 columns */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Revenue Overview</CardTitle>
              <CardDescription>Last 30 days performance</CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/analytics">
                View Details
                <ArrowRightIcon className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {revenueLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <Skeleton className="h-full w-full" />
              </div>
            ) : revenueTrends?.trends && revenueTrends.trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={revenueTrends.trends}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <YAxis
                    tickFormatter={(value) => currency.symbolPosition === 'left' ? `${currency.symbol}${formatNumber(value)}` : `${formatNumber(value)}${currency.symbol}`}
                    tick={{ fontSize: 12 }}
                    className="text-muted-foreground"
                  />
                  <Tooltip
                    formatter={(value: number) => [formatCurrency(value), 'Revenue']}
                    labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--background))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                <ChartBarIcon className="h-12 w-12 mb-3 opacity-50" />
                <p className="text-sm">No revenue data yet</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href={primaryCatalogCta.href}>{primaryCatalogCta.label}</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Stats & Alerts */}
        <div className="space-y-6">
          {/* Low Stock Alerts */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Low Stock Alerts</CardTitle>
              {(inventoryData?.summary?.lowStockCount || 0) > 0 && (
                <Link href="/dashboard/inventory">
                  <Badge variant="destructive" className="text-xs cursor-pointer hover:bg-destructive/80">
                    {inventoryData?.summary.lowStockCount || 0} items
                  </Badge>
                </Link>
              )}
            </CardHeader>
            <CardContent>
              {inventoryLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i: any) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (inventoryData?.lowStock?.products?.length || 0) > 0 || (inventoryData?.lowStock?.variants?.length || 0) > 0 ? (
                <div className="space-y-3">
                  {/* Low stock products */}
                  {inventoryData?.lowStock?.products?.slice(0, 3).map((item: LowStockItem) => (
                    <Link key={`product-${item.id}`} href="/dashboard/inventory">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 hover:bg-yellow-100 dark:hover:bg-yellow-900/20 cursor-pointer transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{item.name}</p>
                          {item.sku && (
                            <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                          )}
                        </div>
                        <Badge variant="outline" className="ml-2 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700">
                          {item.stock_quantity} left
                        </Badge>
                      </div>
                    </Link>
                  ))}
                  {/* Low stock variants */}
                  {inventoryData?.lowStock?.variants?.slice(0, 3 - (inventoryData?.lowStock?.products?.length || 0)).map((variant: LowStockVariant) => (
                    <Link key={`variant-${variant.id}`} href="/dashboard/inventory">
                      <div className="flex items-center justify-between p-2 rounded-lg bg-orange-50 dark:bg-orange-900/10 border border-orange-200 dark:border-orange-900/30 hover:bg-orange-100 dark:hover:bg-orange-900/20 cursor-pointer transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{variant.productName}</p>
                          <p className="text-xs text-muted-foreground">
                            Variant: {variant.variantSku || 'N/A'}
                          </p>
                        </div>
                        <Badge variant="outline" className="ml-2 text-orange-700 dark:text-orange-400 border-orange-300 dark:border-orange-700">
                          {variant.stockQuantity} left
                        </Badge>
                      </div>
                    </Link>
                  ))}
                  {(inventoryData?.summary?.lowStockCount || 0) > 3 && (
                    <Button variant="ghost" size="sm" className="w-full" asChild>
                      <Link href="/dashboard/inventory">
                        View all {inventoryData?.summary.lowStockCount} items
                        <ArrowRightIcon className="h-4 w-4 ml-1" />
                      </Link>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <ExclamationTriangleIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">All products are well stocked</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-base">Top Products</CardTitle>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/dashboard/analytics?tab=sales">
                  <EyeIcon className="h-4 w-4" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {salesLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i: any) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : salesData?.byProduct && salesData.byProduct.length > 0 ? (
                <div className="space-y-3">
                  {salesData.byProduct.slice(0, 5).map((product: TopProduct, index: number) => (
                    <div key={product.id} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-muted-foreground w-5">
                        #{index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.quantity} sold</p>
                      </div>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">
                        {formatCurrency(product.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-muted-foreground">
                  <CubeIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">No sales data yet</p>
                  <p className="text-xs mt-1 mb-4">Add products to start tracking sales</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <Button variant="default" size="sm" asChild>
                      <Link href={primaryCatalogCta.href}>
                        <PlusIcon className="h-4 w-4 mr-1" />
                        {primaryCatalogCta.label}
                      </Link>
                    </Button>
                    <Button variant="outline" size="sm" asChild>
                      <Link href="/dashboard/inventory/bulk">
                        <ArrowUpTrayIcon className="h-4 w-4 mr-1" />
                        Import products
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Store Quick Info + Recent Orders */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Store Quick Info - uses center space */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Store</CardTitle>
            <CardDescription>Quick links and status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Store link + Copy */}
            <div className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate" title={effectiveStoreUrl}>
                  {effectiveStoreUrl.replace(/^https?:\/\//, '')}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={handleCopyStoreLink} className="shrink-0">
                <ClipboardDocumentIcon className="h-4 w-4 mr-1" />
                Copy
              </Button>
            </div>

            {/* Store status: Draft / Live */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <Badge variant={tenantStatus === 'active' ? 'default' : 'secondary'}>
                {tenantStatus === 'active' ? 'Live' : 'Draft'}
              </Badge>
            </div>

            {/* Visitors today */}
            <div className="flex items-center gap-2">
              <SignalIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                <span className="font-medium">{overview?.visitorsToday ?? 0}</span>
                <span className="text-muted-foreground ml-1">visitors today</span>
              </span>
            </div>

            {/* Trial days remaining + upgrade CTA */}
            {trialDaysRemaining != null && trialDaysRemaining > 0 && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/50 dark:bg-amber-900/20">
                <div className="flex items-center gap-2 mb-2">
                  <SparklesIcon className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span className="text-sm font-medium">
                    {trialDaysRemaining} day{trialDaysRemaining !== 1 ? 's' : ''} left in trial
                  </span>
                </div>
                <Button size="sm" asChild className="w-full">
                  <Link href="/dashboard/subscription">Upgrade now</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Orders - compact when empty */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <CardDescription>Latest customer orders</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/dashboard/orders">
                View All
                <ArrowRightIcon className="h-4 w-4 ml-1" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i: number) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : recentOrders && recentOrders.length > 0 ? (
              <div className="space-y-3">
                {recentOrders.map((order: RecentOrder) => (
                  <div key={order.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <ShoppingCartIcon className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Order #{order.order_number}</p>
                        <p className="text-xs text-muted-foreground">{order.customer_name || 'Guest'}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-semibold text-sm">{formatCurrency(order.total_amount || 0)}</p>
                        <p className="text-xs text-muted-foreground flex items-center justify-end gap-1">
                          <ClockIcon className="h-3 w-3" />
                          {format(new Date(order.created_at), 'MMM dd, HH:mm')}
                        </p>
                      </div>
                      <Badge className={getStatusColor(order.status)}>
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <ShoppingCartIcon className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">No orders yet</p>
                <p className="text-xs mt-1 mb-4">Get your first sale by sharing your store and offering incentives</p>
                <div className="flex flex-wrap gap-2 justify-center">
                  <Button variant="default" size="sm" onClick={handleCopyStoreLink}>
                    <ShareIcon className="h-4 w-4 mr-1" />
                    Share store link
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/sales/new">
                      <FireIcon className="h-4 w-4 mr-1" />
                      Create a discount
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <Link href="/dashboard/settings/delivery-zones">
                      <TruckIcon className="h-4 w-4 mr-1" />
                      Add delivery options
                    </Link>
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
          <Link href="/dashboard/products">
            <CubeIcon className="h-5 w-5" />
            <span className="text-sm">Products</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
          <Link href="/dashboard/orders">
            <ShoppingCartIcon className="h-5 w-5" />
            <span className="text-sm">Orders</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
          <Link href="/dashboard/customers">
            <UserGroupIcon className="h-5 w-5" />
            <span className="text-sm">Customers</span>
          </Link>
        </Button>
        <Button variant="outline" className="h-auto py-4 flex flex-col items-center gap-2" asChild>
          <Link href="/dashboard/inventory">
            <ChartBarIcon className="h-5 w-5" />
            <span className="text-sm">Inventory</span>
          </Link>
        </Button>
      </div>
      </div>
    </div>
  );
}

