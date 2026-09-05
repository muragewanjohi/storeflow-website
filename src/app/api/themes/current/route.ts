/**
 * Current Tenant Theme API Route
 * 
 * GET: Get the currently active theme for the tenant
 * PUT: Update theme customizations
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireTenant } from '@/lib/tenant-context/server';
import { prisma } from '@/lib/prisma/client';
import { hasCustomCssAccess } from '@/lib/themes/theme-access';
import { sanitizeCustomCss, CustomCssValidationError } from '@/lib/themes/custom-css-sanitizer';

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
      return NextResponse.json({ theme: null, customizations: null });
    }

    // Fetch the theme separately
    const theme = await prisma.themes.findUnique({
      where: { id: tenantTheme.theme_id },
    });

    if (!theme) {
      return NextResponse.json({ theme: null, customizations: null });
    }

    return NextResponse.json({
      theme: theme,
      customizations: {
        custom_colors: tenantTheme.custom_colors,
        custom_fonts: tenantTheme.custom_fonts,
        custom_layouts: tenantTheme.custom_layouts,
        custom_css: tenantTheme.custom_css,
        logo_url: tenantTheme.logo_url,
        favicon_url: tenantTheme.favicon_url,
        meta_title: tenantTheme.meta_title,
        meta_description: tenantTheme.meta_description,
        meta_keywords: tenantTheme.meta_keywords,
        social_links: tenantTheme.social_links,
      },
    });
  } catch (error: any) {
    console.error('Error fetching current theme:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch current theme' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenant = await requireTenant();
    const body = await request.json();

    const tenantTheme = await prisma.tenant_themes.findFirst({
      where: {
        tenant_id: tenant.id,
        is_active: true,
      },
    });

    if (!tenantTheme) {
      return NextResponse.json(
        { error: 'No active theme found. Please install a theme first.' },
        { status: 404 }
      );
    }

    // Theme Track B1.4 — Custom CSS is Pro/Premium-gated and must be
    // sanitized before it's ever persisted (docs/THEME_SYSTEM_PLAN.md:
    // "Real XSS surface — do not ship unsanitized"). Custom JS is
    // deliberately no longer accepted from this endpoint at all — direct,
    // confirmed user decision (arbitrary JS execution on customer-facing
    // pages, incl. real M-Pesa/Pesapal payment flows, isn't a risk worth
    // taking; unlike CSS, "sanitizing" JS doesn't meaningfully reduce that
    // risk since the execution itself is the attack surface). Whatever may
    // already be stored in custom_js is left untouched (harmless, inert —
    // nothing renders it) rather than force-nulled here as an unrelated
    // side effect of this save.
    let sanitizedCustomCss: string | undefined;
    if (typeof body.custom_css === 'string' && body.custom_css.length > 0) {
      const plan = tenant.plan_id
        ? await prisma.price_plans.findUnique({ where: { id: tenant.plan_id }, select: { name: true } })
        : null;

      if (!hasCustomCssAccess(plan?.name)) {
        return NextResponse.json(
          { error: 'Custom CSS is a Pro feature. Upgrade your plan to use it.' },
          { status: 403 }
        );
      }

      try {
        sanitizedCustomCss = sanitizeCustomCss(body.custom_css).css;
      } catch (error) {
        if (error instanceof CustomCssValidationError) {
          return NextResponse.json({ error: error.message }, { status: 400 });
        }
        throw error;
      }
    } else if (body.custom_css === null || body.custom_css === '') {
      // Explicit clear is always allowed, regardless of plan.
      sanitizedCustomCss = '';
    }

    const updated = await prisma.tenant_themes.update({
      where: {
        id: tenantTheme.id,
      },
      data: {
        custom_colors: body.custom_colors ?? tenantTheme.custom_colors,
        custom_fonts: body.custom_fonts ?? tenantTheme.custom_fonts,
        custom_layouts: body.custom_layouts ?? tenantTheme.custom_layouts,
        custom_css: sanitizedCustomCss ?? tenantTheme.custom_css,
        logo_url: body.logo_url ?? tenantTheme.logo_url,
        favicon_url: body.favicon_url ?? tenantTheme.favicon_url,
        meta_title: body.meta_title ?? tenantTheme.meta_title,
        meta_description: body.meta_description ?? tenantTheme.meta_description,
        meta_keywords: body.meta_keywords ?? tenantTheme.meta_keywords,
        social_links: body.social_links ?? tenantTheme.social_links,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ tenant_theme: updated });
  } catch (error: any) {
    console.error('Error updating theme customizations:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update theme customizations' },
      { status: 500 }
    );
  }
}

