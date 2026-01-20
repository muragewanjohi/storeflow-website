/**
 * Admin Dashboard Client Component
 * 
 * Client-side component for admin dashboard with analytics tracking
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { BuildingOfficeIcon, ArrowRightIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { useAdminAnalytics } from '@/hooks/use-admin-analytics';
import { type AuthUser } from '@/lib/auth/types';
import { isGAAvailable } from '@/lib/analytics/google-analytics';
import PageviewsDashboard from '@/components/admin/pageviews-dashboard';
import TenantsDashboard from '@/components/admin/tenants-dashboard';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from '@/components/analytics/lazy-charts';
import { format } from 'date-fns';

interface AdminDashboardClientProps {
  user: AuthUser;
  totalTenants: number;
  activeTenants: number;
}

export default function AdminDashboardClient({
  user,
  totalTenants,
  activeTenants,
}: Readonly<AdminDashboardClientProps>) {
  const { trackAction, trackInsight } = useAdminAnalytics({
    user,
    pageName: '/dashboard',
  });
  const [gaStatus, setGaStatus] = useState<'checking' | 'available' | 'unavailable'>('checking');
  const [pageviewSummary, setPageviewSummary] = useState<Array<{ date: string; views: number }>>([]);
  const [loadingSummary, setLoadingSummary] = useState(true);

  useEffect(() => {
    // Check if GA is available after a short delay to allow script to load
    const checkGA = setTimeout(() => {
      const available = isGAAvailable();
      setGaStatus(available ? 'available' : 'unavailable');
      
      if (process.env.NODE_ENV === 'development') {
        if (available) {
          console.log('[Admin Dashboard] Google Analytics is available and tracking is active');
        } else {
          console.warn('[Admin Dashboard] Google Analytics is not available. Make sure NEXT_PUBLIC_GA_MEASUREMENT_ID is set in your .env.local file.');
        }
      }
    }, 1000);

    return () => clearTimeout(checkGA);
  }, []);

  useEffect(() => {
    // Track dashboard insights when data loads (with delay to ensure GA is ready)
    const timer = setTimeout(() => {
      trackInsight('dashboard_view', {
        total_tenants: totalTenants,
        active_tenants: activeTenants,
        inactive_tenants: totalTenants - activeTenants,
      });
    }, 1500);

    return () => clearTimeout(timer);
  }, [totalTenants, activeTenants, trackInsight]);

  // Fetch pageview summary for Overview tab
  useEffect(() => {
    const fetchPageviewSummary = async () => {
      setLoadingSummary(true);
      try {
        const response = await fetch('/api/admin/analytics?period=month');
        if (response.ok) {
          const data = await response.json();
          setPageviewSummary(data.chartData.map((item: any) => ({
            date: item.date,
            views: item.views,
          })));
        }
      } catch (error) {
        console.error('Error fetching pageview summary:', error);
      } finally {
        setLoadingSummary(false);
      }
    };
    fetchPageviewSummary();
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Welcome back, {user.email}
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-muted/50 border border-border">
          <TabsTrigger 
            value="overview"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger 
            value="pageviews"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Pageviews
          </TabsTrigger>
          <TabsTrigger 
            value="tenants"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Tenants
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Summary Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
            <BuildingOfficeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalTenants}</div>
            <p className="text-xs text-muted-foreground">
              All registered stores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Tenants</CardTitle>
            <BuildingOfficeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeTenants}</div>
            <p className="text-xs text-muted-foreground">
              Currently active stores
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <BuildingOfficeIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">
              Coming soon
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common tasks and navigation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            <Button 
              asChild 
              variant="outline" 
              className="justify-start h-auto py-4"
            >
              <Link 
                href="/admin/tenants" 
                className="flex items-center justify-between w-full"
                onClick={() => trackAction('manage_tenants', 'quick_action', 'dashboard')}
              >
                <div className="flex items-center gap-2">
                  <BuildingOfficeIcon className="h-5 w-5" />
                  <div className="text-left">
                    <div className="font-semibold">Manage Tenants</div>
                    <div className="text-xs text-muted-foreground">View and manage all tenants</div>
                  </div>
                </div>
                <ArrowRightIcon className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

          {/* Page Views Summary Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Page Views Summary</CardTitle>
              <CardDescription>Page views over the last month</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingSummary ? (
                <div className="h-[300px] flex items-center justify-center">
                  <div className="text-muted-foreground">Loading...</div>
                </div>
              ) : pageviewSummary.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={pageviewSummary}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis style={{ fontSize: '12px' }} />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
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
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  No pageview data available yet
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pageviews">
          <PageviewsDashboard />
        </TabsContent>

        <TabsContent value="tenants">
          <TenantsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}

