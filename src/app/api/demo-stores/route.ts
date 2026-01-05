/**
 * Demo Stores API
 * 
 * Public API for fetching demo stores for showcase
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma/client';
import { isDemoStore } from '@/lib/demo-store/seed-demo-data';

export const dynamic = 'force-dynamic';

/**
 * GET /api/demo-stores
 * Get all active demo stores for showcase
 */
export async function GET(request: NextRequest) {
  try {
    // Fetch all active tenants
    const tenants = await prisma.tenants.findMany({
      where: {
        status: 'active',
      },
      select: {
        id: true,
        name: true,
        subdomain: true,
        custom_domain: true,
        theme_slug: true,
        data: true,
        created_at: true,
      },
      orderBy: {
        created_at: 'desc',
      },
    });

    // Filter to only demo stores
    const demoStores = tenants
      .filter(tenant => isDemoStore(tenant))
      .map(tenant => ({
        id: tenant.id,
        name: tenant.name,
        subdomain: tenant.subdomain,
        custom_domain: tenant.custom_domain,
        theme_slug: tenant.theme_slug,
        url: tenant.custom_domain 
          ? `https://${tenant.custom_domain}`
          : `https://${tenant.subdomain}.dukanest.com`,
        created_at: tenant.created_at,
      }));

    return NextResponse.json({
      demoStores,
      count: demoStores.length,
    });
  } catch (error) {
    console.error('Error fetching demo stores:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch demo stores',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

