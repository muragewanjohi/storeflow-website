/**
 * Admin Settings Page
 * 
 * Platform-wide settings and system information for landlord admin
 */

import { redirect } from 'next/navigation';
import { requireAuthOrRedirect, requireRoleOrRedirect } from '@/lib/auth/server';
import { prisma } from '@/lib/prisma/client';
import AdminSettingsClient from './admin-settings-client';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  const user = await requireAuthOrRedirect('/admin/login');
  await requireRoleOrRedirect(user, 'landlord', '/admin/login');

  // Get platform statistics
  const [tenantCount, activeTenantCount, planCount, totalUsers] = await Promise.all([
    prisma.tenants.count(),
    prisma.tenants.count({
      where: { status: 'active' },
    }),
    prisma.price_plans.count(),
    // Get user count from Supabase (approximate)
    Promise.resolve(0), // We'll fetch this in the client if needed
  ]);

  // Check environment variables status
  const envStatus = {
    supabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    supabaseAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    supabaseServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    databaseUrl: !!process.env.DATABASE_URL,
    resendApiKey: !!process.env.RESEND_API_KEY || !!process.env.SENDGRID_API_KEY,
    resendFromEmail:
      !!process.env.RESEND_FROM_EMAIL ||
      !!process.env.SENDGRID_FROM_EMAIL ||
      !!process.env.SMTP_FROM,
    googleMapsApiKey: !!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY,
    vercelUrl: !!process.env.VERCEL_URL || !!process.env.NEXT_PUBLIC_VERCEL_URL,
    cronSecret: !!process.env.CRON_SECRET || !!process.env.CRON_SECRET_TOKEN,
  };

  const systemInfo = {
    nodeEnv: process.env.NODE_ENV || 'development',
    vercelUrl: process.env.VERCEL_URL || process.env.NEXT_PUBLIC_VERCEL_URL || null,
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground mt-2">
          Platform configuration and system information
        </p>
      </div>
      <AdminSettingsClient
        stats={{
          tenantCount,
          activeTenantCount,
          planCount,
        }}
        envStatus={envStatus}
        systemInfo={systemInfo}
      />
    </div>
  );
}
