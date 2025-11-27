/**
 * Theme Export API Route
 * 
 * GET: Export theme customizations as JSON
 * 
 * Day 36: Advanced theme features - Theme export/import
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const tenant = await requireTenant();

    const tenantTheme = await prisma.tenant_themes.findFirst({
      where: {
        tenant_id: tenant.id,
        is_active: true,
      },
    });

    if (!tenantTheme) {
      return NextResponse.json(
        { error: 'No active theme found' },
        { status: 404 }
      );
    }

    // Fetch theme details separately
    const theme = await prisma.themes.findUnique({
      where: { id: tenantTheme.theme_id },
    });

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found' },
        { status: 404 }
      );
    }

    // Export theme customizations
    const exportData = {
      version: '1.0',
      exported_at: new Date().toISOString(),
      theme: {
        id: theme.id,
        title: theme.title,
        slug: theme.slug,
        version: theme.version,
      },
      customizations: {
        custom_colors: tenantTheme.custom_colors,
        custom_fonts: tenantTheme.custom_fonts,
        custom_layouts: tenantTheme.custom_layouts,
        custom_css: tenantTheme.custom_css,
        custom_js: (tenantTheme as any).custom_js,
        logo_url: tenantTheme.logo_url,
        favicon_url: tenantTheme.favicon_url,
        meta_title: tenantTheme.meta_title,
        meta_description: tenantTheme.meta_description,
        meta_keywords: tenantTheme.meta_keywords,
        social_links: tenantTheme.social_links,
      },
    };

    // Return as downloadable JSON file
    return NextResponse.json(exportData, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="theme-export-${theme.slug}-${Date.now()}.json"`,
      },
    });
  } catch (error: any) {
    console.error('Error exporting theme:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export theme' },
      { status: 500 }
    );
  }
}

