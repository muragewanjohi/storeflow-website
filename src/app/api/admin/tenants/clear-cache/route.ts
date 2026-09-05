/**
 * API Route: Clear Tenant Cache
 * 
 * POST /api/admin/tenants/clear-cache
 * Body: { subdomain?: string, hostname?: string }
 * 
 * Clear tenant cache for a specific subdomain/hostname or all tenants
 * Only accessible to landlord/admin users
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, requireRole } from '@/lib/auth/server';
import { clearCachedTenant, clearAllCachedTenants } from '@/lib/tenant-context/cache';

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    requireRole(user, 'landlord');

    const body = await request.json();
    const { subdomain, hostname } = body;

    if (subdomain) {
      // Clear cache for specific subdomain (try common hostname patterns)
      const hostnames = [
        `${subdomain}.dukanest.com`,
        `https://${subdomain}.dukanest.com`,
        `http://${subdomain}.dukanest.com`,
      ];
      
      for (const h of hostnames) {
        await clearCachedTenant(h);
      }
      
      return NextResponse.json({
        success: true,
        message: `Cache cleared for subdomain: ${subdomain}`,
        cleared: hostnames,
      });
    } else if (hostname) {
      // Clear cache for specific hostname
      await clearCachedTenant(hostname);
      
      return NextResponse.json({
        success: true,
        message: `Cache cleared for hostname: ${hostname}`,
        cleared: [hostname],
      });
    } else {
      // Clear all cached tenants
      clearAllCachedTenants();
      
      return NextResponse.json({
        success: true,
        message: 'All tenant caches cleared',
      });
    }
  } catch (error: any) {
    console.error('Error clearing tenant cache:', error);
    return NextResponse.json(
      { 
        error: 'Failed to clear cache',
        message: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}
