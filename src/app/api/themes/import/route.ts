/**
 * Theme Import API Route
 * 
 * POST: Import theme customizations from JSON
 * 
 * Day 36: Advanced theme features - Theme export/import
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { hasCustomCssAccess } from '@/lib/themes/theme-access';
import { sanitizeCustomCss, CustomCssValidationError } from '@/lib/themes/custom-css-sanitizer';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();

    // Validate import data structure
    if (!body.theme || !body.customizations) {
      return NextResponse.json(
        { error: 'Invalid import data. Expected theme and customizations.' },
        { status: 400 }
      );
    }

    // Check if theme exists
    const theme = await prisma.themes.findFirst({
      where: {
        OR: [
          { id: body.theme.id },
          { slug: body.theme.slug },
        ],
      },
    });

    if (!theme) {
      return NextResponse.json(
        { error: 'Theme not found. Please install the theme first.' },
        { status: 404 }
      );
    }

    // Get or create tenant theme
    let tenantTheme = await prisma.tenant_themes.findFirst({
      where: {
        tenant_id: tenant.id,
        theme_id: theme.id,
      },
    });

    if (!tenantTheme) {
      // Create new tenant theme
      tenantTheme = await prisma.tenant_themes.create({
        data: {
          tenant_id: tenant.id,
          theme_id: theme.id,
          is_active: false, // Don't auto-activate on import
        },
      });
    }

    // Theme Track B1.4 — same real gating/sanitization as PUT
    // /api/themes/current applies to hand-typed custom_css, applied here
    // too since an imported JSON file is just as untrusted an input
    // (arguably more so — it can come from anywhere, not just this
    // tenant's own textarea). Custom JS is never persisted, confirmed
    // dropped-entirely decision — see custom-css-sanitizer.ts docblock.
    let sanitizedCustomCss: string | null = null;
    if (typeof body.customizations.custom_css === 'string' && body.customizations.custom_css.length > 0) {
      const plan = tenant.plan_id
        ? await prisma.price_plans.findUnique({ where: { id: tenant.plan_id }, select: { name: true } })
        : null;

      if (!hasCustomCssAccess(plan?.name)) {
        return NextResponse.json(
          { error: 'Custom CSS is a Pro feature. Upgrade your plan to import it.' },
          { status: 403 }
        );
      }

      try {
        sanitizedCustomCss = sanitizeCustomCss(body.customizations.custom_css).css;
      } catch (error) {
        if (error instanceof CustomCssValidationError) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
      }
    }

    // Update with imported customizations
    const updated = await prisma.tenant_themes.update({
      where: {
        id: tenantTheme.id,
      },
      data: {
        custom_colors: body.customizations.custom_colors || {},
        custom_fonts: body.customizations.custom_fonts || {},
        custom_layouts: body.customizations.custom_layouts || {},
        custom_css: sanitizedCustomCss,
        logo_url: body.customizations.logo_url || null,
        favicon_url: body.customizations.favicon_url || null,
        meta_title: body.customizations.meta_title || null,
        meta_description: body.customizations.meta_description || null,
        meta_keywords: body.customizations.meta_keywords || null,
        social_links: body.customizations.social_links || {},
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      message: 'Theme customizations imported successfully',
      tenant_theme: updated,
    });
  } catch (error: any) {
    console.error('Error importing theme:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import theme' },
      { status: 500 }
    );
  }
}

