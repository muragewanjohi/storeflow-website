import { prisma } from '@/lib/prisma/client';
import { hasCustomCssAccess } from '@/lib/themes/theme-access';
import { sanitizeCustomCss, CustomCssValidationError } from '@/lib/themes/custom-css-sanitizer';

export class TenantThemeAdminError extends Error {
  constructor(
    message: string,
    readonly status: number = 400,
  ) {
    super(message);
    this.name = 'TenantThemeAdminError';
  }
}

export type ListThemesFilters = {
  status?: string | boolean | null;
  isPremium?: string | boolean | null;
  is_premium?: string | boolean | null;
};

export type ThemeCustomizationsInput = {
  custom_colors?: unknown;
  customColors?: unknown;
  custom_fonts?: unknown;
  customFonts?: unknown;
  custom_layouts?: unknown;
  customLayouts?: unknown;
  custom_css?: unknown;
  customCss?: unknown;
  custom_js?: unknown;
  customJs?: unknown;
  logo_url?: unknown;
  logoUrl?: unknown;
  favicon_url?: unknown;
  faviconUrl?: unknown;
  meta_title?: unknown;
  metaTitle?: unknown;
  meta_description?: unknown;
  metaDescription?: unknown;
  meta_keywords?: unknown;
  metaKeywords?: unknown;
  social_links?: unknown;
  socialLinks?: unknown;
};

function parseBooleanFilter(value: string | boolean | null | undefined): boolean | undefined {
  if (value === null || value === undefined || value === '') {
    return undefined;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  return value === 'true';
}

export async function listThemes(filters: ListThemesFilters = {}) {
  const where: {
    status?: boolean;
    is_premium?: boolean;
  } = {};

  const status = parseBooleanFilter(filters.status);
  if (status !== undefined) {
    where.status = status;
  }

  const isPremium = parseBooleanFilter(filters.isPremium ?? filters.is_premium);
  if (isPremium !== undefined) {
    where.is_premium = isPremium;
  }

  const themes = await prisma.themes.findMany({
    where,
    orderBy: {
      created_at: 'desc',
    },
  });

  return themes;
}

export async function getThemeById(id: string) {
  const theme = await prisma.themes.findUnique({
    where: { id },
  });

  if (!theme) {
    throw new TenantThemeAdminError('Theme not found', 404);
  }

  return theme;
}

export async function getCurrentTenantTheme(tenantId: string) {
  const tenantTheme = await prisma.tenant_themes.findFirst({
    where: {
      tenant_id: tenantId,
      is_active: true,
    },
  });

  if (!tenantTheme) {
    return { theme: null, customizations: null };
  }

  const theme = await prisma.themes.findUnique({
    where: { id: tenantTheme.theme_id },
  });

  if (!theme) {
    return { theme: null, customizations: null };
  }

  return {
    theme,
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
  };
}

export async function updateTenantThemeCustomizations(
  tenantId: string,
  body: ThemeCustomizationsInput,
) {
  const tenantTheme = await prisma.tenant_themes.findFirst({
    where: {
      tenant_id: tenantId,
      is_active: true,
    },
  });

  if (!tenantTheme) {
    throw new TenantThemeAdminError('No active theme found. Please install a theme first.', 404);
  }

  const bodyRecord = body as Record<string, unknown>;

  // Theme Track B1.4 — same real gating/sanitization as the web
  // PUT /api/themes/current route applies, mirrored here since this
  // function is the shared save path for the mobile dashboard's
  // /api/v1/mobile/dashboard/themes/current route too. Custom JS is never
  // accepted from either caller — confirmed, dropped-entirely decision.
  const rawCustomCss = bodyRecord.custom_css ?? bodyRecord.customCss;
  let sanitizedCustomCss: string | undefined;
  if (typeof rawCustomCss === 'string' && rawCustomCss.length > 0) {
    const tenant = await prisma.tenants.findUnique({ where: { id: tenantId }, select: { plan_id: true } });
    const plan = tenant?.plan_id
      ? await prisma.price_plans.findUnique({ where: { id: tenant.plan_id }, select: { name: true } })
      : null;

    if (!hasCustomCssAccess(plan?.name)) {
      throw new TenantThemeAdminError('Custom CSS is a Pro feature. Upgrade your plan to use it.', 403);
    }

    try {
      sanitizedCustomCss = sanitizeCustomCss(rawCustomCss).css;
    } catch (error) {
      if (error instanceof CustomCssValidationError) {
        throw new TenantThemeAdminError(error.message, 400);
      }
      throw error;
    }
  } else if (rawCustomCss === null || rawCustomCss === '') {
    sanitizedCustomCss = '';
  }

  const updated = await prisma.tenant_themes.update({
    where: {
      id: tenantTheme.id,
    },
    data: {
      custom_colors: (bodyRecord.custom_colors ?? bodyRecord.customColors ?? tenantTheme.custom_colors) as never,
      custom_fonts: (bodyRecord.custom_fonts ?? bodyRecord.customFonts ?? tenantTheme.custom_fonts) as never,
      custom_layouts:
        (bodyRecord.custom_layouts ?? bodyRecord.customLayouts ?? tenantTheme.custom_layouts) as never,
      custom_css: (sanitizedCustomCss ?? tenantTheme.custom_css) as never,
      logo_url: (bodyRecord.logo_url ?? bodyRecord.logoUrl ?? tenantTheme.logo_url) as string | null | undefined,
      favicon_url: (bodyRecord.favicon_url ?? bodyRecord.faviconUrl ?? tenantTheme.favicon_url) as string | null | undefined,
      meta_title: (bodyRecord.meta_title ?? bodyRecord.metaTitle ?? tenantTheme.meta_title) as string | null | undefined,
      meta_description:
        (bodyRecord.meta_description ?? bodyRecord.metaDescription ?? tenantTheme.meta_description) as string | null | undefined,
      meta_keywords:
        (bodyRecord.meta_keywords ?? bodyRecord.metaKeywords ?? tenantTheme.meta_keywords) as string | null | undefined,
      social_links: (bodyRecord.social_links ?? bodyRecord.socialLinks ?? tenantTheme.social_links) as never,
      updated_at: new Date(),
    },
  });

  return updated;
}

export async function listInstalledThemes(tenantId: string) {
  const tenantThemes = await prisma.tenant_themes.findMany({
    where: {
      tenant_id: tenantId,
    },
    select: {
      theme_id: true,
      is_active: true,
    },
  });

  const installedThemesMap = new Map<string, boolean>();
  tenantThemes.forEach((tt) => {
    installedThemesMap.set(tt.theme_id, tt.is_active === true);
  });

  return Object.fromEntries(installedThemesMap);
}
