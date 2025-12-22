/**
 * Admin Analytics Dashboard Component
 * 
 * Visual analytics dashboard with charts and statistics
 * Three tabs: Overview, Pageviews, Tenants
 */

'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
  Cell,
} from '@/components/analytics/lazy-charts';
import {
  EyeIcon,
  CursorArrowRaysIcon,
  UserGroupIcon,
  BuildingOfficeIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface AnalyticsData {
  period: string;
  dateRange: {
    from: string;
    to: string;
  };
  stats: {
    totalViews: number;
    totalEvents: number;
    uniqueUsers: number;
    totalTenants: number;
  };
  chartData: Array<{
    date: string;
    views: number;
    events: number;
    tenants: number;
  }>;
  tenantChartData: Array<{
    date: string;
    tenants: number;
  }>;
  topPages: Array<{
    path: string;
    count: number;
  }>;
  eventTypes: Array<{
    name: string;
    count: number;
  }>;
  pageviewsByCountry: Array<{
    country: string;
    count: number;
  }>;
  tenantsByCountry: Array<{
    country: string;
    count: number;
  }>;
}

type Period = 'day' | 'month' | 'year';

interface AdminAnalyticsDashboardProps {
  initialTab?: 'overview' | 'pageviews' | 'tenants';
}

export default function AdminAnalyticsDashboard({ initialTab = 'overview' }: Readonly<AdminAnalyticsDashboardProps>) {
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'pageviews' | 'tenants'>(initialTab);

  const fetchAnalytics = async (selectedPeriod: Period) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const analyticsData = await response.json();
      setData(analyticsData);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics(period);
  }, [period]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    switch (period) {
      case 'day':
        return format(date, 'HH:mm');
      case 'month':
        return format(date, 'MMM dd');
      case 'year':
        return format(date, 'MMM yyyy');
      default:
        return format(date, 'MMM dd');
    }
  };

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-muted rounded w-1/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
        <Card className="animate-pulse">
          <CardContent className="h-[400px] bg-muted rounded"></CardContent>
        </Card>
      </div>
    );
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          No analytics data available yet. Start using the dashboard to see statistics.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
          <p className="text-muted-foreground">Page views, tenant registrations, and statistics</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Main Tabs: Overview, Pageviews, Tenants */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'overview' | 'pageviews' | 'tenants')} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="pageviews">Pageviews</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Page Views</CardTitle>
                <EyeIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.totalViews.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">All time page views</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Events</CardTitle>
                <CursorArrowRaysIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.totalEvents.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">User interactions</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Unique Users</CardTitle>
                <UserGroupIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.uniqueUsers.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Active users</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
                <BuildingOfficeIcon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.stats.totalTenants.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Registered stores</p>
              </CardContent>
            </Card>
          </div>

          {/* Page Views Summary Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Page Views Summary</CardTitle>
              <CardDescription>Page views over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip 
                    labelFormatter={(value) => formatDate(value as string)}
                    formatter={(value: any) => typeof value === 'number' ? value.toLocaleString() : value}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Page Views"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pageviews Tab */}
        <TabsContent value="pageviews" className="space-y-6">
          {/* Page Views Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Page Views & Events Over Time</CardTitle>
              <CardDescription>Track page views and user interactions over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={data.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip 
                    labelFormatter={(value) => formatDate(value as string)}
                    formatter={(value: any) => typeof value === 'number' ? value.toLocaleString() : value}
                  />
                  <Legend />
                  <Line 
                    type="monotone" 
                    dataKey="views" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    name="Page Views"
                    dot={{ r: 4 }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="events" 
                    stroke="#10b981" 
                    strokeWidth={2}
                    name="Events"
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Top Pages */}
            <Card>
              <CardHeader>
                <CardTitle>Top Pages</CardTitle>
                <CardDescription>Most visited pages</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.topPages.slice(0, 5)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" style={{ fontSize: '12px' }} />
                    <YAxis 
                      dataKey="path" 
                      type="category" 
                      width={150}
                      style={{ fontSize: '12px' }}
                      tickFormatter={(value) => value.length > 20 ? value.substring(0, 20) + '...' : value}
                    />
                    <Tooltip formatter={(value: any) => typeof value === 'number' ? value.toLocaleString() : value} />
                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Pageviews by Country */}
            <Card>
              <CardHeader>
                <CardTitle>Pageviews by Country</CardTitle>
                <CardDescription>Distribution of page views by country</CardDescription>
              </CardHeader>
              <CardContent>
                {data.pageviewsByCountry.length > 0 ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={data.pageviewsByCountry}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry: any) => {
                          const percent = entry.percent;
                          const country = entry.country || 'Unknown';
                          return `${country}: ${percent ? (percent * 100).toFixed(0) : 0}%`;
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="count"
                      >
                        {data.pageviewsByCountry.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => typeof value === 'number' ? value.toLocaleString() : value} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                    No country data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Event Types */}
          <Card>
            <CardHeader>
              <CardTitle>Event Types</CardTitle>
              <CardDescription>Distribution of event types</CardDescription>
            </CardHeader>
            <CardContent>
              {data.eventTypes.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={data.eventTypes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      style={{ fontSize: '12px' }}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip formatter={(value: any) => typeof value === 'number' ? value.toLocaleString() : value} />
                    <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-muted-foreground">
                  No events recorded yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants" className="space-y-6">
          {/* Tenant Registrations Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Tenant Registrations Over Time</CardTitle>
              <CardDescription>Track new tenant registrations over the selected period</CardDescription>
            </CardHeader>
            <CardContent>
              {data.tenantChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={data.tenantChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={formatDate}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip 
                      labelFormatter={(value) => formatDate(value as string)}
                      formatter={(value: any) => typeof value === 'number' ? value.toLocaleString() : value}
                    />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="tenants" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      name="New Tenants"
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No tenant registrations in this period
                </div>
              )}
            </CardContent>
          </Card>

          {/* Tenants by Country */}
          <Card>
            <CardHeader>
              <CardTitle>Tenants by Country</CardTitle>
              <CardDescription>Distribution of tenants by country</CardDescription>
            </CardHeader>
            <CardContent>
              {data.tenantsByCountry.length > 0 ? (
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={data.tenantsByCountry} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" style={{ fontSize: '12px' }} />
                    <YAxis 
                      dataKey="country" 
                      type="category" 
                      width={150}
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip formatter={(value: any) => typeof value === 'number' ? value.toLocaleString() : value} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                  No country data available for tenants
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
