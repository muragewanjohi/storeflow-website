/**
 * Installed Themes API Route
 * 
 * GET: Get all themes installed for the current tenant (both active and inactive)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();

    // Get all tenant themes (both active and inactive)
    const tenantThemes = await prisma.tenant_themes.findMany({
      where: {
        tenant_id: tenant.id,
      },
      select: {
        theme_id: true,
        is_active: true,
      },
    });

    // Create a map of theme_id -> is_active
    const installedThemesMap = new Map<string, boolean>();
    tenantThemes.forEach((tt) => {
      installedThemesMap.set(tt.theme_id, tt.is_active === true);
    });

    return NextResponse.json({
      installedThemes: Object.fromEntries(installedThemesMap),
    });
  } catch (error: any) {
    console.error('Error fetching installed themes:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch installed themes' },
      { status: 500 }
    );
  }
}
