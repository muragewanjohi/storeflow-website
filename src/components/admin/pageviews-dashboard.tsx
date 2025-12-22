/**
 * Pageviews Analytics Dashboard Component
 * 
 * Shows pageview-specific analytics with country data
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
import { format } from 'date-fns';

interface PageviewsData {
  period: string;
  chartData: Array<{
    date: string;
    views: number;
    events: number;
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
}

type Period = 'day' | 'month' | 'year';

export default function PageviewsDashboard() {
  const [period, setPeriod] = useState<Period>('month');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PageviewsData | null>(null);

  const fetchAnalytics = async (selectedPeriod: Period) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?period=${selectedPeriod}`);
      if (!response.ok) throw new Error('Failed to fetch analytics');
      const analyticsData = await response.json();
      setData({
        period: analyticsData.period,
        chartData: analyticsData.chartData,
        topPages: analyticsData.topPages,
        eventTypes: analyticsData.eventTypes,
        pageviewsByCountry: analyticsData.pageviewsByCountry,
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

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

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
          No pageview data available yet.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Pageviews Analytics</h2>
          <p className="text-muted-foreground">Page views and user interactions</p>
        </div>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList>
            <TabsTrigger value="day">Day</TabsTrigger>
            <TabsTrigger value="month">Month</TabsTrigger>
            <TabsTrigger value="year">Year</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

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
    </div>
  );
}

