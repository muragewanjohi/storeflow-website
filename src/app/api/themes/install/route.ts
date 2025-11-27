/**
 * Theme Installation API Route
 * 
 * POST: Install/activate a theme for the current tenant
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();
    const { theme_id } = body;

    if (!theme_id) {
      return NextResponse.json(
        { error: 'Theme ID is required' },
        { status: 400 }
      );
    }

    // Check if theme exists
    const theme = await prisma.themes.findUnique({
      where: { id: theme_id },
    });

    if (!theme) {
      return NextResponse.json({ error: 'Theme not found' }, { status: 404 });
    }

    // Deactivate all other themes for this tenant
    await prisma.tenant_themes.updateMany({
      where: {
        tenant_id: tenant.id,
        is_active: true,
      },
      data: {
        is_active: false,
      },
    });

    // Check if tenant already has this theme
    const existingTenantTheme = await prisma.tenant_themes.findFirst({
      where: {
        tenant_id: tenant.id,
        theme_id: theme_id,
      },
    });

    if (existingTenantTheme) {
      // Update existing theme to active
      const updated = await prisma.tenant_themes.update({
        where: {
          id: existingTenantTheme.id,
        },
        data: {
          is_active: true,
          updated_at: new Date(),
        },
      });

      return NextResponse.json({ tenant_theme: updated });
    } else {
      // Create new tenant theme
      const tenantTheme = await prisma.tenant_themes.create({
        data: {
          tenant_id: tenant.id,
          theme_id: theme_id,
          is_active: true,
        },
      });

      return NextResponse.json({ tenant_theme: tenantTheme }, { status: 201 });
    }
  } catch (error: any) {
    console.error('Error installing theme:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to install theme' },
      { status: 500 }
    );
  }
}

