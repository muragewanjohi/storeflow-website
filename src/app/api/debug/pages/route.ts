/**
 * Debug API: Check Pages for Tenant
 * 
 * Temporary diagnostic endpoint to verify pages exist in database
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    
    // Get all pages for this tenant
    const pages = await prisma.pages.findMany({
      where: {
        tenant_id: tenant.id,
      },
      select: {
        id: true,
        title: true,
        slug: true,
        status: true,
        created_at: true,
        updated_at: true,
        tenant_id: true,
      },
      orderBy: {
        created_at: 'asc',
      },
    });
    
    // Also check for required pages specifically
    const requiredSlugs = ['home', 'about', 'contact'];
    const foundSlugs = pages.map(p => p.slug?.toLowerCase()).filter(Boolean);
    const missingRequired = requiredSlugs.filter(slug => !foundSlugs.includes(slug.toLowerCase()));
    
    return NextResponse.json({
      tenant: {
        id: tenant.id,
        subdomain: tenant.subdomain,
        name: tenant.name,
      },
      pages: {
        total: pages.length,
        list: pages,
      },
      requiredPages: {
        expected: requiredSlugs,
        found: foundSlugs,
        missing: missingRequired,
      },
    });
  } catch (error: any) {
    console.error('[Debug Pages] Error:', error);
    return NextResponse.json(
      {
        error: error.message || 'Failed to fetch pages',
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}
