/**
 * Analytics Dashboard Client Component
 * 
 * Client-side analytics dashboard with charts and metrics
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DateRangePicker from '@/components/analytics/date-range-picker';
import { 
  ShoppingCartIcon, 
  CurrencyDollarIcon, 
  UserGroupIcon,
  CubeIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
} from '@heroicons/react/24/outline';
// Lazy load charts for better performance
import { 
  LineChart, 
  Line, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from '@/components/analytics/lazy-charts';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { useCurrency } from '@/lib/currency/currency-context';
import { useThemeColors } from '@/lib/analytics/use-theme-colors';
import { hasAdvancedAnalyticsAccess, getUpgradeMessage } from '@/lib/analytics/plan-access';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { LockClosedIcon, ArrowUpIcon } from '@heroicons/react/24/outline';
import Link from 'next/link';
import ScheduledReportsManager from '@/components/analytics/scheduled-reports-manager';

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

interface AnalyticsDashboardClientProps {
  currentPlanName: string | null;
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

interface RevenueData {
  totalRevenue: number;
  averageOrderValue: number;
  trends: Array<{ date: string; revenue: number }>;
}

interface SalesData {
  totalSales: number;
  totalRevenue: number;
  byProduct: Array<{ id: string; name: string; quantity: number; revenue: number }>;
  byCategory: Array<{ id: string; name: string; quantity: number; revenue: number }>;
}

interface CustomerData {
  totalCustomers: number;
  newCustomers: number;
  customersWithOrders: number;
  conversionRate: number;
  acquisitionTrend: Array<{ date: string; count: number }>;
  topCustomers: Array<{ id: string; name: string; email: string; totalRevenue: number; orderCount: number }>;
  lifetimeValue: {
    average: number;
    averageOrderValue: number;
  };
}

interface InventoryData {
  summary: {
    totalProducts: number;
    totalVariants: number;
    lowStockCount: number;
    outOfStockCount: number;
    totalInventoryValue: number;
  };
  lowStock: {
    products: Array<{ id: string; name: string; sku: string | null; stock_quantity: number; price: number }>;
    variants: Array<{ id: string; productId: string; productName: string; stockQuantity: number }>;
  };
  outOfStock: {
    products: number;
    variants: number;
  };
  byCategory: Array<{ id: string; name: string; quantity: number; value: number }>;
}

interface ConversionFunnelData {
  funnel: {
    visitors: number;
    addToCart: number;
    checkoutStarted: number;
    ordersCompleted: number;
  };
  rates: {
    addToCartRate: number;
    checkoutRate: number;
    conversionRate: number;
    cartAbandonmentRate: number;
    checkoutAbandonmentRate: number;
  };
  note?: string;
}

interface GeographicData {
  byCountry: Array<{ country: string; revenue: number; orders: number }>;
  byState: Array<{ state: string; country: string; revenue: number; orders: number }>;
  byCity: Array<{ city: string; state: string; country: string; revenue: number; orders: number }>;
  totalCountries: number;
  totalStates: number;
  totalCities: number;
}

interface ProductPerformanceData {
  products: Array<{
    id: string;
    name: string;
    sku: string | null;
    price: number;
    totalSold: number;
    totalRevenue: number;
    orderCount: number;
    estimatedViews: number;
    conversionRate: number;
    performanceOverTime: Array<{ week: string; sold: number; revenue: number }>;
  }>;
  bestByRevenue: Array<any>;
  bestByUnits: Array<any>;
  bestByConversion: Array<any>;
  worstPerformers: Array<any>;
  totalProducts: number;
  productsWithSales: number;
  note?: string;
}

interface RefundsData {
  summary: {
    totalOrders: number;
    refundedOrders: number;
    totalRevenue: number;
    refundedAmount: number;
    refundRate: number;
    netRevenue: number;
  };
  trends: Array<{ week: string; count: number; amount: number }>;
  note?: string;
}

interface RealTimeData {
  live: {
    estimatedVisitors: number;
    ordersLastHour: number;
    todayRevenue: number;
    todayOrders: number;
  };
  recentOrders: Array<{
    id: string;
    orderNumber: string;
    customerName: string | null;
    amount: number;
    status: string | null;
    createdAt: Date | string;
  }>;
  timestamp: string;
  note?: string;
}

interface ComparisonData {
  period1: {
    revenue: number;
    orders: number;
    customers: number;
    averageOrderValue: number;
    startDate: string;
    endDate: string;
  };
  period2: {
    revenue: number;
    orders: number;
    customers: number;
    averageOrderValue: number;
    startDate: string;
    endDate: string;
  };
  growth: {
    revenue: number;
    orders: number;
    customers: number;
    averageOrderValue: number;
  };
  trends: {
    revenue: 'up' | 'down';
    orders: 'up' | 'down';
    customers: 'up' | 'down';
    averageOrderValue: 'up' | 'down';
  };
}

export default function AnalyticsDashboardClient({ 
  currentPlanName 
}: Readonly<AnalyticsDashboardClientProps>) {
  const { formatCurrency: formatCurrencyFromHook, currency } = useCurrency();
  const { primary, secondary, accent, colors: themeColors } = useThemeColors();
  const hasAdvancedAccess = hasAdvancedAnalyticsAccess(currentPlanName);
  const [dateRange, setDateRange] = useState<DateRange>({
    from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    to: new Date(),
  });
  
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [revenue, setRevenue] = useState<RevenueData | null>(null);
  const [sales, setSales] = useState<SalesData | null>(null);
  const [customers, setCustomers] = useState<CustomerData | null>(null);
  const [inventory, setInventory] = useState<InventoryData | null>(null);
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnelData | null>(null);
  const [geographic, setGeographic] = useState<GeographicData | null>(null);
  const [productPerformance, setProductPerformance] = useState<ProductPerformanceData | null>(null);
  const [refunds, setRefunds] = useState<RefundsData | null>(null);
  const [realtime, setRealtime] = useState<RealTimeData | null>(null);
  const [trafficSources, setTrafficSources] = useState<any>(null);
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [realtimePolling, setRealtimePolling] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    setLoading(true);
    try {
      const startDate = dateRange.from?.toISOString().split('T')[0];
      const endDate = dateRange.to?.toISOString().split('T')[0];

      // Fetch basic analytics
      const [overviewRes, revenueRes, salesRes, customersRes, inventoryRes] = await Promise.all([
        fetch('/api/analytics/overview'),
        fetch(`/api/analytics/revenue?startDate=${startDate}&endDate=${endDate}&groupBy=day`),
        fetch(`/api/analytics/sales?startDate=${startDate}&endDate=${endDate}`),
        fetch(`/api/analytics/customers?startDate=${startDate}&endDate=${endDate}`),
        fetch('/api/analytics/inventory'),
      ]);

      // Fetch advanced analytics only if user has access
      let advancedPromises: Promise<Response>[] = [];
      if (hasAdvancedAccess) {
        advancedPromises = [
          fetch(`/api/analytics/conversion-funnel?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/analytics/geographic?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/analytics/product-performance?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/analytics/refunds?startDate=${startDate}&endDate=${endDate}`),
          fetch('/api/analytics/realtime'),
          fetch(`/api/analytics/traffic-sources?startDate=${startDate}&endDate=${endDate}`),
          fetch(`/api/analytics/compare?startDate1=${startDate}&endDate1=${endDate}`),
        ];
      }

      if (overviewRes.ok) {
        const overviewData = await overviewRes.json();
        setOverview(overviewData.data);
      }

      if (revenueRes.ok) {
        const revenueData = await revenueRes.json();
        setRevenue(revenueData.data);
      }

      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setSales(salesData.data);
      }

      if (customersRes.ok) {
        const customersData = await customersRes.json();
        setCustomers(customersData.data);
      }

      if (inventoryRes.ok) {
        const inventoryData = await inventoryRes.json();
        setInventory(inventoryData.data);
      }

      // Process advanced analytics if available
      if (hasAdvancedAccess && advancedPromises.length > 0) {
        const [funnelRes, geoRes, productRes, refundsRes, realtimeRes, trafficRes, compareRes] = await Promise.all(advancedPromises);

        if (funnelRes.ok) {
          const funnelData = await funnelRes.json();
          setConversionFunnel(funnelData.data);
        }

        if (geoRes.ok) {
          const geoData = await geoRes.json();
          setGeographic(geoData.data);
        }

        if (productRes.ok) {
          const productData = await productRes.json();
          setProductPerformance(productData.data);
        }

        if (refundsRes.ok) {
          const refundsData = await refundsRes.json();
          setRefunds(refundsData.data);
        }

        if (realtimeRes.ok) {
          const realtimeData = await realtimeRes.json();
          setRealtime(realtimeData.data);
        }

        if (trafficRes.ok) {
          const trafficData = await trafficRes.json();
          setTrafficSources(trafficData.data);
        }

        if (compareRes.ok) {
          const compareData = await compareRes.json();
          setComparison(compareData.data);
        }
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange, hasAdvancedAccess]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  // Real-time polling for advanced analytics
  useEffect(() => {
    if (!hasAdvancedAccess || activeTab !== 'advanced') return;

    setRealtimePolling(true);
    const interval = setInterval(async () => {
      try {
        const response = await fetch('/api/analytics/realtime/poll');
        if (response.ok) {
          const data = await response.json();
          setRealtime(data.data);
        }
      } catch (error) {
        console.error('Error polling real-time analytics:', error);
      }
    }, 30000); // Poll every 30 seconds

    return () => {
      clearInterval(interval);
      setRealtimePolling(false);
    };
  }, [hasAdvancedAccess, activeTab]);

  // Using formatCurrency from useCurrency hook
  const formatCurrency = (amount: number) => formatCurrencyFromHook(amount);
  
  // Format for chart axis labels (shorter format)
  const formatAxisCurrency = (value: number) => {
    if (currency.symbolPosition === 'left') {
      return `${currency.symbol}${value.toLocaleString()}`;
    }
    return `${value.toLocaleString()}${currency.symbol}`;
  };

  const handleExport = async () => {
    try {
      const startDate = dateRange.from?.toISOString().split('T')[0];
      const endDate = dateRange.to?.toISOString().split('T')[0];
      const url = `/api/analytics/export?format=csv&type=${activeTab}&startDate=${startDate}&endDate=${endDate}`;
      
      const response = await fetch(url);
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `analytics-${activeTab}-${startDate}-${endDate}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(downloadUrl);
      }
    } catch (error) {
      console.error('Error exporting analytics:', error);
    }
  };

  const handleCompare = async () => {
    try {
      const startDate = dateRange.from?.toISOString().split('T')[0];
      const endDate = dateRange.to?.toISOString().split('T')[0];
      const response = await fetch(`/api/analytics/compare?startDate1=${startDate}&endDate1=${endDate}`);
      
      if (response.ok) {
        const data = await response.json();
        setComparison(data.data);
      }
    } catch (error) {
      console.error('Error comparing analytics:', error);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Analytics</h1>
            <p className="text-muted-foreground">View your store performance metrics</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i: any) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <div className="h-20 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground">View your store performance metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <DateRangePicker value={dateRange} onChange={setDateRange} />
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={loading}
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview ? formatCurrency(overview.overview.totalRevenue) : '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.thisMonth.revenue ? `${formatCurrency(overview.thisMonth.revenue)} this month` : 'All time'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Orders</CardTitle>
            <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.overview.totalOrders.toLocaleString() || '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.thisMonth.orders ? `${overview.thisMonth.orders} this month` : 'All time'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
            <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.overview.totalCustomers.toLocaleString() || '-'}
            </div>
            <p className="text-xs text-muted-foreground">
              {overview?.thisMonth.newCustomers ? `${overview.thisMonth.newCustomers} new this month` : 'All time'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Products</CardTitle>
            <CubeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {overview?.overview.totalProducts.toLocaleString() || '-'}
            </div>
            <p className="text-xs text-muted-foreground">In catalog</p>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Banner for Basic Plan */}
      {!hasAdvancedAccess && (
        <Alert className="border-primary/50 bg-primary/5">
          <LockClosedIcon className="h-5 w-5 text-primary" />
          <AlertTitle>Unlock Advanced Analytics</AlertTitle>
          <AlertDescription className="mt-2">
            <p className="mb-3">
              {getUpgradeMessage(currentPlanName)}. Get insights into conversion funnels, traffic sources, 
              geographic analytics, real-time metrics, and more.
            </p>
            <Link href="/dashboard/subscription">
              <Button size="sm" className="gap-2">
                <ArrowUpIcon className="h-4 w-4" />
                Upgrade Plan
              </Button>
            </Link>
          </AlertDescription>
        </Alert>
      )}

      {/* Charts Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="revenue"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Revenue
          </TabsTrigger>
          <TabsTrigger 
            value="sales"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Sales
          </TabsTrigger>
          <TabsTrigger 
            value="customers"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Customers
          </TabsTrigger>
          <TabsTrigger 
            value="inventory"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Inventory
          </TabsTrigger>
          {hasAdvancedAccess && (
            <TabsTrigger 
              value="advanced"
              className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
            >
              Advanced
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Trend Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Revenue over time</CardDescription>
              </CardHeader>
              <CardContent>
                {revenue?.trends && revenue.trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenue.trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                      />
                      <YAxis tickFormatter={formatAxisCurrency} />
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(Number(value))}
                        labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={primary} 
                        strokeWidth={2}
                        name="Revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Products Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best selling products by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                {sales?.byProduct && sales.byProduct.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={sales.byProduct.slice(0, 5)}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tickFormatter={formatAxisCurrency} />
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="revenue" fill={primary} name="Revenue" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Revenue Metrics */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Total Revenue</span>
                  <span className="text-lg font-semibold">
                    {revenue ? formatCurrency(revenue.totalRevenue) : '-'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Average Order Value</span>
                  <span className="text-lg font-semibold">
                    {revenue ? formatCurrency(revenue.averageOrderValue) : '-'}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Revenue Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Revenue Trend</CardTitle>
                <CardDescription>Daily revenue over selected period</CardDescription>
              </CardHeader>
              <CardContent>
                {revenue?.trends && revenue.trends.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={revenue.trends}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                      />
                      <YAxis tickFormatter={formatAxisCurrency} />
                      <Tooltip 
                        formatter={(value: any) => formatCurrency(Number(value))}
                        labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="revenue" 
                        stroke={primary} 
                        strokeWidth={2}
                        name="Revenue"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Sales by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Sales by Category</CardTitle>
                <CardDescription>Revenue breakdown by category</CardDescription>
              </CardHeader>
              <CardContent>
                {sales?.byCategory && sales.byCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={sales.byCategory}
                        dataKey="revenue"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ name, revenue }: any) => `${name}: ${formatCurrency(revenue)}`}
                      >
                        {sales.byCategory.map((entry: any, index: any) => (
                          <Cell key={`cell-${index}`} fill={themeColors[index % themeColors.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Products Table */}
            <Card>
              <CardHeader>
                <CardTitle>Top Products</CardTitle>
                <CardDescription>Best selling products</CardDescription>
              </CardHeader>
              <CardContent>
                {sales?.byProduct && sales.byProduct.length > 0 ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {sales.byProduct.slice(0, 10).map((product: any, index: any) => (
                        <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                            <span className="text-sm font-medium">{product.name}</span>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold">{formatCurrency(product.revenue)}</div>
                            <div className="text-xs text-muted-foreground">{product.quantity} sold</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="customers" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
                <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {customers?.totalCustomers.toLocaleString() || '-'}
                </div>
                <p className="text-xs text-muted-foreground">All time</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">New Customers</CardTitle>
                <ArrowTrendingUpIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {customers?.newCustomers.toLocaleString() || '-'}
                </div>
                <p className="text-xs text-muted-foreground">In selected period</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
                <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {customers ? `${customers.conversionRate}%` : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {customers?.customersWithOrders || 0} with orders
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg Lifetime Value</CardTitle>
                <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {customers ? formatCurrency(customers.lifetimeValue.average) : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  Avg order: {customers ? formatCurrency(customers.lifetimeValue.averageOrderValue) : '-'}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Customer Acquisition Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Customer Acquisition Trend</CardTitle>
                <CardDescription>New customers over time</CardDescription>
              </CardHeader>
              <CardContent>
                {customers?.acquisitionTrend && customers.acquisitionTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={customers.acquisitionTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="date" 
                        tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                      />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => `${Number(value)} customers`}
                        labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                      />
                      <Legend />
                      <Line 
                        type="monotone" 
                        dataKey="count" 
                        stroke={secondary} 
                        strokeWidth={2}
                        name="New Customers"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Top Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Customers</CardTitle>
                <CardDescription>Best customers by revenue</CardDescription>
              </CardHeader>
              <CardContent>
                {customers?.topCustomers && customers.topCustomers.length > 0 ? (
                  <div className="space-y-2">
                    {customers.topCustomers.map((customer: any, index: any) => (
                      <div key={customer.id} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                          <div>
                            <div className="text-sm font-medium">{customer.name}</div>
                            <div className="text-xs text-muted-foreground">{customer.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{formatCurrency(customer.totalRevenue)}</div>
                          <div className="text-xs text-muted-foreground">{customer.orderCount} orders</div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="inventory" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Products</CardTitle>
                <CubeIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inventory?.summary.totalProducts.toLocaleString() || '-'}
                </div>
                <p className="text-xs text-muted-foreground">Active products</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Items</CardTitle>
                <ExclamationTriangleIcon className="h-4 w-4 text-yellow-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {inventory?.summary.lowStockCount.toLocaleString() || '-'}
                </div>
                <p className="text-xs text-muted-foreground">Needs attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Out of Stock</CardTitle>
                <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {inventory?.summary.outOfStockCount.toLocaleString() || '-'}
                </div>
                <p className="text-xs text-muted-foreground">Items unavailable</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Inventory Value</CardTitle>
                <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {inventory ? formatCurrency(inventory.summary.totalInventoryValue) : '-'}
                </div>
                <p className="text-xs text-muted-foreground">Total stock value</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Low Stock Alerts */}
            <Card>
              <CardHeader>
                <CardTitle>Low Stock Alerts</CardTitle>
                <CardDescription>Products and variants below threshold</CardDescription>
              </CardHeader>
              <CardContent>
                {inventory?.lowStock.products && inventory.lowStock.products.length > 0 ? (
                  <div className="space-y-2 max-h-[400px] overflow-y-auto">
                    {inventory.lowStock.products.slice(0, 10).map((product: any) => (
                      <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="text-sm font-medium">{product.name}</div>
                          {product.sku && (
                            <div className="text-xs text-muted-foreground">SKU: {product.sku}</div>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold text-yellow-600">
                            {product.stock_quantity} left
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatCurrency(product.price)} each
                          </div>
                        </div>
                      </div>
                    ))}
                    {inventory.lowStock.variants.length > 0 && (
                      <div className="mt-4 pt-4 border-t">
                        <div className="text-sm font-medium mb-2">Low Stock Variants</div>
                        {inventory.lowStock.variants.slice(0, 5).map((variant: any) => (
                          <div key={variant.id} className="flex items-center justify-between p-2 border rounded mb-2">
                            <div>
                              <div className="text-sm font-medium">{variant.productName}</div>
                              <div className="text-xs text-muted-foreground">Variant</div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-semibold text-yellow-600">
                                {variant.stockQuantity} left
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No low stock items
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Inventory by Category */}
            <Card>
              <CardHeader>
                <CardTitle>Inventory by Category</CardTitle>
                <CardDescription>Stock value breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                {inventory?.byCategory && inventory.byCategory.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={inventory.byCategory}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="name" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis tickFormatter={formatAxisCurrency} />
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      <Legend />
                      <Bar dataKey="value" fill={accent} name="Inventory Value" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Advanced Analytics Tab - Only for Pro/Premium */}
        {hasAdvancedAccess && (
          <TabsContent value="advanced" className="space-y-6">
            {/* Real-Time Analytics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Live Visitors</CardTitle>
                  <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {realtime?.live.estimatedVisitors.toLocaleString() || '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">Estimated active now</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Orders Last Hour</CardTitle>
                  <ShoppingCartIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {realtime?.live.ordersLastHour || '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">In the past hour</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today&apos;s Revenue</CardTitle>
                  <CurrencyDollarIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {realtime ? formatCurrency(realtime.live.todayRevenue) : '-'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {realtime?.live.todayOrders || 0} orders today
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Recent Activity</CardTitle>
                  <ArrowTrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {realtime?.recentOrders.length || 0}
                  </div>
                  <p className="text-xs text-muted-foreground">Orders in last 24h</p>
                </CardContent>
              </Card>
            </div>

            {/* Conversion Funnel */}
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>Customer journey from visit to purchase</CardDescription>
              </CardHeader>
              <CardContent>
                {conversionFunnel ? (
                  <div className="space-y-6">
                    {/* Funnel Visualization */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-medium">Visitors</div>
                          <div className="text-2xl font-bold">{conversionFunnel.funnel.visitors.toLocaleString()}</div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {conversionFunnel.rates.addToCartRate.toFixed(1)}% → Add to Cart
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-medium">Add to Cart</div>
                          <div className="text-2xl font-bold">{conversionFunnel.funnel.addToCart.toLocaleString()}</div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {conversionFunnel.rates.checkoutRate.toFixed(1)}% → Checkout
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                        <div className="flex-1">
                          <div className="text-sm font-medium">Checkout Started</div>
                          <div className="text-2xl font-bold">{conversionFunnel.funnel.checkoutStarted.toLocaleString()}</div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          {conversionFunnel.rates.conversionRate.toFixed(1)}% → Completed
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-primary/10 rounded-lg border border-primary/20">
                        <div className="flex-1">
                          <div className="text-sm font-medium">Orders Completed</div>
                          <div className="text-2xl font-bold text-primary">{conversionFunnel.funnel.ordersCompleted.toLocaleString()}</div>
                        </div>
                        <div className="text-right text-sm text-muted-foreground">
                          Final conversion
                        </div>
                      </div>
                    </div>

                    {/* Conversion Rates */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pt-4 border-t">
                      <div>
                        <div className="text-sm text-muted-foreground">Add to Cart Rate</div>
                        <div className="text-lg font-semibold">{conversionFunnel.rates.addToCartRate.toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Checkout Rate</div>
                        <div className="text-lg font-semibold">{conversionFunnel.rates.checkoutRate.toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Conversion Rate</div>
                        <div className="text-lg font-semibold">{conversionFunnel.rates.conversionRate.toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Cart Abandonment</div>
                        <div className="text-lg font-semibold text-yellow-600">{conversionFunnel.rates.cartAbandonmentRate.toFixed(2)}%</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Checkout Abandonment</div>
                        <div className="text-lg font-semibold text-red-600">{conversionFunnel.rates.checkoutAbandonmentRate.toFixed(2)}%</div>
                      </div>
                    </div>

                    {conversionFunnel.note && (
                      <Alert>
                        <AlertDescription className="text-xs">{conversionFunnel.note}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No data available
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Geographic Analytics */}
              <Card>
                <CardHeader>
                  <CardTitle>Geographic Analytics</CardTitle>
                  <CardDescription>Sales by location</CardDescription>
                </CardHeader>
                <CardContent>
                  {geographic && geographic.byCountry.length > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium mb-2">Top Countries</div>
                        <div className="space-y-2">
                          {geographic.byCountry.slice(0, 5).map((country, index) => (
                            <div key={country.country} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                                <span className="text-sm font-medium">{country.country}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold">{formatCurrency(country.revenue)}</div>
                                <div className="text-xs text-muted-foreground">{country.orders} orders</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="text-sm font-medium mb-2">Top Cities</div>
                        <div className="space-y-2">
                          {geographic.byCity.slice(0, 5).map((city, index) => (
                            <div key={`${city.city}-${city.state}`} className="flex items-center justify-between p-2 border rounded">
                              <div>
                                <div className="text-sm font-medium">{city.city}</div>
                                <div className="text-xs text-muted-foreground">{city.state}, {city.country}</div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold">{formatCurrency(city.revenue)}</div>
                                <div className="text-xs text-muted-foreground">{city.orders} orders</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No geographic data available
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Refunds & Returns */}
              <Card>
                <CardHeader>
                  <CardTitle>Refunds & Returns</CardTitle>
                  <CardDescription>Refund metrics and trends</CardDescription>
                </CardHeader>
                <CardContent>
                  {refunds ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <div className="text-sm text-muted-foreground">Refund Rate</div>
                          <div className="text-2xl font-bold text-red-600">{refunds.summary.refundRate.toFixed(2)}%</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Refunded Amount</div>
                          <div className="text-2xl font-bold">{formatCurrency(refunds.summary.refundedAmount)}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Total Orders</div>
                          <div className="text-lg font-semibold">{refunds.summary.totalOrders}</div>
                        </div>
                        <div>
                          <div className="text-sm text-muted-foreground">Refunded Orders</div>
                          <div className="text-lg font-semibold">{refunds.summary.refundedOrders}</div>
                        </div>
                      </div>
                      <div className="pt-4 border-t">
                        <div className="text-sm font-medium mb-2">Net Revenue</div>
                        <div className="text-2xl font-bold text-primary">
                          {formatCurrency(refunds.summary.netRevenue)}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatCurrency(refunds.summary.totalRevenue)} - {formatCurrency(refunds.summary.refundedAmount)} refunds
                        </div>
                      </div>
                      {refunds.trends.length > 0 && (
                        <div className="pt-4 border-t">
                          <div className="text-sm font-medium mb-2">Refund Trends</div>
                          <ResponsiveContainer width="100%" height={150}>
                            <LineChart data={refunds.trends}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="week" 
                                tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                                tick={{ fontSize: 10 }}
                              />
                              <YAxis tick={{ fontSize: 10 }} />
                              <Tooltip />
                              <Line 
                                type="monotone" 
                                dataKey="count" 
                                stroke={primary} 
                                strokeWidth={2}
                                name="Refunds"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No refund data available
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Product Performance Deep Dive */}
            <Card>
              <CardHeader>
                <CardTitle>Product Performance Deep Dive</CardTitle>
                <CardDescription>Detailed product analytics and conversion rates</CardDescription>
              </CardHeader>
              <CardContent>
                {productPerformance ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Total Products</div>
                        <div className="text-2xl font-bold">{productPerformance.totalProducts}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Products with Sales</div>
                        <div className="text-2xl font-bold">{productPerformance.productsWithSales}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Conversion Rate (Avg)</div>
                        <div className="text-2xl font-bold">
                          {productPerformance.products.length > 0
                            ? (productPerformance.products.reduce((sum, p) => sum + p.conversionRate, 0) / productPerformance.products.length).toFixed(2)
                            : '0.00'}%
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Best Performers by Revenue */}
                      <div>
                        <div className="text-sm font-medium mb-3">Top Products by Revenue</div>
                        <div className="space-y-2">
                          {productPerformance.bestByRevenue.slice(0, 5).map((product, index) => (
                            <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex-1">
                                <div className="text-sm font-medium">{product.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {product.totalSold} sold • {product.conversionRate.toFixed(2)}% conversion
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold">{formatCurrency(product.totalRevenue)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Best by Conversion */}
                      <div>
                        <div className="text-sm font-medium mb-3">Top Products by Conversion Rate</div>
                        <div className="space-y-2">
                          {productPerformance.bestByConversion.slice(0, 5).map((product) => (
                            <div key={product.id} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex-1">
                                <div className="text-sm font-medium">{product.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {product.totalSold} sold • {product.estimatedViews} views
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold text-primary">{product.conversionRate.toFixed(2)}%</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {productPerformance.note && (
                      <Alert>
                        <AlertDescription className="text-xs">{productPerformance.note}</AlertDescription>
                      </Alert>
                    )}
                  </div>
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                    No product performance data available
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Period Comparison */}
            {comparison && (
              <Card>
                <CardHeader>
                  <CardTitle>Period Comparison</CardTitle>
                  <CardDescription>
                    Comparing {format(new Date(comparison.period1.startDate), 'MMM dd')} - {format(new Date(comparison.period1.endDate), 'MMM dd')} 
                    {' vs '}
                    {format(new Date(comparison.period2.startDate), 'MMM dd')} - {format(new Date(comparison.period2.endDate), 'MMM dd')}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Revenue</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xl font-bold">{formatCurrency(comparison.period1.revenue)}</div>
                        {comparison.trends.revenue === 'up' ? (
                          <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`text-sm font-semibold ${comparison.growth.revenue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {comparison.growth.revenue >= 0 ? '+' : ''}{comparison.growth.revenue.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Previous: {formatCurrency(comparison.period2.revenue)}
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Orders</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xl font-bold">{comparison.period1.orders}</div>
                        {comparison.trends.orders === 'up' ? (
                          <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`text-sm font-semibold ${comparison.growth.orders >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {comparison.growth.orders >= 0 ? '+' : ''}{comparison.growth.orders.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Previous: {comparison.period2.orders}
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Customers</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xl font-bold">{comparison.period1.customers}</div>
                        {comparison.trends.customers === 'up' ? (
                          <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`text-sm font-semibold ${comparison.growth.customers >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {comparison.growth.customers >= 0 ? '+' : ''}{comparison.growth.customers.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Previous: {comparison.period2.customers}
                      </div>
                    </div>

                    <div className="p-4 border rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Avg Order Value</div>
                      <div className="flex items-center gap-2">
                        <div className="text-xl font-bold">{formatCurrency(comparison.period1.averageOrderValue)}</div>
                        {comparison.trends.averageOrderValue === 'up' ? (
                          <ArrowTrendingUpIcon className="h-5 w-5 text-green-600" />
                        ) : (
                          <ArrowTrendingDownIcon className="h-5 w-5 text-red-600" />
                        )}
                        <span className={`text-sm font-semibold ${comparison.growth.averageOrderValue >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {comparison.growth.averageOrderValue >= 0 ? '+' : ''}{comparison.growth.averageOrderValue.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Previous: {formatCurrency(comparison.period2.averageOrderValue)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Traffic Sources */}
            {trafficSources && (
              <Card>
                <CardHeader>
                  <CardTitle>Traffic Sources</CardTitle>
                  <CardDescription>Where your visitors come from</CardDescription>
                </CardHeader>
                <CardContent>
                  {trafficSources.bySource && trafficSources.bySource.length > 0 ? (
                    <div className="space-y-4">
                      <div>
                        <div className="text-sm font-medium mb-2">Top Traffic Sources</div>
                        <div className="space-y-2">
                          {trafficSources.bySource.slice(0, 10).map((source: any, index: number) => (
                            <div key={source.source} className="flex items-center justify-between p-2 border rounded">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-muted-foreground">#{index + 1}</span>
                                <span className="text-sm font-medium">{source.source}</span>
                              </div>
                              <div className="text-right">
                                <div className="text-sm font-semibold">{source.sessions.toLocaleString()} sessions</div>
                                <div className="text-xs text-muted-foreground">{formatCurrency(source.revenue)} revenue</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      {trafficSources.byCampaign && trafficSources.byCampaign.length > 0 && (
                        <div className="pt-4 border-t">
                          <div className="text-sm font-medium mb-2">Top Campaigns</div>
                          <div className="space-y-2">
                            {trafficSources.byCampaign.slice(0, 5).map((campaign: any) => (
                              <div key={campaign.campaign} className="flex items-center justify-between p-2 border rounded">
                                <span className="text-sm font-medium">{campaign.campaign}</span>
                                <span className="text-sm font-semibold">{campaign.count} sessions</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                      No traffic source data available
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Recent Orders */}
            {realtime && realtime.recentOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>
                    Latest activity in the past 24 hours
                    {realtimePolling && <span className="ml-2 text-xs text-muted-foreground">(Live)</span>}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {realtime.recentOrders.map((order) => (
                      <div key={order.id} className="flex items-center justify-between p-3 border rounded">
                        <div>
                          <div className="text-sm font-medium">{order.orderNumber}</div>
                          <div className="text-xs text-muted-foreground">
                            {order.customerName || 'Guest'} • {format(new Date(order.createdAt), 'MMM dd, yyyy HH:mm')}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">{formatCurrency(order.amount)}</div>
                          <div className="text-xs text-muted-foreground capitalize">{order.status}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Scheduled Reports */}
            <ScheduledReportsManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

