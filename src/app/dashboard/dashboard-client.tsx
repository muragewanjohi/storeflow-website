/**
 * Dashboard Client Component
 * 
 * Modern e-commerce dashboard similar to Shopify
 * Shows key metrics, charts, recent orders, and alerts
 * 
 * Day 36: Dashboard enhancement
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
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
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  PlusIcon,
  ArrowRightIcon,
  ClockIcon,
  EyeIcon,
  ChartBarIcon,
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
import { format, subDays, startOfWeek, startOfMonth, endOfMonth, differenceInDays } from 'date-fns';
import { useCurrency } from '@/lib/currency/currency-context';

interface DashboardClientProps {
  tenantName: string;
  isNewTenant: boolean;
  planInfo: { name: string; price: number; duration_months: number } | null;
  subdomain: string;
  userName: string;
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
}: Readonly<DashboardClientProps>) {
  const { formatCurrency, currency } = useCurrency();
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

  return (
    <div className="space-y-6">
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
            <Link href="/dashboard/products/new">
              <PlusIcon className="h-4 w-4 mr-2" />
              Add Product
            </Link>
          </Button>
        </div>
      </div>

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
                    href={`https://${subdomain}.dukanest.com`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {subdomain}.dukanest.com
                  </a>
                </p>
                {planInfo && (
                  <Badge variant="secondary" className="mt-2">
                    {planInfo.name} Plan - ${planInfo.price}/{planInfo.duration_months === 1 ? 'mo' : `${planInfo.duration_months}mo`}
                  </Badge>
                )}
              </div>
              <div className="flex gap-2">
                <Button asChild size="sm">
                  <Link href="/dashboard/products/new">Add First Product</Link>
                </Button>
                <Button variant="outline" size="sm" asChild>
                  <Link href="/dashboard/settings">Configure Store</Link>
                </Button>
              </div>
            </div>
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
                  <Link href="/dashboard/products/new">Add your first product</Link>
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
              {(inventoryData?.lowStock?.products?.length || 0) > 0 && (
                <Badge variant="destructive" className="text-xs">
                  {inventoryData?.summary.lowStockCount || 0}
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              {inventoryLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((i: any) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : inventoryData?.lowStock?.products && inventoryData.lowStock.products.length > 0 ? (
                <div className="space-y-3">
                  {inventoryData.lowStock.products.slice(0, 4).map((item: LowStockItem) => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30">
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
                  ))}
                  {(inventoryData?.lowStock?.products?.length || 0) > 4 && (
                    <Button variant="ghost" size="sm" className="w-full" asChild>
                      <Link href="/dashboard/inventory/alerts">
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
                  <p className="text-sm">No sales data yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
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
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i: any) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : recentOrders && recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order: any) => (
                <div key={order.id} className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <ShoppingCartIcon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Order #{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">{order.customer_name || 'Guest'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(order.total_amount || 0)}</p>
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
            <div className="text-center py-12 text-muted-foreground">
              <ShoppingCartIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No orders yet</p>
              <p className="text-sm mt-1">Orders will appear here once customers start buying</p>
            </div>
          )}
        </CardContent>
      </Card>

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
  );
}

