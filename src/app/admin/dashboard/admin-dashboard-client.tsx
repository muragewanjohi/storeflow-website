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
import { BuildingOfficeIcon, ArrowRightIcon, UserPlusIcon, ArrowPathIcon, SparklesIcon, ArrowTrendingUpIcon } from '@heroicons/react/24/outline';
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
  const [marketingStats, setMarketingStats] = useState<{
    stats: { registrations: number; renewals: number; activations: number; upgrades: number };
    chartData: Array<{ date: string; registrations: number; renewals: number }>;
  } | null>(null);
  const [acquisitionFunnel, setAcquisitionFunnel] = useState<{
    funnel: {
      landingViews: number;
      ctaClicks: number;
      signUpStarted: number;
      signUpFailed: number;
      signUpCompleted: number;
    };
    rates: {
      landingToCtaRate: number;
      ctaToSignupStartRate: number;
      signupStartToCompleteRate: number;
      overallLandingToCompleteRate: number;
    };
    campaigns: Array<{
      campaign: string;
      landingViews: number;
      ctaClicks: number;
      signUpStarted: number;
      signUpFailed: number;
      signUpCompleted: number;
      overallLandingToCompleteRate: number;
    }>;
  } | null>(null);
  const [loadingMarketing, setLoadingMarketing] = useState(false);

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

  // Fetch marketing stats
  useEffect(() => {
    const fetchMarketingStats = async () => {
      setLoadingMarketing(true);
      try {
        const [marketingResponse, acquisitionResponse] = await Promise.all([
          fetch('/api/admin/marketing-stats?period=month'),
          fetch('/api/admin/analytics/acquisition-funnel?period=month'),
        ]);

        if (marketingResponse.ok) {
          const data = await marketingResponse.json();
          setMarketingStats({
            stats: data.stats,
            chartData: data.chartData || [],
          });
        }

        if (acquisitionResponse.ok) {
          const data = await acquisitionResponse.json();
          setAcquisitionFunnel({
            funnel: data.funnel,
            rates: data.rates,
            campaigns: data.campaigns || [],
          });
        }
      } catch (error) {
        console.error('Error fetching marketing stats:', error);
      } finally {
        setLoadingMarketing(false);
      }
    };
    fetchMarketingStats();
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
          <TabsTrigger 
            value="marketing"
            className="data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=inactive]:text-muted-foreground/70 hover:text-foreground"
          >
            Marketing
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

        <TabsContent value="marketing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Ads to Signup Funnel (Landlord View)</CardTitle>
              <CardDescription>
                Tracks acquisition flow from ad landing page to completed signup using internal funnel events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMarketing ? (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : acquisitionFunnel ? (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Landing Views</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{acquisitionFunnel.funnel.landingViews}</div>
                        <p className="text-xs text-muted-foreground">ad_landing_page_view</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">CTA Clicks</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{acquisitionFunnel.funnel.ctaClicks}</div>
                        <p className="text-xs text-muted-foreground">
                          {acquisitionFunnel.rates.landingToCtaRate}% from landing views
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Signup Started</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{acquisitionFunnel.funnel.signUpStarted}</div>
                        <p className="text-xs text-muted-foreground">
                          {acquisitionFunnel.rates.ctaToSignupStartRate}% from CTA clicks
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Signup Failed</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{acquisitionFunnel.funnel.signUpFailed}</div>
                        <p className="text-xs text-muted-foreground">Validation/API failures</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Signup Completed</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{acquisitionFunnel.funnel.signUpCompleted}</div>
                        <p className="text-xs text-muted-foreground">
                          {acquisitionFunnel.rates.overallLandingToCompleteRate}% total conversion
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Start → Complete Rate</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{acquisitionFunnel.rates.signupStartToCompleteRate}%</div>
                        <p className="text-xs text-muted-foreground">
                          Percentage of started signups that complete registration
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-sm font-medium">Campaign Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        {acquisitionFunnel.campaigns.length > 0 ? (
                          <div className="space-y-2">
                            {acquisitionFunnel.campaigns.slice(0, 5).map((campaign) => (
                              <div key={campaign.campaign} className="flex items-center justify-between text-sm">
                                <span className="truncate pr-2">{campaign.campaign}</span>
                                <span className="font-medium">
                                  {campaign.signUpCompleted}/{campaign.landingViews} ({campaign.overallLandingToCompleteRate}%)
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-sm text-muted-foreground">No campaign data yet</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </div>
              ) : (
                <div className="h-[180px] flex items-center justify-center text-muted-foreground">
                  No acquisition funnel data yet
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Conversion Funnel</CardTitle>
              <CardDescription>
                Meta Pixel events and conversion stats for the current month. Aligns with Lead, CompleteRegistration, and Subscribe events.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingMarketing ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Loading...
                </div>
              ) : marketingStats ? (
                <>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Registrations</CardTitle>
                        <UserPlusIcon className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{marketingStats.stats.registrations}</div>
                        <p className="text-xs text-muted-foreground">
                          New stores (CompleteRegistration)
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Renewals</CardTitle>
                        <ArrowPathIcon className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{marketingStats.stats.renewals}</div>
                        <p className="text-xs text-muted-foreground">
                          Subscription renewals (Subscribe)
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Activations</CardTitle>
                        <SparklesIcon className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{marketingStats.stats.activations}</div>
                        <p className="text-xs text-muted-foreground">
                          First-time subscriptions
                        </p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Upgrades</CardTitle>
                        <ArrowTrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold">{marketingStats.stats.upgrades}</div>
                        <p className="text-xs text-muted-foreground">
                          Plan upgrades
                        </p>
                      </CardContent>
                    </Card>
                  </div>
                  {marketingStats.chartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart data={marketingStats.chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          tickFormatter={(value) => format(new Date(value), 'MMM dd')}
                          style={{ fontSize: '12px' }}
                        />
                        <YAxis style={{ fontSize: '12px' }} />
                        <Tooltip
                          labelFormatter={(value) => format(new Date(value), 'MMM dd, yyyy')}
                          formatter={(value: unknown) => (typeof value === 'number' ? value.toLocaleString() : String(value ?? ''))}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="registrations" stroke="#3b82f6" strokeWidth={2} name="Registrations" dot={{ r: 4 }} />
                        <Line type="monotone" dataKey="renewals" stroke="#10b981" strokeWidth={2} name="Renewals" dot={{ r: 4 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                      No marketing data for this period yet
                    </div>
                  )}
                </>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Failed to load marketing stats
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

