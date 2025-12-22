/**
 * Tenants Analytics Dashboard Component
 * 
 * Shows tenant-specific analytics with country data
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
} from '@/components/analytics/lazy-charts';
import { format } from 'date-fns';

interface TenantsData {
  period: string;
  tenantChartData: Array<{
    date: string;
    tenants: number;
  }>;
  tenantsByCountry: Array<{
    country: string;
    count: number;
  }>;
  totalTenants: number;
}

type Period = 'day' | 'month' | 'year';

export default function TenantsDashboard() {
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<TenantsData | null>(null);

  const fetchAnalytics = async (selectedPeriod: Period) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const analyticsData = await response.json();
      setData({
        period: analyticsData.period,
        tenantChartData: analyticsData.tenantChartData,
        tenantsByCountry: analyticsData.tenantsByCountry,
        totalTenants: analyticsData.stats.totalTenants,
      });
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

  if (loading) {
    return (
      <div className="space-y-6">
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
          No tenant data available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tenants Analytics</h2>
          <p className="text-muted-foreground">Tenant registrations and statistics</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Total Tenants Card */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Tenants</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{data.totalTenants.toLocaleString()}</div>
          <p className="text-xs text-muted-foreground">All registered stores</p>
        </CardContent>
      </Card>

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
    </div>
  );
}

