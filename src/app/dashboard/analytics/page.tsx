/**
 * Analytics Dashboard Page
 * 
 * Main analytics dashboard with overview metrics, charts, and reports
 * 
 * Day 33: Admin Dashboard - Analytics Dashboard Foundation
 */

import { requireAuth } from '@/lib/auth/server';
import { requireTenant } from '@/lib/tenant-context/server';
import AnalyticsDashboardClient from './analytics-dashboard-client';

export const dynamic = 'force-dynamic';

export default async function AnalyticsDashboardPage() {
  const user = await requireAuth();
  const tenant = await requireTenant();

  return <AnalyticsDashboardClient />;
}

